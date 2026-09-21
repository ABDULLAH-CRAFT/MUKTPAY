import { describe, expect, it, vi } from 'vitest';
import { createUpiLauncher } from './launcherCore';
import { readUpiPayment } from './index';

const payment = (() => {
  const r = readUpiPayment('upi://pay?pa=shop@ybl&pn=Shop');
  if (!r.ok) throw new Error('bad fixture');
  return r.value;
})();

const opener = (failFor: (url: string) => boolean = () => false) =>
  vi.fn(async (url: string) => {
    if (failFor(url)) throw new Error('cannot open');
    return true;
  });

describe('Android', () => {
  it('opens one generic upi:// link and lets the OS show the app chooser', async () => {
    const openURL = opener();
    const result = await createUpiLauncher({ os: 'android', openURL })(payment, { amountPaise: 199900 });
    expect(result).toMatchObject({ ok: true, scheme: 'upi' });
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('upi://pay?pa=shop@ybl&pn=Shop&am=1999.00&cu=INR');
  });

  it('ignores an app preference (Linking cannot target a package)', async () => {
    const openURL = opener();
    await createUpiLauncher({ os: 'android', openURL })(payment, { amountPaise: 100, app: 'phonepe' });
    expect(openURL.mock.calls[0][0]).toMatch(/^upi:\/\//);
  });

  it('reports "no UPI app" when nothing can handle the link', async () => {
    const result = await createUpiLauncher({ os: 'android', openURL: opener(() => true) })(payment, { amountPaise: 100 });
    expect(result).toMatchObject({ ok: false, reason: 'NO_UPI_APP' });
  });
});

describe('iOS', () => {
  it('tries the known apps in order until one opens', async () => {
    const openURL = opener((url) => url.startsWith('phonepe://')); // PhonePe not installed
    const result = await createUpiLauncher({ os: 'ios', openURL })(payment, { amountPaise: 100 });
    expect(result).toMatchObject({ ok: true, scheme: 'gpay' });
    expect(openURL.mock.calls.map(([url]) => url.split('://')[0])).toEqual(['phonepe', 'gpay']);
  });

  it('opens only the chosen app when one is requested', async () => {
    const openURL = opener();
    const result = await createUpiLauncher({ os: 'ios', openURL })(payment, { amountPaise: 100, app: 'paytm' });
    expect(result).toMatchObject({ ok: true, scheme: 'paytm' });
    expect(openURL).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly when the chosen app is not installed', async () => {
    const result = await createUpiLauncher({ os: 'ios', openURL: opener(() => true) })(payment, { amountPaise: 100, app: 'gpay' });
    expect(result).toMatchObject({ ok: false, reason: 'NO_UPI_APP' });
  });
});

describe('safety', () => {
  it.each([0, -5, 1.25, 500_000 * 100 + 1])('never opens an app for an invalid amount (%s)', async (amountPaise) => {
    const openURL = opener();
    const result = await createUpiLauncher({ os: 'android', openURL })(payment, { amountPaise });
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_PAYMENT' });
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns the exact URL it opened, for logging and debugging', async () => {
    const result = await createUpiLauncher({ os: 'android', openURL: opener() })(payment, { amountPaise: 100 });
    expect(result.ok && result.url).toBe('upi://pay?pa=shop@ybl&pn=Shop&am=1.00&cu=INR');
  });
});
