import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/orders/lookup
 * body: { orderNo: string }
 * response: 404 | order(with items)
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderNo = typeof body?.orderNo === "string" ? body.orderNo.trim() : "";

    if (!orderNo) {
      return NextResponse.json({ error: "ORDER_NO_REQUIRED" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (err) {
    console.error("POST /api/orders/lookup error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
