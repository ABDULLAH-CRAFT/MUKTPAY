import { Module } from '@nestjs/common';
import { SplitController } from './split.controller';
import { SplitService } from './split.service';

@Module({
  controllers: [SplitController],
  providers: [SplitService],
  exports: [SplitService], // Phase 8 (orders) creates real tranches with the same service
})
export class SplitModule {}
