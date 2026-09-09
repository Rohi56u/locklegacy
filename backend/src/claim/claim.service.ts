import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { CreateClaimDto, SubmitEvidenceDto, ReviewClaimDto } from './dto/create-claim.dto';

@Injectable()
export class ClaimService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ai: AiService,
  ) {}

  async createClaim(userId: string, dto: CreateClaimDto) {
    const claim = await this.prisma.claimCase.create({
      data: {
        escalationCaseId: dto.escalationCaseId,
        claimantId: dto.claimantId,
        status: 'INITIATED',
      },
      include: {
        claimant: true,
        escalationCase: true,
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'NOMINEE',
      action: 'CLAIM_CASE_INITIATED',
      resourceType: 'ClaimCase',
      resourceId: claim.id,
      result: 'SUCCESS',
    });

    return claim;
  }

  async getClaim(claimId: string) {
    const claim = await this.prisma.claimCase.findUnique({
      where: { id: claimId },
      include: {
        claimant: true,
        escalationCase: true,
        deathCertificate: true,
        releaseEvents: true,
      },
    });
    if (!claim) throw new NotFoundException('Claim case not found');
    return claim;
  }

  async submitEvidence(claimId: string, actorId: string, dto: SubmitEvidenceDto) {
    const claim = await this.prisma.claimCase.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim case not found');

    // Run bounded AI OCR parsing on the submitted data
    const ocrAnalysis = await this.ai.extractDeathCertificateFields(
      `DeathCert_${claimId}.pdf`,
      dto.certificateNumber,
    );

    const updated = await this.prisma.claimCase.update({
      where: { id: claimId },
      data: {
        status: 'EVIDENCE_SUBMITTED',
        reviewerNotes: `Submitted by claimant. AI Extraction confidence: ${ocrAnalysis.extractedFields[0]?.confidence}. Awaiting human review.`,
      },
    });

    await this.audit.log({
      actorId,
      actorType: 'NOMINEE',
      action: 'CLAIM_EVIDENCE_SUBMITTED',
      resourceType: 'ClaimCase',
      resourceId: claimId,
      result: 'SUCCESS',
      metadata: { ocrAnalysis },
    });

    return {
      claim: updated,
      ocrAnalysis,
    };
  }

  async generateDossier(claimId: string, actorId: string) {
    const claim = await this.prisma.claimCase.findUnique({
      where: { id: claimId },
      include: {
        claimant: true,
        escalationCase: {
          include: {
            user: {
              include: {
                vaultRecords: true,
              },
            },
          },
        },
      },
    });
    if (!claim) throw new NotFoundException('Claim case not found');

    const vaultRecords = claim.escalationCase.user.vaultRecords || [];
    const dossier = await this.ai.compileDossier(
      claim.id,
      {
        name: claim.claimant.name,
        relationship: claim.claimant.relationship || 'Nominee',
        verified: claim.claimant.verificationStatus === 'VERIFIED',
      },
      vaultRecords.map((r) => ({
        category: r.category,
        maskedPreview: r.maskedPreview || undefined,
        tags: r.tags,
      })),
    );

    await this.prisma.claimCase.update({
      where: { id: claimId },
      data: {
        dossierGeneratedAt: new Date(),
      },
    });

    await this.audit.log({
      actorId,
      actorType: 'SYSTEM',
      action: 'CLAIM_DOSSIER_GENERATED',
      resourceType: 'ClaimCase',
      resourceId: claimId,
      result: 'SUCCESS',
    });

    return dossier;
  }

  async reviewClaim(claimId: string, reviewerId: string, dto: ReviewClaimDto) {
    const claim = await this.prisma.claimCase.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim case not found');

    const updated = await this.prisma.claimCase.update({
      where: { id: claimId },
      data: {
        status: dto.status as any,
        reviewerNotes: dto.reviewerNotes,
      },
    });

    await this.audit.log({
      actorId: reviewerId,
      actorType: 'REVIEWER',
      action: `CLAIM_${dto.status}`,
      resourceType: 'ClaimCase',
      resourceId: claimId,
      result: dto.status === 'APPROVED' ? 'SUCCESS' : 'DENIED',
      metadata: { notes: dto.reviewerNotes },
    });

    return updated;
  }
}
