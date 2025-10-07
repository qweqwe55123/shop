import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "../../../lib/prisma"; // 根目錄的 lib/prisma.js
import s from "./page.module.css";

export const runtime = "nodejs";

export default async function OrderDonePage({ params }) {
  const { orderNo } = params;

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });

  if (!order) return notFound();

  const currency = (n) => `NT$ ${Number(n || 0)}`;
  const shipLabel = order.shipMethod === "CVS_NEWEBPAY" ? "超商取貨" : "郵局宅配";

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <section className={s.card}>
          <h1 className={s.title}>訂單建立成功</h1>

          <div className={s.info}>
            <div>
              訂單編號：<b>{order.orderNo}</b>
            </div>
            <div>
              狀態：<b>{order.status}</b>
            </div>
            <div>
              配送方式：<b>{shipLabel}</b>
            </div>
            {order.customerAddress ? <div>收件地址：{order.customerAddress}</div> : null}
            {order.pickupStore ? <div>取貨門市：{order.pickupStore}</div> : null}
          </div>

          <h2 className={s.stitle}>商品明細</h2>
          <ul className={s.list}>
            {order.items.map((it) => (
              <li key={it.id} className={s.row}>
                <span className={s.name}>
                  {it.name} × {it.qty}
                </span>
                <span className={s.price}>{currency(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>

          <div className={s.sep} />
          <div className={`${s.row} ${s.sub}`}>
            <span>商品小計</span>
            <span>{currency(order.subTotal)}</span>
          </div>
          <div className={`${s.row} ${s.sub}`}>
            <span>運費</span>
            <span>{currency(order.shipping)}</span>
          </div>
          <div className={`${s.row} ${s.total}`}>
            <span>應付總計</span>
            <span>{currency(order.total)}</span>
          </div>

          <div className={s.actions}>
            {/* 之後串藍新時把 action 換成你的 create API */}
            <form action="/api/pay/newebpay/create" method="POST">
              <input type="hidden" name="orderNo" value={order.orderNo} />
              <button className={s.cta}>前往付款</button>
            </form>
            <Link href="/" className={s.link}>
              回首頁
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
