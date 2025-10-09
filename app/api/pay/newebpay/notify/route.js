// app/api/pay/newebpay/notify/route.js
import crypto from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
const aesDecrypt = (hex, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
};

function htmlRedirect(path, okText = "SUCCESS") {
  const target = path || "/";
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>OK</title>${okText}
<script>location.replace(${JSON.stringify(target)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">Continue</a></noscript>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const TradeInfo = String(form.get("TradeInfo") || "");
    const TradeSha  = String(form.get("TradeSha")  || "");

    const key = process.env.NEWEBPAY_HASH_KEY || "";
    const iv  = process.env.NEWEBPAY_HASH_IV  || "";

    // 驗章
    const isValid = sha256(`HashKey=${key}&${TradeInfo}&HashIV=${iv}`) === TradeSha;

    let orderNo = "";
    if (isValid) {
      const plain = aesDecrypt(TradeInfo, key, iv);
      let data; try { data = JSON.parse(plain); } catch { data = Object.fromEntries(new URLSearchParams(plain)); }
      const r = data.Result || data;

      orderNo = String(r.MerchantOrderNo || r.MerchantIDOrderNo || "");
      const tradeNo = String(r.TradeNo || "");
      const paymentType = String(r.PaymentType || "").toUpperCase();

      // 信用卡成功 → 設為 PAID（ATM/CVS 請維持 PENDING）
      const isCreditPaid = paymentType.startsWith("CREDIT");
      if (orderNo) {
        await prisma.order.update({
          where: { orderNo },
          data: {
            status: isCreditPaid ? "PAID" : "PENDING",
            payProvider: "newebpay",
            payTradeNo: tradeNo,
            paidAt: isCreditPaid ? new Date() : null,
          },
        });
      }
    }

    // 即使使用者被導到這頁，也會自動回訂單頁
    return htmlRedirect(orderNo ? `/orders/${orderNo}` : "/");
  } catch {
    return htmlRedirect("/");
  }
}
