// app/api/pay/newebpay/result/route.js
import { NextResponse } from "next/server";
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
    const TradeInfo = (form.get("TradeInfo") || "").toString();
    const TradeSha  = (form.get("TradeSha")  || "").toString();

    const HashKey = process.env.NEWEBPAY_HASH_KEY || "";
    const HashIV  = process.env.NEWEBPAY_HASH_IV  || "";

    // 驗章
    const localSha = sha256(`HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}`);
    if (localSha !== TradeSha) {
      return NextResponse.redirect(new URL("/?pay=invalid", req.url), { status: 303 });
    }

    // 解密取訂單編號
    const plain = aesDecrypt(TradeInfo, HashKey, HashIV);
    let data; try { data = JSON.parse(plain); } catch { data = Object.fromEntries(new URLSearchParams(plain)); }
    const result  = data.Result || data;
    const orderNo = (result.MerchantOrderNo || result.MerchantIDOrderNo || "").toString();

    if (!orderNo) {
      return NextResponse.redirect(new URL("/?pay=missing", req.url), { status: 303 });
    }

    // 以 303 導回訂單頁（用 GET）
    return NextResponse.redirect(new URL(`/orders/${orderNo}`, req.url), { status: 303 });
  } catch (e) {
    console.error("newebpay/result error:", e);
    return NextResponse.redirect(new URL("/?pay=error", req.url), { status: 303 });
  }
}
