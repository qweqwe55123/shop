"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ===== 跟首頁一致的色系 ===== */
const BG = "#0f172a";
const PANEL = "#111827";
const BORDER = "rgba(255,255,255,.08)";
const TEXT_SUB = "#cbd5e1";

/* ===== 共用 Panel ===== */
function Panel({ children, style = {} }) {
  return (
    <section
      style={{
        maxWidth: 960,
        margin: "24px auto",
        background: PANEL,
        borderRadius: 16,
        padding: "20px 18px",
        boxShadow: "0 0 40px rgba(0,0,0,.25)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export default function CartPage() {
  const [items, setItems] = useState([]);

  // 初始載入購物車
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
    () => items.reduce((s, it) => s + (Number(it.total) || 0), 0),
    [items]
  );
  const shipping = items.length ? 60 : 0;
  const total = subTotal + shipping;

  // 操作
  const remove = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    localStorage.setItem("cart", JSON.stringify({ items: next }));
  };

  const clearAll = () => {
    setItems([]);
    localStorage.setItem("cart", JSON.stringify({ items: [] }));
  };

  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: "white",
        fontFamily:
          "'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif",
        paddingBottom: 60,
      }}
    >
      {/* 置頂導覽 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: `1px solid ${BORDER}`,
          background:
            "linear-gradient(90deg, rgba(59,130,246,.15), rgba(236,72,153,.15))",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 1 }}>🛒 購物清單</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => (window.location.href = "/")}
              style={ghostBtn}
            >
              ⟵ 回首頁
            </button>
            {items.length > 0 && (
              <button onClick={clearAll} style={ghostBtn}>
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 清單 */}
      <Panel>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 140px 100px",
                gap: 12,
                padding: "10px 12px",
                borderBottom: `1px solid ${BORDER}`,
                color: TEXT_SUB,
                fontSize: 13,
              }}
            >
              <div>商品</div>
              <div style={{ textAlign: "center" }}>數量</div>
              <div style={{ textAlign: "right" }}>小計</div>
              <div style={{ textAlign: "center" }}>操作</div>
            </div>

            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 140px 100px",
                  gap: 12,
                  padding: "14px 12px",
                  alignItems: "center",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* 縮圖 */}
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.name}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: `1px solid ${BORDER}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 10,
                        background: "rgba(255,255,255,.06)",
                        border: `1px solid ${BORDER}`,
                        display: "grid",
                        placeItems: "center",
                        color: TEXT_SUB,
                        fontSize: 12,
                      }}
                    >
                      無圖
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: TEXT_SUB }}>
                      單入原價 NT$ {Number(it.unitPrice || 0).toLocaleString()}
                    </div>
                    {/* 組合明細（如 3入×1 + 1入×1） */}
                    {Array.isArray(it.calc) && it.calc.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, color: TEXT_SUB }}>
                        {it.calc.map(([pack, n, price], idx) => (
                          <span key={idx} style={{ marginRight: 10 }}>
                            {pack}入 × {n}（NT$ {price}）
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "center", fontWeight: 800 }}>{it.qty}</div>

                <div style={{ textAlign: "right", fontWeight: 900, color: "#facc15" }}>
                  NT$ {Number(it.total || 0).toLocaleString()}
                </div>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => remove(i)} style={dangerBtn}>
                    移除
                  </button>
                </div>
              </div>
            ))}

            {/* 結算區 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 320px",
                gap: 16,
                marginTop: 16,
              }}
            >
              {/* 左側：返回/繼續購物 */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => (window.location.href = "/")}
                  style={ghostBtn}
                >
                  ⟵ 繼續購物
                </button>
              </div>

              {/* 右側：金額總結 + 去結帳 */}
              <div
                style={{
                  background: "rgba(255,255,255,.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: TEXT_SUB,
                    marginBottom: 6,
                  }}
                >
                  <span>商品小計</span>
                  <span>NT$ {subTotal.toLocaleString()}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: TEXT_SUB,
                    marginBottom: 10,
                  }}
                >
                  <span>運費（超商）</span>
                  <span>NT$ {shipping.toLocaleString()}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 900,
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                >
                  <span>應付總額</span>
                  <span style={{ color: "#facc15" }}>
                    NT$ {total.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => (window.location.href = "/checkout")}
                  style={primaryBtn}
                >
                  前往結帳 →
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

/* ===== 空狀態 ===== */
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "40px 10px" }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
        購物車是空的
      </div>
      <div style={{ color: TEXT_SUB, marginBottom: 14 }}>
        先去逛逛，挑選你要的商品吧！
      </div>
      <button
        onClick={() => (window.location.href = "/")}
        style={primaryBtn}
      >
        返回首頁
      </button>
    </div>
  );
}

/* ===== 按鈕樣式 ===== */
const primaryBtn = {
  width: "100%",
  background: "linear-gradient(90deg,#f43f5e,#fb7185)",
  color: "white",
  border: 0,
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(244,63,94,.25)",
};

const ghostBtn = {
  background: "rgba(255,255,255,.06)",
  color: "white",
  border: `1px solid ${BORDER}`,
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtn = {
  background: "transparent",
  color: "#fda4af",
  border: `1px solid rgba(254, 205, 211, .35)`,
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 800,
  cursor: "pointer",
};
