"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * 白底購物車頁
 * - 讀寫 localStorage.cart = { items: [{id,name,price|unitPrice,qty,image}] }
 * - 可增減數量、移除、清空
 * - 頁面底部預留 120px，避免遮到你的活動諮詢/浮動元件
 */

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    try {
      const raw = localStorage.getItem("cart");
      const data = raw ? JSON.parse(raw) : { items: [] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    }
  };

  const save = (list) => {
    localStorage.setItem("cart", JSON.stringify({ items: list }));
    setItems(list);
  };

  const subTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.price ?? it.unitPrice) || 0) * (Number(it.qty) || 1), 0),
    [items]
  );

  const shipping = items.length ? 60 : 0; // 預設用超商 60，實際以結帳頁選擇為準
  const total = subTotal + shipping;

  const inc = (idx) => {
    const next = [...items];
    next[idx].qty = Number(next[idx].qty || 1) + 1;
    save(next);
  };
  const dec = (idx) => {
    const next = [...items];
    const q = Number(next[idx].qty || 1) - 1;
    next[idx].qty = q <= 1 ? 1 : q;
    save(next);
  };
  const removeAt = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    save(next);
  };
  const clear = () => {
    save([]);
  };

  return (
    <main style={{ background: "#fff", minHeight: "100vh", paddingBottom: 120 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 16px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>購物車</h1>
        <p style={{ color: "#475569", marginBottom: 18 }}>確認品項與數量，前往結帳。</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {/* 清單 */}
          <div style={card}>
            {items.length === 0 ? (
              <div style={{ color: "#64748b" }}>
                購物車是空的。<Link href="/" style={{ marginLeft: 8, color: "#2563eb", textDecoration: "underline" }}>去逛逛</Link>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((it, idx) => {
                  const unit = Number(it.price ?? it.unitPrice) || 0;
                  const line = unit * (Number(it.qty) || 1);
                  return (
                    <li key={idx} style={row}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt={it.name} width={64} height={64} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f1f5f9" }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>NT$ {unit}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => dec(idx)} style={qtyBtn}>－</button>
                        <span style={{ minWidth: 24, textAlign: "center", fontWeight: 800 }}>{it.qty || 1}</span>
                        <button onClick={() => inc(idx)} style={qtyBtn}>＋</button>
                      </div>

                      <div style={{ width: 100, textAlign: "right", fontWeight: 800 }}>NT$ {line}</div>

                      <button onClick={() => removeAt(idx)} style={removeBtn}>移除</button>
                    </li>
                  );
                })}
              </ul>
            )}

            {items.length > 0 && (
              <div style={{ marginTop: 12, textAlign: "right" }}>
                <button onClick={clear} style={{ ...linkBtn, color: "#dc2626" }}>清空購物車</button>
              </div>
            )}
          </div>

          {/* 摘要 */}
          <aside style={card}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>訂單摘要</h3>
            <div style={pair}><span>商品小計</span><span>NT$ {subTotal}</span></div>
            <div style={pair}><span>預估運費</span><span>NT$ {items.length ? shipping : 0}</span></div>
            <div style={{ height: 1, background: "#eee", margin: "10px 0" }} />
            <div style={{ ...pair, fontWeight: 900, fontSize: 18 }}><span>總計</span><span>NT$ {total}</span></div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <Link href="/" style={ghostBtn}>繼續購物</Link>
              <button
                onClick={() => router.push("/checkout")}
                disabled={!items.length}
                style={ctaBtn}
              >
                前往結帳
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" };
const row = { display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px dashed #f1f5f9" };
const qtyBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" };
const removeBtn = { border: 0, background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: 700 };
const ghostBtn = { display: "inline-block", padding: "10px 16px", borderRadius: 10, border: "1px solid #e5e7eb", textDecoration: "none", color: "#111" };
const ctaBtn = { padding: "10px 16px", borderRadius: 10, border: 0, color: "#fff", background: "linear-gradient(90deg,#111,#444)", cursor: "pointer", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" };
const pair = { display: "flex", justifyContent: "space-between", marginBottom: 6 };
