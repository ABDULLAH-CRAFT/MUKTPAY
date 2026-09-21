/**
 * UPI handle (the part after "@") → the app and bank behind it. Purely informational,
 * shown as "PhonePe · Yes Bank". An unknown handle is NOT an error: new handles appear often.
 * (Table adapted from the original SplitPe validator.)
 */
const REGISTRY: Record<string, { app: string; bank: string }> = {
  // Google Pay
  okhdfcbank: { app: 'Google Pay', bank: 'HDFC Bank' },
  okicici: { app: 'Google Pay', bank: 'ICICI Bank' },
  oksbi: { app: 'Google Pay', bank: 'State Bank of India' },
  okaxis: { app: 'Google Pay', bank: 'Axis Bank' },
  // PhonePe
  ybl: { app: 'PhonePe', bank: 'Yes Bank' },
  ibl: { app: 'PhonePe', bank: 'ICICI Bank' },
  axl: { app: 'PhonePe', bank: 'Axis Bank' },
  // Paytm
  paytm: { app: 'Paytm', bank: 'Paytm Payments Bank' },
  ptyes: { app: 'Paytm', bank: 'Yes Bank' },
  ptsbi: { app: 'Paytm', bank: 'State Bank of India' },
  ptaxis: { app: 'Paytm', bank: 'Axis Bank' },
  pthdfc: { app: 'Paytm', bank: 'HDFC Bank' },
  // BHIM / NPCI
  upi: { app: 'BHIM', bank: 'NPCI' },
  // Amazon Pay
  apl: { app: 'Amazon Pay', bank: 'Axis Bank' },
  yapl: { app: 'Amazon Pay', bank: 'Yes Bank' },
  rapl: { app: 'Amazon Pay', bank: 'RBL Bank' },
  // WhatsApp Pay
  waaxis: { app: 'WhatsApp Pay', bank: 'Axis Bank' },
  wahdfcbank: { app: 'WhatsApp Pay', bank: 'HDFC Bank' },
  waicici: { app: 'WhatsApp Pay', bank: 'ICICI Bank' },
  wasbi: { app: 'WhatsApp Pay', bank: 'State Bank of India' },
  // Apps, neobanks, wallets
  cred: { app: 'CRED', bank: 'Axis Bank' },
  naviaxis: { app: 'Navi', bank: 'Axis Bank' },
  jupiteraxis: { app: 'Jupiter', bank: 'Axis Bank' },
  slice: { app: 'Slice', bank: 'Axis Bank' },
  freecharge: { app: 'Freecharge', bank: 'Axis Bank' },
  airtel: { app: 'Airtel Payments Bank', bank: 'Airtel' },
  ikwik: { app: 'MobiKwik', bank: 'HDFC Bank' },
  // Banks
  sbi: { app: 'SBI Pay', bank: 'State Bank of India' },
  icici: { app: 'iMobile', bank: 'ICICI Bank' },
  hdfcbank: { app: 'HDFC Bank Mobile', bank: 'HDFC Bank' },
  axisbank: { app: 'Axis Mobile', bank: 'Axis Bank' },
  kotak: { app: 'Kotak 811', bank: 'Kotak Mahindra Bank' },
  yesbank: { app: 'Yes Bank', bank: 'Yes Bank' },
  pnb: { app: 'PNB One', bank: 'Punjab National Bank' },
  unionbank: { app: 'Union Bank', bank: 'Union Bank of India' },
  cnrb: { app: 'Canara ai1', bank: 'Canara Bank' },
  barodampay: { app: 'BOB World', bank: 'Bank of Baroda' },
  idfcbank: { app: 'IDFC FIRST', bank: 'IDFC FIRST Bank' },
  indus: { app: 'IndusMobile', bank: 'IndusInd Bank' },
  fbl: { app: 'FedMobile', bank: 'Federal Bank' },
  aubank: { app: 'AU 0101', bank: 'AU Small Finance Bank' },
  rbl: { app: 'MoBank', bank: 'RBL Bank' },
  citi: { app: 'Citi Mobile', bank: 'Citibank' },
  hsbc: { app: 'HSBC India', bank: 'HSBC Bank' },
  scb: { app: 'SC Mobile', bank: 'Standard Chartered' },
  bandhan: { app: 'Bandhan Bank', bank: 'Bandhan Bank' },
  dbs: { app: 'digibank', bank: 'DBS Bank' },
};

export function lookupIssuer(handle: string): { app: string; bank: string } | null {
  return REGISTRY[handle.toLowerCase()] ?? null;
}
