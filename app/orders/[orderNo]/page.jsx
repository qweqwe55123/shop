// app/orders/[orderNo]/page.jsx
import Link from "next/link";
import { prisma } from "../../lib/prisma";

export const runtime = "nodejs";

async function getOrder(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      shipMethod: true,
      pickupStore: true,
      subTotal: true,
      shipping: true,
      total: true,
      createdAt: true,
      items: { select: { name: true, price: true, qty: true }, orderBy: { name: "asc" } },
    },
  });
  return order;
}

function statusBadge(status) {
  const map = {
    PENDING: { text: "待付款", color: "#f59e0b", bg: "#fef3c7" },
    PAID:    { text: "已付款", color: "#16a34a", bg: "#dcfce7" },
    FAILED:  { text: "付款失敗", color: "#dc2626", bg: "#fee2e2" },
    REFUND:  { text: "已退款", color: "#0891b2", bg: "#cffafe" },
  };
  const meta = map[status] ?? map.PENDING;
  return (
    <span style={{ display:"inline-block", padding:"4px 8px", borderRadius:8, background:meta.bg, color:meta.color, fontWeight:700, fontSize:13 }}>
      {meta.text}
    </span>
  );
}

export default async function OrderPage({ params }) {
  const orderNo = params.orderNo;
  const order = await getOrder(orderNo);

  if (!order) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>找不到此訂單</h1>
        <Link href="/" style={{ color: "#2563eb" }}>回首頁</Link>
      </main>
    );
  }

  const isPending = order.status === "PENDING";

  return (
    <main style={{ background: "#ffffff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "30px 16px 60px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          訂單{order.status === "PAID" ? "建立成功" : "明細"}
        </h1>

        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:18, boxShadow:"0 6px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", rowGap:8 }}>
            <div>訂單編號： <b>{order.orderNo}</b></div>
            <div>狀態： {statusBadge(order.status)}</div>
            <div>成立時間：{new Date(order.createdAt).toLocaleString()}</div>
            <div>
              配送方式：<b>{order.shipMethod === "CVS_NEWEBPAY" ? "超商取貨（藍新）" : "郵局宅配"}</b>
            </div>
            {order.pickupStore ? <div>取貨門市：{order.pickupStore}</div> : <div />}
          </div>

          <hr style={{ margin:"14px 0", border:0, borderTop:"1px dashed #e5e7eb" }} />

          <h3 style={{ fontSize:16, fontWeight:800 }}>商品明細</h3>
          <ul style={{ listStyle:"none", padding:0, margin:"8px 0 0" }}>
            {order.items.map((it, idx) => (
              <li key={idx} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px dashed #f1f5f9", fontSize:14 }}>
                <span>{it.name} × {it.qty}</span>
                <span>NT$ {it.price * it.qty}</span>
              </li>
            ))}
          </ul>

          <div style={{ height:1, background:"#eee", margin:"10px 0" }} />

          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, color:"#475569" }}>
            <span>商品小計</span>
            <span>NT$ {order.subTotal}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, color:"#475569" }}>
            <span>運費</span>
            <span>NT$ {order.shipping}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:18 }}>
            <span>應付總計</span>
            <span>NT$ {order.total}</span>
          </div>

          {isPending ? (
            <form method="POST" action="/api/pay/newebpay/create" style={{ marginTop: 16 }}>
              <input type="hidden" name="orderNo" value={order.orderNo} />
              <button
                type="submit"
                style={{
                  width:"100%", border:0, borderRadius:12, padding:"12px 18px",
                  fontWeight:900, color:"#fff", background:"linear-gradient(90deg,#ef4444,#fb7185)",
                  boxShadow:"0 10px 18px rgba(244,63,94,0.25)", cursor:"pointer",
                }}
              >
                前往結帳
              </button>
            </form>
          ) : (
            <div style={{ marginTop: 16, display:"flex", gap:10, flexWrap:"wrap" }}>
              <Link href="/" style={ghostBtn}>回首頁</Link>
              <Link href="/orders/lookup" style={ghostBtn}>訂單查詢</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const ghostBtn = {
  display: "inline-block",
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  textDecoration: "none",
  color: "#111",
};
