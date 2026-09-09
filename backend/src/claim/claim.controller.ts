import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { CreateClaimDto, CreateClaimSchema, SubmitEvidenceDto, SubmitEvidenceSchema, ReviewClaimDto, ReviewClaimSchema } from './dto/create-claim.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/claims')
@UseGuards(JwtAuthGuard)
export class ClaimController {
  constructor(private claim: ClaimService) {}

  @Post()
  async createClaim(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(CreateClaimSchema)) dto: CreateClaimDto,
  ) {
    return this.claim.createClaim(userId, dto);
  }

  @Get(':id')
  async getClaim(@Param('id') id: string) {
    return this.claim.getClaim(id);
  }

  @Post(':id/evidence')
  async submitEvidence(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Body(new ZodValidationPipe(SubmitEvidenceSchema)) dto: SubmitEvidenceDto,
  ) {
    return this.claim.submitEvidence(id, actorId, dto);
  }

  @Post(':id/dossier')
  async generateDossier(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.claim.generateDossier(id, actorId);
  }

  @Post(':id/review')
  async reviewClaim(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body(new ZodValidationPipe(ReviewClaimSchema)) dto: ReviewClaimDto,
  ) {
    return this.claim.reviewClaim(id, reviewerId, dto);
  }
}
