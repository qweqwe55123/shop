// app/api/orders/lookup/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * 超簡易節流（單機記憶體）：
 * 同 IP 5 分鐘最多 20 次；超過則拒絕。
 * 注意：此為單機、部署多節點會分散不一致，但可先擋掉基本濫用。
 */
const bucket = new Map();
const MAX = 20;
const WINDOW_MS = 5 * 60 * 1000;

function throttle(ip) {
  const now = Date.now();
  const arr = bucket.get(ip)?.filter((t) => now - t < WINDOW_MS) || [];
  arr.push(now);
  bucket.set(ip, arr);
  return arr.length <= MAX;
}

function normPhone(s = "") {
  return s.replace(/\D+/g, "");
}

export async function POST(req) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!throttle(ip)) {
      return NextResponse.json(
        { ok: false, message: "查詢過於頻繁，請稍後再試。" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderNo = String(body?.orderNo || "").trim();
    const contact = String(body?.contact || "").trim();

    if (!orderNo || !contact) {
      return NextResponse.json({ ok: false, message: "缺少必要欄位。" }, { status: 400 });
    }

    // 先找訂單（僅用 orderNo）
    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        orderNo: true,
        customerEmail: true,
        customerPhone: true,
        createdAt: true,
        status: true,
        shipMethod: true,
        pickupStore: true,
        subTotal: true,
        shipping: true,
        total: true,
        items: { select: { name: true, price: true, qty: true } },
      },
    });

    if (!order) {
      // 統一回應，避免洩漏訂單是否存在
      return NextResponse.json({ ok: false, message: "查無資料，請確認輸入是否正確。" }, { status: 404 });
    }

    // 驗證第二條件：Email or Phone（支援任一）
    const isEmail = contact.includes("@");
    let pass = false;
    if (isEmail) {
      pass = (order.customerEmail || "").toLowerCase().trim() === contact.toLowerCase().trim();
    } else {
      pass = normPhone(order.customerPhone || "") === normPhone(contact);
    }

    if (!pass) {
      // 同樣給統一訊息
      return NextResponse.json({ ok: false, message: "查無資料，請確認輸入是否正確。" }, { status: 403 });
    }

    // 成功：回摘要
    const summary = {
      orderNo: order.orderNo,
      status: order.status,
      shipMethod: order.shipMethod,
      pickupStore: order.pickupStore,
      subTotal: order.subTotal,
      shipping: order.shipping,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.slice(0, 5), // 最多回 5 筆（避免過多資料）
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("POST /api/orders/lookup error:", e);
    return NextResponse.json({ ok: false, message: "伺服器錯誤。" }, { status: 500 });
  }
}
