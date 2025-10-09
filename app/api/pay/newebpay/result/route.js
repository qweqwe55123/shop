// app/api/pay/newebpay/return/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const KEY = process.env.NEWEBPAY_HASH_KEY;
const IV  = process.env.NEWEBPAY_HASH_IV;

function aesDecryptHex(hex) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
  decipher.setAutoPadding(true);
  const decrypted = decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
  return decrypted;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const tradeInfo = form.get("TradeInfo");
    if (!tradeInfo) {
      return NextResponse.redirect(new URL("/", req.url), { status: 303 });
    }
    const infoStr = aesDecryptHex(tradeInfo);
    const info = JSON.parse(infoStr);
    const orderNo = info?.Result?.MerchantOrderNo || "";
    if (!orderNo) {
      return NextResponse.redirect(new URL("/", req.url), { status: 303 });
    }
    return NextResponse.redirect(new URL(`/orders/${orderNo}`, req.url), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/", req.url), { status: 303 });
  }
}
