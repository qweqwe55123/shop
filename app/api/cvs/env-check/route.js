// app/api/cvs/env-check/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 確保每次都從伺服器讀 env

function peek(k) {
  const v = process.env[k];
  return { present: !!v, length: v ? String(v).length : 0 };
}

export async function GET() {
  return Response.json({
    MERCHANT_ID: peek("NEWEBPAY_MERCHANT_ID"),
    HASH_KEY:    peek("NEWEBPAY_HASH_KEY"),
    HASH_IV:     peek("NEWEBPAY_HASH_IV"),
    LOG_UID:     peek("NEWEBPAY_LOGISTICS_UID"),
    LOG_KEY:     peek("NEWEBPAY_LOGISTICS_HASH_KEY"),
    LOG_IV:      peek("NEWEBPAY_LOGISTICS_HASH_IV"),
    CLIENT_BASE: peek("CLIENT_BASE_URL"),
  });
}
