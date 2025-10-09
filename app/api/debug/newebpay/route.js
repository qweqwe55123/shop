// app/api/debug/newebpay/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pick = (k) => (process.env[k] == null ? "" : String(process.env[k]).trim());

export async function GET() {
  const LOG_UID = pick("NEWEBPAY_LOGISTICS_UID");
  const LOG_KEY = pick("NEWEBPAY_LOGISTICS_HASH_KEY");
  const LOG_IV  = pick("NEWEBPAY_LOGISTICS_HASH_IV");

  const PAY_MER = pick("NEWEBPAY_MERCHANT_ID");
  const PAY_KEY = pick("NEWEBPAY_HASH_KEY");
  const PAY_IV  = pick("NEWEBPAY_HASH_IV");

  const which =
    LOG_UID && LOG_KEY && LOG_IV ? "logistics" :
    PAY_MER && PAY_KEY && PAY_IV ? "payment"   :
    "none";

  const mask = (s, keep = 4) =>
    s ? `${s.slice(0, keep)}***(${s.length})` : "";

  const data = {
    using: which,
    logistics: {
      UID_present: !!LOG_UID, UID_preview: mask(LOG_UID),
      KEY_present: !!LOG_KEY, KEY_len: LOG_KEY.length,
      IV_present : !!LOG_IV , IV_len : LOG_IV.length,
    },
    payment: {
      MERCHANT_present: !!PAY_MER, MERCHANT_preview: mask(PAY_MER),
      KEY_present     : !!PAY_KEY, KEY_len: PAY_KEY.length,
      IV_present      : !!PAY_IV , IV_len : PAY_IV.length,
    }
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
