import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ReleaseService } from './release.service';
import { ApproveReleaseDto, ApproveReleaseSchema, ExecuteReleaseDto, ExecuteReleaseSchema } from './dto/release.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/releases')
export class ReleaseController {
  constructor(private release: ReleaseService) {}

  @Post(':claimId/approve')
  @UseGuards(JwtAuthGuard)
  async approve(
    @Param('claimId') claimId: string,
    @CurrentUser('id') reviewerId: string,
    @Body(new ZodValidationPipe(ApproveReleaseSchema)) dto: ApproveReleaseDto,
  ) {
    return this.release.approveRelease(claimId, reviewerId, dto);
  }

  @Post(':claimId/execute')
  @UseGuards(JwtAuthGuard)
  async execute(
    @Param('claimId') claimId: string,
    @CurrentUser('id') executorId: string,
    @Body(new ZodValidationPipe(ExecuteReleaseSchema)) dto: ExecuteReleaseDto,
  ) {
    return this.release.executeRelease(claimId, executorId, dto);
  }

  @Get('download/:token')
  async download(@Param('token') token: string) {
    return this.release.verifyAndDownload(token);
  }
}
