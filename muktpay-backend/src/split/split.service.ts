import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SplitPreviewDto } from './dto/split-preview.dto';
import type { SplitPlan, SplitRules } from './interfaces/split.interfaces';
import { assertValidRules, DEFAULT_SPLIT_RULES, planSplit, SplitError } from './split.engine';

export interface SplitPreview extends SplitPlan {
  /** Plain-language heads-ups for the user. Never blocks the split. */
  warnings: string[];
}

@Injectable()
export class SplitService {
  private readonly defaults: SplitRules;

  constructor(config: ConfigService) {
    const num = (key: string, fallback: number) => Number(config.get(key, fallback));
    this.defaults = {
      ...DEFAULT_SPLIT_RULES,
      maxTranchePaise: num('SPLIT_MAX_TRANCHE_PAISE', DEFAULT_SPLIT_RULES.maxTranchePaise),
      minTranchePaise: num('SPLIT_MIN_TRANCHE_PAISE', DEFAULT_SPLIT_RULES.minTranchePaise),
      maxTranches: num('SPLIT_MAX_TRANCHES', DEFAULT_SPLIT_RULES.maxTranches),
    };
    assertValidRules(this.defaults); // a bad .env should stop the server at boot, not corrupt a payment
  }

  /** Rules for a request: server defaults, optionally tightened (never loosened) by the caller. */
  rulesFor(dto: Pick<SplitPreviewDto, 'maxTranchePaise' | 'strategy'>): SplitRules {
    const requested = dto.maxTranchePaise ?? this.defaults.maxTranchePaise;
    return {
      ...this.defaults,
      maxTranchePaise: Math.min(requested, this.defaults.maxTranchePaise),
      strategy: dto.strategy ?? this.defaults.strategy,
    };
  }

  /** Same function Phase 8 will call when it creates a real order, so preview and order can't disagree. */
  plan(totalPaise: number, rules: SplitRules): SplitPlan {
    try {
      return planSplit(totalPaise, rules);
    } catch (error) {
      if (error instanceof SplitError) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: error.code, message: error.message });
      }
      throw error;
    }
  }

  preview(dto: SplitPreviewDto): SplitPreview {
    const plan = this.plan(dto.totalPaise, this.rulesFor(dto));
    return { ...plan, warnings: this.warningsFor(plan) };
  }

  private warningsFor(plan: SplitPlan): string[] {
    const warnings: string[] = [];
    if (plan.trancheCount > 1) {
      warnings.push(
        `This needs ${plan.trancheCount} separate UPI payments. Each one asks for your UPI PIN, and some banks limit how many UPI payments you can make per day.`,
      );
    }
    if (plan.totalPaise > 1_00_000_00) {
      warnings.push('Many banks limit UPI to ₹1,00,000 per day. Check your own limit before starting.');
    }
    return warnings;
  }
}
