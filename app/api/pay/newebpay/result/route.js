import crypto from "crypto";

export const runtime = "nodejs";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
const aesDecrypt = (hex, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
};

export async function POST(req) {
  try {
    const form = await req.formData();
    const TradeInfo = String(form.get("TradeInfo") || "");
    const TradeSha  = String(form.get("TradeSha")  || "");

    const key = process.env.NEWEBPAY_HASH_KEY || "";
    const iv  = process.env.NEWEBPAY_HASH_IV  || "";

    // 驗章（失敗就回首頁）
    const ok = sha256(`HashKey=${key}&${TradeInfo}&HashIV=${iv}`) === TradeSha;

    let orderNo = "";
    if (ok) {
      const plain = aesDecrypt(TradeInfo, key, iv);
      let data; try { data = JSON.parse(plain); } catch { data = Object.fromEntries(new URLSearchParams(plain)); }
      const r = data.Result || data;
      orderNo = String(r.MerchantOrderNo || r.MerchantIDOrderNo || "");
    }

    const target = orderNo ? `/orders/${orderNo}` : "/?pay=invalid";

    const html = `<!doctype html><meta charset="utf-8"><title>Redirecting…</title>
<script>location.replace(${JSON.stringify(target)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">Continue</a></noscript>`;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const html = `<!doctype html><meta charset="utf-8"><title>Error</title>
<p>回傳解析失敗，<a href="/">回首頁</a></p>`;
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
