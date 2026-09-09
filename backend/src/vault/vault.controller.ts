import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VaultService } from './vault.service';
import { SetupVaultDto, SetupVaultSchema } from './dto/setup-vault.dto';
import { CreateRecordDto, CreateRecordSchema } from './dto/create-record.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/vault')
@UseGuards(JwtAuthGuard)
export class VaultController {
  constructor(private vault: VaultService) {}

  @Post('setup')
  async setup(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(SetupVaultSchema)) dto: SetupVaultDto,
  ) {
    return this.vault.setupVault(userId, dto);
  }

  @Post('unlock')
  async unlock(@CurrentUser('id') userId: string) {
    return this.vault.getVaultKeyMaterial(userId);
  }

  @Post('records')
  async createRecord(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(CreateRecordSchema)) dto: CreateRecordDto,
  ) {
    return this.vault.createRecord(userId, dto);
  }

  @Get('records')
  async listRecords(@CurrentUser('id') userId: string) {
    return this.vault.getRecords(userId);
  }

  @Get('records/:id')
  async getRecord(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vault.getRecord(userId, id);
  }

  @Put('records/:id')
  async updateRecord(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateRecordSchema.partial())) dto: Partial<CreateRecordDto>,
  ) {
    return this.vault.updateRecord(userId, id, dto);
  }

  @Delete('records/:id')
  async deleteRecord(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vault.deleteRecord(userId, id);
  }
}
