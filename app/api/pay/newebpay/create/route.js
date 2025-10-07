import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const MPG_URL = process.env.NEWEBPAY_MPG_URL || "https://ccore.newebpay.com/MPG/mpg_gateway";

const toQuery = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

const aesEncrypt = (data, key, iv) => {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
};
const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex").toUpperCase();

export async function POST(req) {
  try {
    // 支援 form 或 JSON
    const form = await req.formData().catch(async () => {
      const body = await req.json();
      const fd = new FormData();
      Object.entries(body || {}).forEach(([k, v]) => fd.append(k, v));
      return fd;
    });
    const orderNo = (form.get("orderNo") || "").toString().trim();
    if (!orderNo) return NextResponse.json({ error: "ORDER_NO_REQUIRED" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    if (order.status === "PAID") {
      return NextResponse.redirect(new URL(`/orders/${orderNo}`, req.url));
    }

    const MerchantID = process.env.NEWEBPAY_MERCHANT_ID || "";
    const HashKey = process.env.NEWEBPAY_HASH_KEY || "";
    const HashIV = process.env.NEWEBPAY_HASH_IV || "";
    if (!MerchantID || HashKey.length !== 32 || HashIV.length !== 16) {
      return NextResponse.json({ error: "NEWEBPAY_ENV_MISSING" }, { status: 500 });
    }

    const notifyBase = process.env.NEWEBPAY_NOTIFY_BASE_URL || new URL(req.url).origin;
    const clientBase = process.env.CLIENT_BASE_URL || new URL(req.url).origin;

    const MerchantOrderNo = order.orderNo.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 20);
    const TimeStamp = Math.floor(Date.now() / 1000);
    const Amt = order.total;
    const ItemDesc = "真空磁吸手機架";
    const Email = order.customerEmail || "test@example.com";

    const ReturnURL = `${notifyBase}/api/pay/newebpay/notify`; // 背景通知
    const NotifyURL = ReturnURL;                                 // 同一路徑即可
    const ClientBackURL = `${clientBase}/orders/${order.orderNo}`;

    const trade = {
      MerchantID,
      RespondType: "JSON",
      TimeStamp,
      Version: "2.0",
      MerchantOrderNo,
      Amt,
      ItemDesc,
      Email,
      LoginType: 0,
      TradeLimit: 600,
      ReturnURL,
      NotifyURL,
      ClientBackURL,
      CREDIT: 1,           // 啟用信用卡
      // VACC: 1,          // 要測 ATM 再打開
      // CVS: 1,           // 要測超商代碼再打開
    };

    const plain = toQuery(trade);
    const TradeInfo = aesEncrypt(plain, HashKey, HashIV);
    const TradeSha = sha256(`HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}`);

    console.log("[NEWEBPAY CREATE]", { ReturnURL, ClientBackURL, MerchantOrderNo, Amt });

    // 自動送出表單
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Redirecting…</title></head>
<body onload="document.forms[0].submit()">
  <form method="post" action="${MPG_URL}">
    <input type="hidden" name="MerchantID" value="${MerchantID}" />
    <input type="hidden" name="TradeInfo" value="${TradeInfo}" />
    <input type="hidden" name="TradeSha" value="${TradeSha}" />
    <input type="hidden" name="Version" value="2.0" />
    <noscript><button type="submit">前往付款</button></noscript>
  </form>
</body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    console.error("newebpay/create error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
