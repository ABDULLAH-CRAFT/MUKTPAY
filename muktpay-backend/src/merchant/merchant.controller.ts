import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpsertMerchantProfileDto } from './dto/upsert-merchant-profile.dto';
import { MerchantService } from './merchant.service';

@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchant: MerchantService) {}

  /** 404 when the merchant hasn't set up their shop yet — the app treats that as "show onboarding". */
  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.merchant.getOrThrow(user.id);
  }

  @Put('profile')
  upsertProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertMerchantProfileDto) {
    return this.merchant.upsert(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('profile')
  async removeProfile(@CurrentUser() user: AuthUser): Promise<void> {
    await this.merchant.remove(user.id);
  }
}
