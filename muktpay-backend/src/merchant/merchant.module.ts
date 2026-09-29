import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantController } from './merchant.controller';
import { MerchantProfile } from './merchant-profile.entity';
import { MerchantService } from './merchant.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantProfile])],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService], // BillsModule reads the profile a bill is built from
})
export class MerchantModule {}
