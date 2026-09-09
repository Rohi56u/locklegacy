import { Controller, Get, Put, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CheckInService } from './checkin.service';
import { UpdatePolicyDto, UpdatePolicySchema } from './dto/update-policy.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/checkin')
@UseGuards(JwtAuthGuard)
export class CheckInController {
  constructor(private checkin: CheckInService) {}

  @Get('policy')
  async getPolicy(@CurrentUser('id') userId: string) {
    return this.checkin.getPolicy(userId);
  }

  @Put('policy')
  async updatePolicy(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(UpdatePolicySchema)) dto: UpdatePolicyDto,
  ) {
    return this.checkin.updatePolicy(userId, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser('id') userId: string,
    @Body() body: { channel?: string; deviceMetadata?: Record<string, unknown> },
  ) {
    return this.checkin.confirmCheckIn(userId, body.channel || 'web', body.deviceMetadata);
  }

  @Get('history')
  async history(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.checkin.getHistory(userId, Number(page) || 1, Number(limit) || 20);
  }

  @Post('pause')
  @HttpCode(HttpStatus.OK)
  async pause(@CurrentUser('id') userId: string) {
    return this.checkin.pauseCheckIns(userId);
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resume(@CurrentUser('id') userId: string) {
    return this.checkin.resumeCheckIns(userId);
  }
}
