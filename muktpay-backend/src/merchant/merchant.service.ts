import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertMerchantProfileDto } from './dto/upsert-merchant-profile.dto';
import { MerchantProfile } from './merchant-profile.entity';

@Injectable()
export class MerchantService {
  constructor(@InjectRepository(MerchantProfile) private readonly profiles: Repository<MerchantProfile>) {}

  findByUserId(userId: string): Promise<MerchantProfile | null> {
    return this.profiles.findOneBy({ userId });
  }

  /** Used by BillService: a bill can't be created for a merchant with no shop details yet. */
  async getOrThrow(userId: string): Promise<MerchantProfile> {
    const profile = await this.findByUserId(userId);
    if (!profile) throw new NotFoundException('Set up your shop details before creating a bill.');
    return profile;
  }

  async upsert(userId: string, dto: UpsertMerchantProfileDto): Promise<MerchantProfile> {
    const vpa = dto.vpa.trim().toLowerCase();
    const shopName = dto.shopName.trim();
    const issuerLabel = dto.issuerLabel ?? null;

    const existing = await this.findByUserId(userId);
    if (existing) {
      existing.shopName = shopName;
      existing.vpa = vpa;
      existing.issuerLabel = issuerLabel;
      return this.profiles.save(existing);
    }

    try {
      return await this.profiles.save(this.profiles.create({ userId, shopName, vpa, issuerLabel, verification: 'format' }));
    } catch (error) {
      // Two requests creating a profile for the same brand-new user at once: the unique index
      // on user_id rejects the loser, which just needs to re-read (and will now get the winner).
      if (this.isUniqueViolation(error)) return this.getOrThrow(userId);
      throw error;
    }
  }

  async remove(userId: string): Promise<void> {
    await this.profiles.delete({ userId });
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
  }
}
