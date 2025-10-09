"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 結帳頁（深藍底、美觀卡片版；使用 localStorage.cart 讀取購物車）
 * 只做最小修改：加入「配送方式」單選、依選項顯示 地址/門市，送出 payload 對齊 /api/orders
 */
export default function CheckoutPage() {
  const router = useRouter();

  // 從 localStorage 取購物車
  const [items, setItems] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const data = raw ? JSON.parse(raw) : { items: [] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    }
  }, []);

  // 金額
  const subTotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + (Number(it.price ?? it.unitPrice) || 0) * (Number(it.qty) || 1),
        0
      ),
    [items]
  );

  // 和 API 預設一致：宅配80、超商60、滿999免運
  const HOME_FEE = 80;
  const CVS_FEE = 60;
  const FREE_SHIP_THRESHOLD = 999;

  // 表單
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    sameAsBuyer: true,
    rName: "",
    rPhone: "",
    rEmail: "",
    // 🆕 配送方式與對應欄位
    shipMethod: "", // "POST" | "CVS_NEWEBPAY"
    address: "", // POST 用
    pickupStore: "", // CVS_NEWEBPAY 用
    note: "",
  });

  useEffect(() => {
    if (form.sameAsBuyer) {
      setForm((f) => ({
        ...f,
        rName: f.name,
        rPhone: f.phone,
        rEmail: f.email,
      }));
    }
  }, [form.sameAsBuyer, form.name, form.phone, form.email]);

  // 運費顯示（依選項）
  const shipFee = useMemo(() => {
    if (!items.length) return 0;
    const fee = form.shipMethod === "CVS_NEWEBPAY" ? CVS_FEE : HOME_FEE;
    return subTotal >= FREE_SHIP_THRESHOLD ? 0 : fee;
  }, [items.length, subTotal, form.shipMethod]);

  const total = subTotal + shipFee;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // 送出
  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!items.length) return setErr("購物車是空的。");
    if (!form.name || !form.phone || !form.email) return setErr("請填購買人姓名 / 手機 / Email。");
    if (!form.rName || !form.rPhone) return setErr("請填收件人姓名 / 手機。");

    // ✅ 必須讓客戶自己選配送方式
    if (form.shipMethod !== "POST" && form.shipMethod !== "CVS_NEWEBPAY") {
      return setErr("請選擇配送方式（郵局宅配或超商取貨）。");
    }
    if (form.shipMethod === "POST" && !form.address) {
      return setErr("請填寫收件地址。");
    }
    if (form.shipMethod === "CVS_NEWEBPAY" && !form.pickupStore) {
      return setErr("請輸入或選擇取貨門市。");
    }

    try {
      setLoading(true);

      // 將購物車品項轉成 API 需要的格式
      const payloadItems = items.map((it) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price ?? it.unitPrice) || 0,
        qty: Number(it.qty) || 1,
        image: it.image ?? null,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          customer: {
            name: form.rName,
            phone: form.rPhone,
            email: form.rEmail || null,
            note: form.note || null,
            // 依配送方式擇一帶入
            address: form.shipMethod === "POST" ? form.address : undefined,
            pickupStore: form.shipMethod === "CVS_NEWEBPAY" ? form.pickupStore : undefined,
          },
          // ！！！！必填：method（和後端一致）
          shipping: { method: form.shipMethod },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.message || data?.error || `建立失敗（${res.status}）`);
        return;
      }

      // 清空 localStorage 購物車（你若有全域 CartProvider 再改這裡）
      localStorage.setItem("cart", JSON.stringify({ items: [] }));

      const { orderNo } = data;
      router.push(`/orders/${orderNo}`);
    } catch (e2) {
      setErr(String(e2?.message ?? e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="wrap">
        {/* 左：表單 */}
        <form onSubmit={submit} className="card">
          <Section title="購買人資訊">
            <div className="grid2">
              <Field label="姓名" req>
                <input name="name" value={form.name} onChange={onChange} className="input" />
              </Field>
              <Field label="手機" req>
                <input name="phone" value={form.phone} onChange={onChange} className="input" />
              </Field>
              <Field label="電子郵件" req full>
                <input name="email" value={form.email} onChange={onChange} className="input" />
              </Field>
            </div>
          </Section>

          <Section title="收件人資訊">
            <label className="check">
              <input
                type="checkbox"
                checked={form.sameAsBuyer}
                onChange={(e) => setForm((f) => ({ ...f, sameAsBuyer: e.target.checked }))}
              />
              同購買人
            </label>

            <div className="grid2">
              <Field label="姓名" req>
                <input
                  name="rName"
                  value={form.rName}
                  onChange={onChange}
                  disabled={form.sameAsBuyer}
                  className="input"
                />
              </Field>
              <Field label="手機" req>
                <input
                  name="rPhone"
                  value={form.rPhone}
                  onChange={onChange}
                  disabled={form.sameAsBuyer}
                  className="input"
                />
              </Field>
              <Field label="電子郵件（選填）" full>
                <input
                  name="rEmail"
                  value={form.rEmail}
                  onChange={onChange}
                  disabled={form.sameAsBuyer}
                  className="input"
                />
              </Field>
            </div>
          </Section>

          {/* 🆕 配送方式（只新增，不動你的原樣式） */}
          <Section title="配送方式">
            <div className="check">
              <label className="check">
                <input
                  type="radio"
                  name="shipMethod"
                  value="POST"
                  checked={form.shipMethod === "POST"}
                  onChange={(e) => setForm((f) => ({ ...f, shipMethod: e.target.value }))}
                />
                郵局宅配
              </label>
              <span style={{ width: 12 }} />
              <label className="check">
                <input
                  type="radio"
                  name="shipMethod"
                  value="CVS_NEWEBPAY"
                  checked={form.shipMethod === "CVS_NEWEBPAY"}
                  onChange={(e) => setForm((f) => ({ ...f, shipMethod: e.target.value }))}
                />
                超商取貨（藍新）
              </label>
            </div>
          </Section>

          {/* 你原本的區塊保留。內容依選項顯示對應欄位（地址／門市） */}
          <Section title="取貨門市">
            {form.shipMethod === "POST" ? (
              <>
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="請填寫完整地址"
                  className="input"
                />
                <p className="hint">宅配請填寫收件地址。</p>
              </>
            ) : (
              <>
                <input
                  name="pickupStore"
                  value={form.pickupStore}
                  onChange={onChange}
                  placeholder="例：7-ELEVEN 松福門市（935392）"
                  className="input"
                />
                <p className="hint">請手動輸入門市名稱（之後可串藍新地圖）。</p>
              </>
            )}
          </Section>

          <Section title="付款方式">
            <div className="pill">ATM 轉帳</div>
          </Section>

          <Section title="訂單備註">
            <textarea name="note" value={form.note} onChange={onChange} rows={4} className="input" />
          </Section>

          {err && <div className="error">{err}</div>}

          <button type="submit" disabled={loading || !items.length} className="cta">
            {loading ? "送出中…" : "送出訂單"}
          </button>
        </form>

        {/* 右：摘要 */}
        <aside className="card">
          <h2 className="stitle">訂單摘要</h2>
          <ul className="list">
            {items.map((it, idx) => {
              const unit = Number(it.price ?? it.unitPrice) || 0;
              const line = unit * (Number(it.qty) || 1);
              return (
                <li key={idx} className="row">
                  <span className="name">
                    {it.name} × {it.qty}
                  </span>
                  <span className="price">NT$ {line}</span>
                </li>
              );
            })}
          </ul>
          <div className="sep" />
          <div className="row sub">
            <span>商品小計</span>
            <span>NT$ {subTotal}</span>
          </div>
          <div className="row sub">
            <span>運費（{form.shipMethod === "CVS_NEWEBPAY" ? "超商" : "宅配"}）</span>
            <span>NT$ {shipFee}</span>
          </div>
          <div className="row total">
            <span>總計</span>
            <span>NT$ {total}</span>
          </div>
        </aside>
      </div>

      {/* 版面與配色樣式（完全保留原樣） */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #0f172a; /* 深藍底 */
          color: #e5e7eb;
          font-family: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', system-ui, sans-serif;
          padding: 32px 14px 60px;
        }
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 980px) {
          .wrap {
            grid-template-columns: 1.2fr 0.8fr; /* 穩定雙欄 */
            gap: 22px;
          }
        }

        .card {
          background: #111827; /* 深灰藍卡片 */
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px 18px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        }

        .stitle {
          font-weight: 800;
          font-size: 18px;
          margin-bottom: 10px;
          color: #fff;
        }
        .title {
          font-weight: 800;
          font-size: 18px;
          color: #fff;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 18px;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .grid2 {
            grid-template-columns: 1fr 1fr;
          }
          .grid2 :global(.full) {
            grid-column: 1 / -1;
          }
        }

        .label {
          font-size: 13px;
          color: #cbd5e1;
          display: block;
          margin-bottom: 6px;
        }
        .req {
          color: #f43f5e;
          margin-left: 2px;
        }

        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0b1220;
          color: #fff;
          padding: 10px 12px;
          outline: none;
        }
        .input:disabled {
          background: #0e1628;
          color: #9aa7b5;
        }

        .hint {
          margin-top: 6px;
          font-size: 12px;
          color: #93a3b8;
        }

        .pill {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #e5e7eb;
          font-weight: 700;
          font-size: 13px;
        }

        .check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #cbd5e1;
          margin-bottom: 10px;
        }

        .cta {
          width: 100%;
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(90deg, #f43f5e, #fb7185);
          box-shadow: 0 10px 18px rgba(244, 63, 94, 0.25);
          cursor: pointer;
        }
        .cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          background: rgba(254, 226, 226, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.4);
          color: #fecaca;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .list {
          border-top: 1px dashed rgba(255, 255, 255, 0.12);
          margin-top: 6px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 10px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
        }
        .name {
          font-size: 14px;
          color: #e5e7eb;
        }
        .price {
          font-size: 14px;
          font-weight: 800;
          color: #facc15;
        }
        .sep {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }
        .sub {
          color: #cbd5e1;
          font-size: 14px;
        }
        .total {
          font-weight: 900;
          color: #facc15;
          font-size: 18px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

/* 小元件：段落 + 標籤/欄位（保持不變） */
function Section({ title, children }) {
  return (
    <div className="section">
      <h2 className="title">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, req, full, children }) {
  return (
    <div className={full ? "full" : ""}>
      <label className="label">
        {label}
        {req ? <span className="req">*</span> : null}
      </label>
      {children}
    </div>
  );
}
