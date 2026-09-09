import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SetupVaultDto } from './dto/setup-vault.dto';
import { CreateRecordDto } from './dto/create-record.dto';

@Injectable()
export class VaultService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async setupVault(userId: string, dto: SetupVaultDto) {
    const existing = await this.prisma.vaultKey.findFirst({ where: { userId } });
    if (existing) {
      throw new ForbiddenException('Vault already initialized');
    }

    const vaultKey = await this.prisma.vaultKey.create({
      data: { userId, ...dto },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'VAULT_SETUP',
      resourceType: 'VaultKey',
      resourceId: vaultKey.id,
      result: 'SUCCESS',
    });

    return { id: vaultKey.id, message: 'Vault initialized successfully' };
  }

  async getVaultKeyMaterial(userId: string) {
    const key = await this.prisma.vaultKey.findFirst({ where: { userId } });
    if (!key) throw new NotFoundException('Vault not initialized');

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'VAULT_UNLOCK_REQUEST',
      resourceType: 'VaultKey',
      resourceId: key.id,
      result: 'SUCCESS',
    });

    return {
      wrappedDek: key.wrappedDek,
      dekIv: key.dekIv,
      passphraseSalt: key.passphraseSalt,
      kdfIterations: key.kdfIterations,
      recoveryWrappedDek: key.recoveryWrappedDek,
      recoveryDekIv: key.recoveryDekIv,
      recoverySalt: key.recoverySalt,
    };
  }

  async createRecord(userId: string, dto: CreateRecordDto) {
    const record = await this.prisma.vaultRecord.create({
      data: { userId, ...dto },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'RECORD_CREATED',
      resourceType: 'VaultRecord',
      resourceId: record.id,
      result: 'SUCCESS',
    });

    return record;
  }

  async getRecords(userId: string) {
    const records = await this.prisma.vaultRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'VAULT_RECORDS_LISTED',
      result: 'SUCCESS',
    });

    return records;
  }

  async getRecord(userId: string, recordId: string) {
    const record = await this.prisma.vaultRecord.findFirst({
      where: { id: recordId, userId },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async updateRecord(userId: string, recordId: string, dto: Partial<CreateRecordDto>) {
    const record = await this.prisma.vaultRecord.findFirst({
      where: { id: recordId, userId },
    });
    if (!record) throw new NotFoundException('Record not found');

    const updated = await this.prisma.vaultRecord.update({
      where: { id: recordId },
      data: { ...dto, lastReviewedAt: new Date() },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'RECORD_UPDATED',
      resourceType: 'VaultRecord',
      resourceId: recordId,
      result: 'SUCCESS',
    });

    return updated;
  }

  async deleteRecord(userId: string, recordId: string) {
    const record = await this.prisma.vaultRecord.findFirst({
      where: { id: recordId, userId },
    });
    if (!record) throw new NotFoundException('Record not found');

    await this.prisma.vaultRecord.delete({ where: { id: recordId } });

    await this.audit.log({
      actorId: userId,
      actorType: 'USER',
      action: 'RECORD_DELETED',
      resourceType: 'VaultRecord',
      resourceId: recordId,
      result: 'SUCCESS',
    });

    return { message: 'Record deleted' };
  }
}
