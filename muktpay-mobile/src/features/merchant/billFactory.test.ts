import { describe, expect, it } from 'vitest';
import { nextPendingChunk, paidPaise, isSettled } from '@/types/bill';
import { buildMerchantUpiUrl, chunkNote, createBill, makeBillRef, setChunkStatus } from './billFactory';
import { DEFAULT_SPLIT_RULES, planSplit } from './splitEngine';

const plan = (totalPaise: number) => {
  const result = planSplit(totalPaise, DEFAULT_SPLIT_RULES);
  if (!result.ok) throw new Error(result.message);
  return result.value;
};

const NOW = new Date('2026-03-01T10:00:00.000Z');

const bill = (totalPaise = 4500_00) =>
  createBill(
    { shopName: 'Gupta Kirana Store', vpa: 'guptakirana@okhdfcbank', plan: plan(totalPaise), capPaise: 1999_00 },
    NOW,
    'MPTESTAB',
  );

describe('buildMerchantUpiUrl', () => {
  it('builds a UPI link with the payee, name, amount and currency', () => {
    const url = buildMerchantUpiUrl({
      vpa: 'guptakirana@okhdfcbank',
      shopName: 'Gupta Kirana Store',
      amountPaise: 1999_00,
      note: 'MPTESTAB 1/3',
    });
    expect(url).toBe('upi://pay?pa=guptakirana@okhdfcbank&pn=Gupta%20Kirana%20Store&am=1999.00&cu=INR&tn=MPTESTAB%201%2F3');
  });

  it('always sends two decimal places', () => {
    const url = buildMerchantUpiUrl({ vpa: 'a@b', shopName: 'S', amountPaise: 502_00, note: '' });
    expect(url).toContain('am=502.00');
  });

  it('never sets tr — a shared transaction reference gets chunks rejected as duplicates', () => {
    expect(bill().chunks.every((c) => !c.upiUrl.includes('tr='))).toBe(true);
  });
});

describe('chunkNote', () => {
  it('shares the reference but not the position', () => {
    expect(chunkNote('MPTESTAB', 2, 3)).toBe('MPTESTAB 2/3');
  });
});

describe('makeBillRef', () => {
  it('is uppercase alphanumeric and URL-safe', () => {
    expect(makeBillRef(NOW, () => 0)).toMatch(/^MP[A-Z0-9]+$/);
  });

  it('differs for the same instant when the random part differs', () => {
    expect(makeBillRef(NOW, () => 0)).not.toBe(makeBillRef(NOW, () => 0.99));
  });
});

describe('createBill', () => {
  it('makes one chunk per payment, all pending', () => {
    const b = bill();
    expect(b.chunks).toHaveLength(3);
    expect(b.chunks.map((c) => c.amountPaise)).toEqual([1999_00, 1999_00, 502_00]);
    expect(b.chunks.every((c) => c.status === 'pending' && c.paidAt === null)).toBe(true);
  });

  it('gives every chunk the same reference and its own position', () => {
    const notes = bill().chunks.map((c) => decodeURIComponent(c.upiUrl.split('tn=')[1]));
    expect(notes).toEqual(['MPTESTAB 1/3', 'MPTESTAB 2/3', 'MPTESTAB 3/3']);
  });

  it('snapshots the merchant details onto the bill', () => {
    const b = bill();
    expect(b.shopName).toBe('Gupta Kirana Store');
    expect(b.vpa).toBe('guptakirana@okhdfcbank');
    expect(b.capPaise).toBe(1999_00);
  });

  it('chunk amounts add up to the total', () => {
    for (const total of [1500_00, 4500_00, 6800_00, 12345_67]) {
      const b = bill(total);
      expect(b.chunks.reduce((sum, c) => sum + c.amountPaise, 0)).toBe(total);
    }
  });
});

describe('marking chunks', () => {
  it('flips one chunk and leaves the rest alone', () => {
    const marked = setChunkStatus(bill(), 1, 'paid', NOW);
    expect(marked.chunks[0].status).toBe('paid');
    expect(marked.chunks[0].paidAt).toBe(NOW.toISOString());
    expect(marked.chunks[1].status).toBe('pending');
  });

  it('does not mutate the bill it was given', () => {
    const original = bill();
    setChunkStatus(original, 1, 'paid', NOW);
    expect(original.chunks[0].status).toBe('pending');
  });

  it('clears paidAt when a chunk is un-marked', () => {
    const marked = setChunkStatus(bill(), 1, 'paid', NOW);
    expect(setChunkStatus(marked, 1, 'pending', NOW).chunks[0].paidAt).toBeNull();
  });
});

describe('bill helpers', () => {
  it('tracks the running total and the next code to show', () => {
    let b = bill();
    expect(paidPaise(b)).toBe(0);
    expect(nextPendingChunk(b)?.index).toBe(1);

    b = setChunkStatus(b, 1, 'paid', NOW);
    expect(paidPaise(b)).toBe(1999_00);
    expect(nextPendingChunk(b)?.index).toBe(2);
    expect(isSettled(b)).toBe(false);

    b = setChunkStatus(b, 2, 'paid', NOW);
    b = setChunkStatus(b, 3, 'paid', NOW);
    expect(paidPaise(b)).toBe(4500_00);
    expect(nextPendingChunk(b)).toBeNull();
    expect(isSettled(b)).toBe(true);
  });
});
