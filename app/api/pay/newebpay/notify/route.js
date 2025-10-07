import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "../../../../../lib/prisma";

export const runtime = "nodejs";

const aesDecrypt = (hex, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
};
const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex").toUpperCase();

export async function POST(req) {
  try {
    const form = await req.formData();
    const Status = (form.get("Status") || "").toString();
    const TradeInfo = (form.get("TradeInfo") || "").toString();
    const TradeSha = (form.get("TradeSha") || "").toString();

    const HashKey = process.env.NEWEBPAY_HASH_KEY || "";
    const HashIV = process.env.NEWEBPAY_HASH_IV || "";

    // 驗章
    const localSha = sha256(`HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}`);
    if (localSha !== TradeSha) {
      console.warn("[NEWEBPAY NOTIFY] invalid sha");
      return NextResponse.json({ Status: "FAILED" }, { status: 400 });
    }

    // 解密資料
    const plain = aesDecrypt(TradeInfo, HashKey, HashIV);
    let info;
    try { info = JSON.parse(plain); } catch { info = Object.fromEntries(new URLSearchParams(plain)); }
    const result = info.Result || info;

    const merchantOrderNo = (result.MerchantOrderNo || result.MerchantIDOrderNo || "").toString();
    const tradeNo = (result.TradeNo || result.GatewayOrderNo || "").toString();
    const amt = Number(result.Amt || 0);

    console.log("[NEWEBPAY NOTIFY]", { Status, merchantOrderNo, tradeNo, amt });

    if (Status === "SUCCESS" && merchantOrderNo) {
      await prisma.order.update({
        where: { orderNo: merchantOrderNo },
        data: { status: "PAID", payProvider: "newebpay", payTradeNo: tradeNo, paidAt: new Date() },
      });
    }

    return NextResponse.json({ Status: "SUCCESS" });
  } catch (e) {
    console.error("newebpay/notify error:", e);
    return NextResponse.json({ Status: "FAILED" }, { status: 500 });
  }
}
