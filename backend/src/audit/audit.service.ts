import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActorType, AuditResult } from '@prisma/client';

interface AuditLogInput {
  actorId: string;
  actorType: keyof typeof ActorType;
  action: string;
  resourceType?: string;
  resourceId?: string;
  scope?: string;
  result: keyof typeof AuditResult;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditEvent.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType as ActorType,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        scope: input.scope,
        result: input.result as AuditResult,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: (input.metadata as any) || undefined,
      },
    });
  }

  async getLogsForUser(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { actorId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditEvent.count({ where: { actorId: userId } }),
    ]);
    return { events, total, page, limit };
  }
}
