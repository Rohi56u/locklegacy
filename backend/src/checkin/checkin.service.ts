import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CheckInService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getPolicy(userId: string) {
    let policy = await this.prisma.checkInPolicy.findUnique({ where: { userId } });
    if (!policy) {
      policy = await this.prisma.checkInPolicy.create({
        data: {
          userId,
          frequencyDays: 30,
          gracePeriodDays: 7,
          nextCheckInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
    return policy;
  }

  async updatePolicy(userId: string, dto: UpdatePolicyDto) {
    const policy = await this.prisma.checkInPolicy.upsert({
      where: { userId },
      update: {
        ...dto,
        nextCheckInDate: new Date(Date.now() + dto.frequencyDays * 24 * 60 * 60 * 1000),
      },
      create: {
        userId,
        ...dto,
        nextCheckInDate: new Date(Date.now() + dto.frequencyDays * 24 * 60 * 60 * 1000),
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'CHECKIN_POLICY_UPDATED',
      resourceType: 'CheckInPolicy',
      resourceId: policy.id,
      result: 'SUCCESS',
    });

    return policy;
  }

  async confirmCheckIn(userId: string, channel: string, deviceMetadata?: Record<string, unknown>) {
    const idempotencyKey = `checkin_${userId}_${new Date().toISOString().slice(0, 10)}_${uuidv4().slice(0, 8)}`;

    const event = await this.prisma.checkInEvent.create({
      data: {
        userId,
        eventType: 'CHECK_IN',
        channel,
        deviceMetadata: (deviceMetadata as any) || undefined,
        idempotencyKey,
      },
    });

    // Reset next check-in date
    const policy = await this.prisma.checkInPolicy.findUnique({ where: { userId } });
    if (policy) {
      await this.prisma.checkInPolicy.update({
        where: { userId },
        data: {
          nextCheckInDate: new Date(Date.now() + policy.frequencyDays * 24 * 60 * 60 * 1000),
        },
      });
    }

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'CHECK_IN_CONFIRMED',
      resourceType: 'CheckInEvent',
      resourceId: event.id,
      result: 'SUCCESS',
      metadata: { channel },
    });

    return { event, nextCheckInDate: policy ? new Date(Date.now() + policy.frequencyDays * 24 * 60 * 60 * 1000) : null };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.checkInEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.checkInEvent.count({ where: { userId } }),
    ]);
    return { events, total, page, limit };
  }

  async pauseCheckIns(userId: string) {
    const idempotencyKey = `pause_${userId}_${Date.now()}`;
    const event = await this.prisma.checkInEvent.create({
      data: {
        userId,
        eventType: 'PAUSE',
        idempotencyKey,
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'CHECKIN_PAUSED',
      result: 'SUCCESS',
    });

    return event;
  }

  async resumeCheckIns(userId: string) {
    const idempotencyKey = `resume_${userId}_${Date.now()}`;
    const event = await this.prisma.checkInEvent.create({
      data: {
        userId,
        eventType: 'RESUME',
        idempotencyKey,
      },
    });

    const policy = await this.prisma.checkInPolicy.findUnique({ where: { userId } });
    if (policy) {
      await this.prisma.checkInPolicy.update({
        where: { userId },
        data: {
          nextCheckInDate: new Date(Date.now() + policy.frequencyDays * 24 * 60 * 60 * 1000),
        },
      });
    }

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'CHECKIN_RESUMED',
      result: 'SUCCESS',
    });

    return event;
  }
}
