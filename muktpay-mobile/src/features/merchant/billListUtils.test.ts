import { describe, expect, it } from 'vitest';
import { createBill } from './billFactory';
import { DEFAULT_SPLIT_RULES, planSplit } from './splitEngine';
import { BILL_LIST_VERSION, capBillList, parseBillList, serializeBillList } from './billListUtils';

const plan = (totalPaise: number) => {
  const result = planSplit(totalPaise, DEFAULT_SPLIT_RULES);
  if (!result.ok) throw new Error(result.message);
  return result.value;
};

const billAt = (isoTime: string, ref: string) =>
  createBill(
    { shopName: 'Gupta Kirana Store', vpa: 'guptakirana@okhdfcbank', plan: plan(1500_00), capPaise: 1999_00 },
    new Date(isoTime),
    ref,
  );

describe('capBillList', () => {
  it('sorts newest first', () => {
    const early = billAt('2026-01-01T00:00:00.000Z', 'MPEARLY1');
    const late = billAt('2026-06-01T00:00:00.000Z', 'MPLATE01');
    expect(capBillList([early, late]).map((b) => b.ref)).toEqual(['MPLATE01', 'MPEARLY1']);
  });

  it('caps at the given limit, keeping the most recent', () => {
    const bills = Array.from({ length: 5 }, (_, i) => billAt(`2026-01-0${i + 1}T00:00:00.000Z`, `MPBILL00${i}`));
    const capped = capBillList(bills, 2);
    expect(capped.map((b) => b.ref)).toEqual(['MPBILL004', 'MPBILL003']);
  });

  it('does not mutate the array it was given', () => {
    const bills = [billAt('2026-01-02T00:00:00.000Z', 'MPB'), billAt('2026-01-01T00:00:00.000Z', 'MPA')];
    const original = [...bills];
    capBillList(bills);
    expect(bills).toEqual(original);
  });
});

describe('serializeBillList / parseBillList', () => {
  it('round-trips a list of bills', () => {
    const bills = [billAt('2026-01-01T00:00:00.000Z', 'MPONE0001')];
    expect(parseBillList(serializeBillList(bills))).toEqual(bills);
  });

  it('returns an empty list for null (nothing saved yet)', () => {
    expect(parseBillList(null)).toEqual([]);
  });

  it('returns an empty list for corrupt JSON rather than throwing', () => {
    expect(parseBillList('{not json')).toEqual([]);
  });

  it('returns an empty list for a mismatched schema version', () => {
    const wrongVersion = JSON.stringify({ version: BILL_LIST_VERSION + 1, bills: [billAt('2026-01-01T00:00:00.000Z', 'MPX')] });
    expect(parseBillList(wrongVersion)).toEqual([]);
  });

  it('drops entries that are not shaped like a Bill instead of failing the whole list', () => {
    const good = billAt('2026-01-01T00:00:00.000Z', 'MPGOOD001');
    const raw = JSON.stringify({ version: BILL_LIST_VERSION, bills: [good, { garbage: true }, null, 'nope'] });
    expect(parseBillList(raw)).toEqual([good]);
  });
});
