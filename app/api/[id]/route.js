import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // ← 路徑：從 app/api/orders/[id] 到 lib/prisma

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    const id = params?.id; // 這裡的 id 其實是 orderNo
    if (!id) {
      return NextResponse.json({ error: "NO_ID" }, { status: 400 });
    }

    const order =
      (await prisma.order.findUnique({
        where: { orderNo: id },
        include: { items: true },
      })) || null;

    if (!order) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (e) {
    console.error("GET /api/orders/[id] error:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(e) },
      { status: 500 }
    );
  }
}
