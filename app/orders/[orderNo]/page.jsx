// app/orders/[orderNo]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function fmt(n) {
  return new Intl.NumberFormat("zh-TW").format(n || 0);
}
function statusText(s) {
  switch (s) {
    case "PAID":
      return "已付款";
    case "FAILED":
      return "付款失敗";
    case "REFUND":
      return "已退款";
    default:
      return "待付款";
  }
}

export default async function OrderPage({ params }) {
  const orderNo = decodeURIComponent(params.orderNo || "");
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111827",
        fontFamily:
          'Noto Sans TC, "Microsoft JhengHei", "PingFang TC", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "28px 14px 60px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              color: "#111827",
            }}
          >
            訂單建立成功
          </h1>

          <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7 }}>
            <div>
              <b>訂單編號：</b> {order.orderNo}
            </div>
            <div>
              <b>狀態：</b> {statusText(order.status)}
            </div>
            <div>
              <b>配送方式：</b>{" "}
              {order.shipMethod === "CVS_NEWEBPAY" ? "超商取貨" : "郵局宅配"}
            </div>
            {order.pickupStore ? (
              <div>
                <b>取貨門市：</b> {order.pickupStore}
              </div>
            ) : null}
            {order.customerAddress ? (
              <div>
                <b>寄送地址：</b> {order.customerAddress}
              </div>
            ) : null}
          </div>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            商品明細
          </h2>

          <div
            style={{
              borderTop: "1px dashed rgba(0,0,0,0.12)",
            }}
          >
            {order.items.map((it) => {
              const line = (it.price || 0) * (it.qty || 0);
              return (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px dashed rgba(0,0,0,0.08)",
                    fontSize: 14,
                  }}
                >
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span style={{ fontWeight: 800 }}>NT$ {fmt(line)}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                color: "#374151",
              }}
            >
              <span>商品小計</span>
              <span>NT$ {fmt(order.subTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                color: "#374151",
              }}
            >
              <span>運費</span>
              <span>NT$ {fmt(order.shipping)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                fontWeight: 900,
                color: "#111827",
                fontSize: 18,
              }}
            >
              <span>應付總計</span>
              <span>NT$ {fmt(order.total)}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            {/* 若你仍需前往結帳按鈕，可依需求保留或隱藏 */}
            {/* <Link href={`/pay/${order.orderNo}`} className="btn">前往結帳</Link> */}
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                textDecoration: "none",
                color: "#111827",
                background: "#fff",
              }}
            >
              回首頁
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
