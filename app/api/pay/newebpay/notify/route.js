// app/api/pay/newebpay/notify/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MID  = process.env.NEWEBPAY_MERCHANT_ID;
const KEY  = process.env.NEWEBPAY_HASH_KEY;
const IV   = process.env.NEWEBPAY_HASH_IV;

function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}
function aesDecryptHex(hex) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    KEY,
    IV
  );
  decipher.setAutoPadding(true);
  const decrypted =
    decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
  return decrypted;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const tradeInfo = form.get("TradeInfo");
    const tradeSha  = form.get("TradeSha");
    const merchant  = form.get("MerchantID");

    if (!tradeInfo || !tradeSha || merchant !== MID) {
      return NextResponse.json({ Status: "ERROR", Message: "PARAM_MISSING" });
    }

    // 驗證 SHA
    const check = sha256Upper(`HashKey=${KEY}&${tradeInfo}&HashIV=${IV}`);
    if (check !== tradeSha) {
      return NextResponse.json({ Status: "ERROR", Message: "SHA_MISMATCH" });
    }

    // 解析交易資訊
    const infoStr = aesDecryptHex(tradeInfo);
    const info = JSON.parse(infoStr); // { Status, Message, Result: {...} }

    const status = info.Status; // "SUCCESS"/"FAILED"
    const r = info.Result || {};
    const orderNo = r.MerchantOrderNo;

    if (!orderNo) {
      return NextResponse.json({ Status: "ERROR", Message: "NO_ORDER_NO" });
    }

    if (status === "SUCCESS") {
      await prisma.order.update({
        where: { orderNo },
        data: { status: "PAID" },
      });
    } else {
      await prisma.order.update({
        where: { orderNo },
        data: { status: "FAILED" },
      });
    }

    // 藍新只需 200 OK，你回個 JSON 也可
    return NextResponse.json({ Status: "SUCCESS" });
  } catch (e) {
    console.error("NEWEBPAY NOTIFY ERROR:", e);
    return NextResponse.json({ Status: "ERROR", Message: String(e) }, { status: 500 });
  }
}
