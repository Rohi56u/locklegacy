import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  channel: 'email' | 'sms' | 'push';
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private config: ConfigService) {}

  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId: string; timestamp: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[Notification Dispatch] Channel: ${payload.channel.toUpperCase()} | To: ${payload.to} | Subject: "${payload.subject}" | MessageId: ${messageId}`);
    return {
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
    };
  }

  async sendCheckInReminder(email: string, name: string, daysRemaining: number, checkInUrl: string) {
    return this.send({
      to: email,
      subject: `LegacyLock: Scheduled check-in reminder (${daysRemaining} days remaining)`,
      body: `Hello ${name},\n\nThis is your scheduled LegacyLock continuity check-in. Please confirm your status by visiting:\n${checkInUrl}\n\nIf you do not respond before the deadline, your configured safety escalation sequence will begin.`,
      channel: 'email',
    });
  }

  async sendNomineeInvitation(email: string, nomineeName: string, ownerName: string, inviteUrl: string) {
    return this.send({
      to: email,
      subject: `${ownerName} has invited you to their LegacyLock continuity plan`,
      body: `Hello ${nomineeName},\n\n${ownerName} has designated you as a trusted contact in their LegacyLock continuity plan.\n\nTo review this invitation and verify your contact details, please visit:\n${inviteUrl}\n\nNotice: LegacyLock will never ask you for passwords, OTPs, or financial account details.`,
      channel: 'email',
    });
  }

  async sendEscalationAlert(email: string, ownerName: string, stage: string, instructions: string) {
    return this.send({
      to: email,
      subject: `[ALERT] LegacyLock Escalation Protocol Active for ${ownerName}`,
      body: `Notice: Continuity check-ins for ${ownerName} were not confirmed. Protocol stage: ${stage}.\n\n${instructions}`,
      channel: 'email',
    });
  }
}
