import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateNomineeDto } from './dto/create-nominee.dto';
import * as crypto from 'crypto';

@Injectable()
export class NomineeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateNomineeDto) {
    const nominee = await this.prisma.trustedPerson.create({
      data: { userId, ...dto },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'NOMINEE_ADDED',
      resourceType: 'TrustedPerson',
      resourceId: nominee.id,
      result: 'SUCCESS',
    });

    return nominee;
  }

  async list(userId: string) {
    return this.prisma.trustedPerson.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, nomineeId: string) {
    const nominee = await this.prisma.trustedPerson.findFirst({
      where: { id: nomineeId, userId },
    });
    if (!nominee) throw new NotFoundException('Trusted person not found');
    return nominee;
  }

  async update(userId: string, nomineeId: string, dto: Partial<CreateNomineeDto>) {
    const nominee = await this.prisma.trustedPerson.findFirst({
      where: { id: nomineeId, userId },
    });
    if (!nominee) throw new NotFoundException('Trusted person not found');

    const updated = await this.prisma.trustedPerson.update({
      where: { id: nomineeId },
      data: dto,
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'NOMINEE_UPDATED',
      resourceType: 'TrustedPerson',
      resourceId: nomineeId,
      result: 'SUCCESS',
    });

    return updated;
  }

  async remove(userId: string, nomineeId: string) {
    const nominee = await this.prisma.trustedPerson.findFirst({
      where: { id: nomineeId, userId },
    });
    if (!nominee) throw new NotFoundException('Trusted person not found');

    await this.prisma.trustedPerson.delete({ where: { id: nomineeId } });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'NOMINEE_REMOVED',
      resourceType: 'TrustedPerson',
      resourceId: nomineeId,
      result: 'SUCCESS',
    });

    return { message: 'Trusted person removed' };
  }

  async sendInvitation(userId: string, nomineeId: string) {
    const nominee = await this.prisma.trustedPerson.findFirst({
      where: { id: nomineeId, userId },
    });
    if (!nominee) throw new NotFoundException('Trusted person not found');

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.trustedPerson.update({
      where: { id: nomineeId },
      data: {
        invitationTokenHash: tokenHash,
        invitationSentAt: new Date(),
        verificationStatus: 'INVITED',
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'NOMINEE_INVITATION_SENT',
      resourceType: 'TrustedPerson',
      resourceId: nomineeId,
      result: 'SUCCESS',
    });

    // TODO: Send actual email/SMS via notification service
    return { message: 'Invitation sent', invitationToken: token };
  }
}
