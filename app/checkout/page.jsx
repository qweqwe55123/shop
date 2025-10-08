"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 結帳頁（白底版）
 * - 配送：7-ELEVEN / 郵局
 * - 付款：7-ELEVEN → 信用卡 / ATM / 取貨付款(COD UI)；郵局 → 信用卡 / ATM
 * - 門市地圖：/api/cvs/start (藍新 B51) → /api/cvs/callback 回填
 * - 郵局：新增「收件地址」欄位，並在送單時帶到 customer.address
 */
export default function CheckoutPage() {
  const router = useRouter();

  // 1) 購物車
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

  // 2) 金額
  const subTotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + (Number(it.price ?? it.unitPrice) || 0) * (Number(it.qty) || 1),
        0
      ),
    [items]
  );
  const shippingFee = items.length ? 60 : 0;
  const total = subTotal + shippingFee;

  // 3) 表單
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    sameAsBuyer: true, rName: "", rPhone: "", rEmail: "",
    shipMethod: "CVS_7ELEVEN", // CVS_7ELEVEN | POST
    payMethod: "CREDIT",       // CREDIT | ATM | COD (僅 7-11)
    // 超商門市欄位
    cvsStoreId: "", cvsStoreName: "", cvsAddress: "",
    // 郵局宅配地址
    postAddress: "",
    note: "",
  });

  // 勾選「同購買人」→ 自動帶入
  useEffect(() => {
    if (form.sameAsBuyer) {
      setForm((f) => ({ ...f, rName: f.name, rPhone: f.phone, rEmail: f.email }));
    }
  }, [form.sameAsBuyer, form.name, form.phone, form.email]);

  // 配送切換：郵局不允許 COD
  useEffect(() => {
    setForm((f) => (f.shipMethod === "POST" && f.payMethod === "COD" ? { ...f, payMethod: "CREDIT" } : f));
  }, [form.shipMethod]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // ===== 門市地圖回傳：postMessage 監聽 + URL 備援回填 =====
  useEffect(() => {
    const allow = window.location.origin;
    const onMsg = (e) => {
      if (String(e.origin) !== allow) return;
      if (e.data && e.data.type === "CVS_PICKED") {
        const d = e.data.data || {};
        setForm((f) => ({
          ...f,
          cvsStoreId: d.id || d.storeId || f.cvsStoreId,
          cvsStoreName: d.name || d.storeName || f.cvsStoreName,
          cvsAddress: d.address || d.storeAddress || f.cvsAddress,
        }));
      }
    };
    window.addEventListener("message", onMsg);

    // 備援：讀 URL 參數（/checkout?sid=...&sn=...&sa=...）
    try {
      const p = new URLSearchParams(window.location.search);
      const sid = p.get("sid"), sn = p.get("sn"), sa = p.get("sa");
      if (sid || sn || sa) {
        setForm((f) => ({
          ...f,
          cvsStoreId: sid || f.cvsStoreId,
          cvsStoreName: sn || f.cvsStoreName,
          cvsAddress: sa || f.cvsAddress,
        }));
        const u = new URL(window.location.href);
        u.search = "";
        window.history.replaceState({}, "", u.toString());
      }
    } catch {}

    return () => window.removeEventListener("message", onMsg);
  }, []);

  // 打開門市地圖（C2C + 7-11）
  const openCvsPicker = () => {
    const w = 980, h = 700;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    window.open("/api/cvs/start?lgs=C2C&ship=1", "cvs_map",
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 送出訂單
  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!items.length) return setErr("購物車是空的。");
    if (!form.name || !form.phone || !form.email) return setErr("請填購買人姓名 / 手機 / Email。");
    if (!form.rName || !form.rPhone) return setErr("請填收件人姓名 / 手機。");

    if (form.shipMethod === "CVS_7ELEVEN") {
      if (!form.cvsStoreId || !form.cvsStoreName) {
        return setErr("請先選擇 7-ELEVEN 取貨門市。");
      }
    } else {
      if (!form.postAddress) return setErr("請填寫郵局宅配收件地址。");
    }

    try {
      setLoading(true);

      const payloadItems = items.map((it) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price ?? it.unitPrice) || 0,
        qty: Number(it.qty) || 1,
        image: it.image ?? null,
      }));

      const shippingMethod = form.shipMethod === "CVS_7ELEVEN" ? "CVS_NEWEBPAY" : "POST";

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
            note: form.note || null,
            address: form.shipMethod === "POST" ? form.postAddress : null, // ★ 郵局帶地址
          },
          receiver: { name: form.rName, phone: form.rPhone, email: form.rEmail || null },
          shipping: {
            method: shippingMethod,
            store:
              shippingMethod === "CVS_NEWEBPAY"
                ? { id: form.cvsStoreId, name: form.cvsStoreName, address: form.cvsAddress }
                : null,
          },
          payMethod: form.payMethod, // CREDIT | ATM | COD(7-11)
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.message || data?.error || `建立失敗（${res.status}）`);
        return;
      }

      localStorage.setItem("cart", JSON.stringify({ items: [] }));
      router.push(`/orders/${data.orderNo}`);
    } catch (e2) {
      setErr(String(e2?.message ?? e2));
    } finally {
      setLoading(false);
    }
  };

  const payOptions =
    form.shipMethod === "CVS_7ELEVEN"
      ? [
          { value: "CREDIT", label: "信用卡" },
          { value: "ATM", label: "ATM 轉帳" },
          { value: "COD", label: "取貨付款（7-ELEVEN）" },
        ]
      : [
          { value: "CREDIT", label: "信用卡" },
          { value: "ATM", label: "ATM 轉帳" },
        ];

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

          <Section title="配送方式">
            <div className="rowh">
              <label className="radio">
                <input
                  type="radio"
                  name="shipMethod"
                  value="CVS_7ELEVEN"
                  checked={form.shipMethod === "CVS_7ELEVEN"}
                  onChange={onChange}
                />
                7-ELEVEN 超商取貨
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="shipMethod"
                  value="POST"
                  checked={form.shipMethod === "POST"}
                  onChange={onChange}
                />
                郵局宅配
              </label>
            </div>
          </Section>

          {form.shipMethod === "CVS_7ELEVEN" && (
            <Section title="取貨門市">
              <div className="grid2">
                <Field label="門市代號" req>
                  <input
                    name="cvsStoreId"
                    value={form.cvsStoreId}
                    onChange={onChange}
                    className="input"
                    placeholder="例如：935392"
                  />
                </Field>
                <Field label="門市名稱" req>
                  <input
                    name="cvsStoreName"
                    value={form.cvsStoreName}
                    onChange={onChange}
                    className="input"
                    placeholder="例如：松福門市"
                  />
                </Field>
                <Field label="門市地址" full>
                  <input
                    name="cvsAddress"
                    value={form.cvsAddress}
                    onChange={onChange}
                    className="input"
                    placeholder="門市完整地址"
                  />
                </Field>
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn-light" onClick={openCvsPicker}>
                  選擇門市（藍新地圖）
                </button>
                <span className="hint" style={{ marginLeft: 8 }}>
                  選完會自動回填門市欄位。
                </span>
              </div>
            </Section>
          )}

          {form.shipMethod === "POST" && (
            <Section title="收件地址（郵局宅配）">
              <input
                name="postAddress"
                value={form.postAddress}
                onChange={onChange}
                className="input"
                placeholder="請輸入完整收件地址（道路、門牌、樓層…）"
              />
              <p className="hint">未填寫地址將無法送單。</p>
            </Section>
          )}

          <Section title="付款方式">
            <div className="rowh">
              {payOptions.map((opt) => (
                <label key={opt.value} className="radio">
                  <input
                    type="radio"
                    name="payMethod"
                    value={opt.value}
                    checked={form.payMethod === opt.value}
                    onChange={onChange}
                    disabled={form.shipMethod === "POST" && opt.value === "COD"}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {form.payMethod === "COD" && form.shipMethod === "CVS_7ELEVEN" && (
              <p className="hint">取貨付款為物流代收，第二階段會串接藍新物流下單與代收款結帳。</p>
            )}
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
            <span>運費</span>
            <span>NT$ {shippingFee}</span>
          </div>
          <div className="row total">
            <span>應付總計</span>
            <span>NT$ {total}</span>
          </div>
        </aside>
      </div>

      {/* ---- 白底樣式 ---- */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #ffffff;               /* 白底 */
          color: #111827;                    /* 深灰字 */
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
            grid-template-columns: 1.2fr 0.8fr;
            gap: 22px;
          }
        }
        .card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px 18px;
          box-shadow: 0 6px 20px rgba(17, 24, 39, 0.06);
        }
        .stitle, .title {
          font-weight: 800;
          font-size: 18px;
          margin-bottom: 10px;
          color: #111827;
        }
        .section { margin-bottom: 18px; }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .grid2 {
            grid-template-columns: 1fr 1fr;
          }
          .grid2 :global(.full) { grid-column: 1 / -1; }
        }

        .label {
          font-size: 13px;
          color: #374151;
          display: block;
          margin-bottom: 6px;
        }
        .req { color: #ef4444; margin-left: 2px; }

        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #111827;
          padding: 10px 12px;
          outline: none;
        }
        .input:disabled { background: #f9fafb; color: #6b7280; }

        .hint { margin-top: 6px; font-size: 12px; color: #6b7280; }

        .check, .radio {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #111827;
          margin-right: 14px;
        }
        .rowh { display: flex; flex-wrap: wrap; gap: 10px 16px; }

        .btn-light {
          display: inline-block;
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #111827;
          font-weight: 700;
          cursor: pointer;
        }

        .cta {
          width: 100%;
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          box-shadow: 0 10px 18px rgba(59, 130, 246, 0.25);
          cursor: pointer;
        }
        .cta:disabled { opacity: 0.6; cursor: not-allowed; }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .list { border-top: 1px dashed #e5e7eb; margin-top: 6px; }
        .row {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          padding: 10px 0; border-bottom: 1px dashed #e5e7eb;
        }
        .name { font-size: 14px; color: #374151; }
        .price { font-size: 14px; font-weight: 800; color: #111827; }
        .sep { height: 1px; background: #e5e7eb; margin: 8px 0; }
        .sub { color: #374151; font-size: 14px; }
        .total { font-weight: 900; color: #111827; font-size: 18px; margin-top: 4px; }
      `}</style>
    </div>
  );
}

/* 小元件 */
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
