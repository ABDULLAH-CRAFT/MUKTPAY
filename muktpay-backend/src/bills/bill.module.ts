import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantModule } from '../merchant/merchant.module';
import { SplitModule } from '../split/split.module';
import { BillChunk } from './bill-chunk.entity';
import { BillEvent } from './bill-event.entity';
import { BillController } from './bill.controller';
import { Bill } from './bill.entity';
import { BillService } from './bill.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, BillChunk, BillEvent]), MerchantModule, SplitModule],
  controllers: [BillController],
  providers: [BillService],
})
export class BillsModule {}