import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // 路徑維持你的寫法

export const runtime = "nodejs";

// 可由 .env 覆蓋，沒有就用預設
const HOME_FEE = Number(process.env.HOME_SHIP_FEE ?? 80);      // 郵局宅配
const CVS_FEE  = Number(process.env.CVS_SHIP_FEE ?? 60);        // 超商取貨
const FREE_SHIP_THRESHOLD = Number(process.env.FREE_SHIP ?? 999);

function genOrderNo() {
  const d = new Date();
  const ymd =
    d.getFullYear().toString().slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  // 僅英數/底線，總長 ≤ 20（藍新規範）
  return `HEM_${ymd}_${rand}`.slice(0, 20);
}

export async function POST(req) {
  try {
    const body = await req.json();

    // 1) items 正常化
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ error: "EMPTY_CART" }, { status: 400 });
    }
    const normalized = items.map((it) => ({
      productId: String(it.id),
      name: it.name ?? "商品",
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 1,
      image: it.image ?? null,
    }));

    // 2) 配送（使用者必選，不能自動帶）
    const ship = body?.shipping ?? {};
    const shipMethod = ship?.method; // 必須是 "POST" 或 "CVS_NEWEBPAY"
    if (shipMethod !== "POST" && shipMethod !== "CVS_NEWEBPAY") {
      return NextResponse.json({ error: "SHIP_METHOD_REQUIRED" }, { status: 400 });
    }

    // 金額計算
    const subTotal = normalized.reduce((s, it) => s + it.price * it.qty, 0);
    const rawFee = shipMethod === "CVS_NEWEBPAY" ? CVS_FEE : HOME_FEE;
    const shipping = subTotal >= FREE_SHIP_THRESHOLD ? 0 : rawFee;
    const total = subTotal + shipping;

    // 3) 顧客資料
    const c = body?.customer ?? {};
    const orderNo = genOrderNo();

    // 依配送方式做必填檢查
    if (shipMethod === "POST" && !c.address) {
      return NextResponse.json({ error: "ADDRESS_REQUIRED" }, { status: 400 });
    }
    if (shipMethod === "CVS_NEWEBPAY" && !c.pickupStore) {
      return NextResponse.json({ error: "CVS_STORE_REQUIRED" }, { status: 400 });
    }

    // 4) 建立訂單（保留你的資料結構，僅新增欄位）
    const created = await prisma.order.create({
      data: {
        orderNo,
        customerName:    c.name  ?? null,
        customerPhone:   c.phone ?? null,
        customerEmail:   c.email ?? null,
        customerAddress: c.address ?? null,      // 郵局宅配地址（POST）
        note:            c.note  ?? null,
        pickupStore:     c.pickupStore ?? null,  // 超商門市（CVS_NEWEBPAY）

        subTotal,
        shipping,
        total,

        shipMethod,                               // "POST" | "CVS_NEWEBPAY"
        status: "PENDING",

        items: {
          create: normalized.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            qty: it.qty,
            image: it.image,
          })),
        },
      },
      select: { id: true, orderNo: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/orders error:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(e) },
      { status: 500 }
    );
  }
}
