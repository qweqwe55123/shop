import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "../../../../../lib/prisma";

export const runtime = "nodejs";

// ── NewebPay MPG（Sandbox 預設）──
const MPG_URL = process.env.NEWEBPAY_MPG_URL || "https://ccore.newebpay.com/MPG/mpg_gateway";

// 小工具
const toQuery = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

const aesEncrypt = (data, key, iv) => {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
};
const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex").toUpperCase();

const isHttpsPortless = (u) => {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (!url.port || url.port === "443");
  } catch { return false; }
};

export async function POST(req) {
  try {
    // 支援 <form> 與 JSON 兩種呼叫
    const form = await req.formData().catch(async () => {
      const body = await req.json();
      const fd = new FormData();
      Object.entries(body || {}).forEach(([k, v]) => fd.append(k, v));
      return fd;
    });
    const orderNo = (form.get("orderNo") || "").toString().trim();
    if (!orderNo) return NextResponse.json({ error: "ORDER_NO_REQUIRED" }, { status: 400 });

    // 取訂單
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    if (order.status === "PAID") {
      return NextResponse.redirect(new URL(`/orders/${orderNo}`, req.url));
    }

    // ── 環境變數檢查 ──
    const MerchantID = process.env.NEWEBPAY_MERCHANT_ID || "";
    const HashKey = process.env.NEWEBPAY_HASH_KEY || "";
    const HashIV = process.env.NEWEBPAY_HASH_IV || "";
    if (!MerchantID || HashKey.length !== 32 || HashIV.length !== 16) {
      return NextResponse.json({ error: "NEWEBPAY_ENV_MISSING" }, { status: 500 });
    }

    // 分離 base：通知（外網 https/443）與使用者返回（可本機）
    const notifyBase = process.env.NEWEBPAY_NOTIFY_BASE_URL || process.env.BASE_URL || new URL(req.url).origin;
    const clientBase = process.env.CLIENT_BASE_URL || process.env.BASE_URL || new URL(req.url).origin;

    // 藍新會檢查 Notify/Return URL 不能帶非 80/443 的 port
    if (!isHttpsPortless(`${notifyBase}`)) {
      // 能跳轉但收不到 notify；至少避免送出被擋
      console.warn("Notify base is not https:443, notify will fail:", notifyBase);
    }

    // ── 參數（MPG v2.0）──
    const TimeStamp = Math.floor(Date.now() / 1000);
    const Amt = order.total;
    const ItemDesc = "真空磁吸手機架";
    const Email = order.customerEmail || "test@example.com";

    // 清洗成藍新允許的訂單編號（保底）
    const MerchantOrderNo = order.orderNo.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 20);

    const ReturnURL = `${notifyBase}/api/pay/newebpay/notify`; // 背景通知
    const NotifyURL = ReturnURL; // 有些文件兩個名詞，實務同一路
    const ClientBackURL = `${clientBase}/orders/${order.orderNo}`; // 使用者返回

    // 可選：指定開哪些付款方式（不指定也行，預設信用卡）
    const paymentOpts = {
      CREDIT: 1, // 信用卡
      // VACC: 1,  // ATM 虛擬帳號（要就打開）
      // CVS: 1,   // 超商代碼
    };

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
      ...paymentOpts,
    };

    const tradeInfoPlain = toQuery(trade);
    const TradeInfo = aesEncrypt(tradeInfoPlain, HashKey, HashIV);
    const TradeSha = sha256(`HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}`);

    // 方便你在 Terminal 看到實際送去哪
    console.log("[NEWEBPAY CREATE]", { ReturnURL, ClientBackURL, MerchantOrderNo, Amt });

    // 自動送出的 HTML 表單
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
