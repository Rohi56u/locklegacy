import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { NotificationModule } from './notification/notification.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { CheckInModule } from './checkin/checkin.module';
import { NomineeModule } from './nominee/nominee.module';
import { ClaimModule } from './claim/claim.module';
import { ReleaseModule } from './release/release.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    NotificationModule,
    AiModule,
    AuthModule,
    VaultModule,
    CheckInModule,
    NomineeModule,
    ClaimModule,
    ReleaseModule,
  ],
})
export class AppModule {}

