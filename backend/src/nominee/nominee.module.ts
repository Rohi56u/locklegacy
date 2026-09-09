import { Module } from '@nestjs/common';
import { NomineeController } from './nominee.controller';
import { NomineeService } from './nominee.service';

@Module({
  controllers: [NomineeController],
  providers: [NomineeService],
  exports: [NomineeService],
})
export class NomineeModule {}
