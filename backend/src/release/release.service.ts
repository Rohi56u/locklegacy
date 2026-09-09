import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApproveReleaseDto, ExecuteReleaseDto } from './dto/release.dto';
import * as crypto from 'crypto';

@Injectable()
export class ReleaseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async approveRelease(claimCaseId: string, reviewerId: string, dto: ApproveReleaseDto) {
    const claim = await this.prisma.claimCase.findUnique({
      where: { id: claimCaseId },
      include: { releaseEvents: true },
    });
    if (!claim) throw new NotFoundException('Claim case not found');
    if (claim.status !== 'APPROVED' && claim.status !== 'UNDER_REVIEW') {
      throw new ForbiddenException('Claim must be in APPROVED or UNDER_REVIEW status to approve release');
    }

    let releaseEvent = claim.releaseEvents[0];
    if (!releaseEvent) {
      releaseEvent = await this.prisma.releaseEvent.create({
        data: {
          claimCaseId,
          scope: dto.scope,
          approvedBy: [reviewerId],
        },
      });
    } else {
      const approvers = new Set(releaseEvent.approvedBy);
      approvers.add(reviewerId);
      releaseEvent = await this.prisma.releaseEvent.update({
        where: { id: releaseEvent.id },
        data: {
          approvedBy: Array.from(approvers),
          scope: dto.scope,
        },
      });
    }

    await this.audit.log({
      actorId: reviewerId,
      actorType: 'REVIEWER',
      action: 'RELEASE_APPROVAL_GRANTED',
      resourceType: 'ReleaseEvent',
      resourceId: releaseEvent.id,
      result: 'SUCCESS',
      metadata: { approversCount: releaseEvent.approvedBy.length },
    });

    return {
      releaseEventId: releaseEvent.id,
      approvalsCount: releaseEvent.approvedBy.length,
      readyForExecution: releaseEvent.approvedBy.length >= 1,
    };
  }

  async executeRelease(claimCaseId: string, executorId: string, dto: ExecuteReleaseDto) {
    const claim = await this.prisma.claimCase.findUnique({
      where: { id: claimCaseId },
      include: { releaseEvents: true },
    });
    if (!claim) throw new NotFoundException('Claim case not found');

    const releaseEvent = claim.releaseEvents[0];
    if (!releaseEvent || releaseEvent.approvedBy.length < 1) {
      throw new ForbiddenException('Release has not received required approvals');
    }

    // Generate secure expiring watermarked download token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + dto.expiryHours * 3600 * 1000);
    const watermarkId = dto.watermarkId || `WM-${Date.now().toString(36).toUpperCase()}-${rawToken.slice(0, 4).toUpperCase()}`;

    const updated = await this.prisma.releaseEvent.update({
      where: { id: releaseEvent.id },
      data: {
        downloadTokenHash: tokenHash,
        downloadExpiresAt: expiresAt,
        downloadLimit: dto.downloadLimit,
        downloadsUsed: 0,
        watermarkId,
      },
    });

    await this.prisma.claimCase.update({
      where: { id: claimCaseId },
      data: { status: 'PARTIALLY_RELEASED' },
    });

    await this.audit.log({
      actorId: executorId,
      actorType: 'REVIEWER',
      action: 'CONTROLLED_RELEASE_EXECUTED',
      resourceType: 'ReleaseEvent',
      resourceId: updated.id,
      result: 'SUCCESS',
      metadata: { watermarkId, expiresAt, downloadLimit: dto.downloadLimit },
    });

    return {
      message: 'Controlled release executed successfully.',
      downloadToken: rawToken,
      watermarkId,
      expiresAt,
      downloadLimit: dto.downloadLimit,
    };
  }

  async verifyAndDownload(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const releaseEvent = await this.prisma.releaseEvent.findFirst({
      where: { downloadTokenHash: tokenHash },
      include: {
        claimCase: {
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
        },
      },
    });

    if (!releaseEvent) throw new NotFoundException('Invalid download token');
    if (releaseEvent.downloadExpiresAt && new Date() > releaseEvent.downloadExpiresAt) {
      throw new ForbiddenException('Download token has expired');
    }
    if (releaseEvent.downloadsUsed >= releaseEvent.downloadLimit) {
      throw new ForbiddenException('Maximum download attempts exceeded');
    }

    // Increment download count
    await this.prisma.releaseEvent.update({
      where: { id: releaseEvent.id },
      data: { downloadsUsed: releaseEvent.downloadsUsed + 1 },
    });

    return {
      watermark: releaseEvent.watermarkId,
      scope: releaseEvent.scope,
      remainingDownloads: releaseEvent.downloadLimit - (releaseEvent.downloadsUsed + 1),
      expiresAt: releaseEvent.downloadExpiresAt,
      claimant: releaseEvent.claimCase.claimant.name,
      recordsCount: releaseEvent.claimCase.escalationCase.user.vaultRecords.length,
      notice: 'CONFIDENTIAL: Scoped post-continuity release packet. Watermarked and audited.',
    };
  }
}
