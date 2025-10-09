// app/api/pay/newebpay/result/route.js
import crypto from "crypto";

export const runtime = "nodejs";

// 產生一個只負責導頁的 HTML
function redirectHTML(path) {
  const safe = path || "/";
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Redirecting…</title>
<script>location.replace(${JSON.stringify(safe)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${safe}"><a href="${safe}">Continue</a></noscript>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
const aesDecrypt = (hex, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
};

// 以防萬一：如果藍新用 GET 打（少見），也能導回（支援 ?orderNo=）
export async function GET(req) {
  const url = new URL(req.url);
  const orderNo = url.searchParams.get("orderNo");
  return redirectHTML(orderNo ? `/orders/${orderNo}` : "/");
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const TradeInfo = String(form.get("TradeInfo") || "");
    const TradeSha  = String(form.get("TradeSha")  || "");

    const key = process.env.NEWEBPAY_HASH_KEY || "";
    const iv  = process.env.NEWEBPAY_HASH_IV  || "";

    // 驗章
    const ok = sha256(`HashKey=${key}&${TradeInfo}&HashIV=${iv}`) === TradeSha;

    let orderNo = "";
    if (ok) {
      const plain = aesDecrypt(TradeInfo, key, iv);
      let data; try { data = JSON.parse(plain); } catch { data = Object.fromEntries(new URLSearchParams(plain)); }
      const r = data.Result || data;
      orderNo = String(r.MerchantOrderNo || r.MerchantIDOrderNo || "");
    }

    return redirectHTML(orderNo ? `/orders/${orderNo}` : "/?pay=invalid");
  } catch {
    return redirectHTML("/?pay=error");
  }
}
