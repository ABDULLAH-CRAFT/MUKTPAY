import { buildMerchantUpiUrl, chunkNote, makeBillRef } from './upi.util';

describe('makeBillRef', () => {
  it('starts with MP, is uppercase, and has no ambiguous characters', () => {
    const ref = makeBillRef(new Date('2026-01-01T00:00:00.000Z'), () => 0.5);
    expect(ref).toMatch(/^MP[A-Z0-9]+$/);
    expect(ref).not.toMatch(/[IO01]/);
  });

  it('is deterministic for the same clock and randomness', () => {
    const now = new Date('2026-06-15T12:30:00.000Z');
    expect(makeBillRef(now, () => 0.1)).toBe(makeBillRef(now, () => 0.1));
  });
});

describe('buildMerchantUpiUrl', () => {
  it('builds a plain P2P collect link with pa, pn, am, cu and tn', () => {
    const url = buildMerchantUpiUrl({
      vpa: 'guptakirana@okhdfcbank',
      shopName: 'Gupta Kirana Store',
      amountPaise: 199900,
      note: chunkNote('MP7X2K9A', 1, 3),
    });
    expect(url).toBe('upi://pay?pa=guptakirana@okhdfcbank&pn=Gupta%20Kirana%20Store&am=1999.00&cu=INR&tn=MP7X2K9A%201%2F3');
  });

  it('never sets tr, sign or mc — those belong to aggregator-issued QRs, not this one', () => {
    const url = buildMerchantUpiUrl({ vpa: 'a@b', shopName: 'Shop', amountPaise: 100, note: 'x' });
    expect(url).not.toMatch(/[?&](tr|sign|mc)=/);
  });

  it('strips invisible/spoofing characters from the shop name', () => {
    const url = buildMerchantUpiUrl({ vpa: 'a@b', shopName: 'Evil\u202Ehop', amountPaise: 100, note: 'x' });
    expect(decodeURIComponent(url.match(/pn=([^&]+)/)![1])).toBe('Evilhop');
  });
});
