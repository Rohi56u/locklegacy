import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { NomineeService } from './nominee.service';
import { CreateNomineeDto, CreateNomineeSchema } from './dto/create-nominee.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/nominees')
@UseGuards(JwtAuthGuard)
export class NomineeController {
  constructor(private nominee: NomineeService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(CreateNomineeSchema)) dto: CreateNomineeDto,
  ) {
    return this.nominee.create(userId, dto);
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.nominee.list(userId);
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.nominee.get(userId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateNomineeSchema.partial())) dto: Partial<CreateNomineeDto>,
  ) {
    return this.nominee.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.nominee.remove(userId, id);
  }

  @Post(':id/invite')
  async invite(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.nominee.sendInvitation(userId, id);
  }
}
