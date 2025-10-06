"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ===== 顏色與共用樣式 ===== */
const BG = "#0f172a";
const PANEL = "#111827";
const BORDER = "rgba(255,255,255,.08)";
const TEXT_SUB = "#cbd5e1";
const MUTED = "#94a3b8";

/* ===== 共用：Panel ===== */
function Panel({ children, style = {} }) {
  return (
    <section
      style={{
        maxWidth: 880,
        margin: "40px auto",
        background: PANEL,
        borderRadius: 16,
        padding: "32px 20px",
        boxShadow: "0 0 40px rgba(0,0,0,.25)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/* ===== 共用：置中圖片 ===== */
function CenterImg({ src, alt, max = 700 }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%",
        maxWidth: max,
        height: "auto",
        borderRadius: 12,
        display: "block",
        margin: "0 auto",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 5px 20px rgba(0,0,0,.25)",
      }}
    />
  );
}

/* ===== FAQ ===== */
function FAQ({ qa = [] }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {qa.map(([q, a], i) => {
        const active = open === i;
        return (
          <div
            key={q}
            onClick={() => setOpen(active ? -1 : i)}
            style={{
              background: "rgba(255,255,255,.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {q}
              <span
                style={{
                  fontWeight: 900,
                  color: MUTED,
                  transform: `rotate(${active ? 45 : 0}deg)`,
                  transition: "transform 120ms",
                }}
              >
                +
              </span>
            </div>
            <div
              style={{
                maxHeight: active ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 220ms ease",
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <div style={{ padding: active ? "12px 16px" : "0 16px", color: TEXT_SUB }}>
                {a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== 可點擊優惠 Chip（含原價刪線與省多少） ===== */
function DealChip({ label, price, compareAt, perUnit, active = false, onClick }) {
  const save = Math.max(0, (compareAt ?? 0) - price);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "#f43f5e" : BORDER}`,
        background: active ? "rgba(244,63,94,.12)" : "rgba(255,255,255,.04)",
        color: "white",
        fontWeight: 800,
        fontSize: 13,
        boxShadow: active ? "0 6px 14px rgba(244,63,94,.25)" : "none",
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <span style={{ opacity: 0.95 }}>{label}</span>
      <span style={{ color: "#facc15" }}>NT$ {price}</span>
      {compareAt ? (
        <span
          style={{
            color: "#94a3b8",
            textDecoration: "line-through",
            fontWeight: 700,
          }}
        >
          NT$ {compareAt}
        </span>
      ) : null}
      <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 12 }}>
        （每組 NT$ {perUnit}）
      </span>
      {save > 0 && (
        <span
          style={{
            marginLeft: 6,
            padding: "4px 8px",
            borderRadius: 999,
            background: "linear-gradient(90deg,#f43f5e,#fb7185)",
            color: "white",
            fontSize: 12,
            fontWeight: 900,
            boxShadow: "0 6px 14px rgba(244,63,94,.25)",
          }}
        >
          省 NT$ {save}
        </span>
      )}
    </button>
  );
}

/* ===== 主頁 ===== */
export default function HomePage() {
  /* 置頂活動條動畫 */
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerOpacity, setBannerOpacity] = useState(1);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setBannerScale(Math.max(0.94, 1 - y / 1200));
      setBannerOpacity(Math.max(0.75, 1 - y / 800));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* 價格規則（最省組合計算用） */
  // 1 入：299、2 入：560、3 入：780、5 入：1250（可自行調整）
  const priceRules = [
    { pack: 5, price: 1250 },
    { pack: 3, price: 780 },
    { pack: 2, price: 560 },
    { pack: 1, price: 299 },
  ];

  // 用最省組合計算小計
  function calcBestDeal(qty) {
    let remain = qty;
    let total = 0;
    const pick = [];
    for (const { pack, price } of priceRules) {
      if (remain <= 0) break;
      const n = Math.floor(remain / pack);
      if (n > 0) {
        pick.push([pack, n, price]); // [組數大小, 幾組, 該組售價]
        total += n * price;
        remain -= n * pack;
      }
    }
    if (remain > 0) {
      const last = priceRules[priceRules.length - 1];
      pick.push([1, remain, last.price]);
      total += remain * last.price;
    }
    return { total, pick };
  }

  /* 數量控制與小計 */
  const [qty, setQty] = useState(1);
  const deal = useMemo(() => calcBestDeal(qty), [qty]);

  /* 加入購物車（localStorage 示意，可換成你的 CartProvider 或 API） */
  function addToCart() {
    const cartKey = "cart";
    const item = {
      id: "ms-stand",
      name: "真空磁吸手機架",
      unitPrice: 299,
      qty,
      calc: deal.pick,
      total: deal.total,
      image: "/6.jpg",
    };
    try {
      const raw = localStorage.getItem(cartKey);
      const data = raw ? JSON.parse(raw) : { items: [] };
      data.items = Array.isArray(data.items) ? data.items : [];
      data.items.push(item);
      localStorage.setItem(cartKey, JSON.stringify(data));
      alert("已加入購物車！");
      // 需要直接結帳就導頁：
      // window.location.href = "/checkout";
    } catch (e) {
      alert("加入購物車失敗：" + String(e?.message || e));
    }
  }

  return (
    <div
      style={{
        background: BG,
        color: "white",
        minHeight: "100vh",
        fontFamily:
          "'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif",
      }}
    >
      {/* 置頂活動條 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1000,
          transform: `scale(${bannerScale})`,
          transformOrigin: "top center",
          opacity: bannerOpacity,
          transition: "transform 120ms linear, opacity 120ms linear",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 16,
            letterSpacing: 1,
            padding: "12px 10px",
            background:
              "linear-gradient(90deg, rgba(59,130,246,.25), rgba(236,72,153,.25))",
            borderBottom: `1px solid ${BORDER}`,
            fontWeight: 700,
          }}
        >
          🎁 真空磁吸手機架 — 限時優惠中
        </div>
      </div>

      {/* 🛒 查看購物清單按鈕（固定右上） */}
      <button
        onClick={() => (window.location.href = "/cart")}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1100,
          background: "linear-gradient(90deg,#f43f5e,#fb7185)",
          color: "white",
          border: "none",
          borderRadius: 9999,
          padding: "10px 16px",
          fontWeight: 800,
          fontSize: 14,
          boxShadow: "0 4px 12px rgba(244,63,94,.4)",
          cursor: "pointer",
        }}
      >
        🛒 查看購物清單
      </button>

      {/* 墊高避免遮住內容 */}
      <div style={{ height: 60 }} />

      {/* 首圖 + 標題 */}
      <Panel style={{ paddingBottom: 44 }}>
        <CenterImg src="/1.jpg" alt="真空磁吸手機架 首圖" max={760} />
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            真空磁吸手機架
          </h1>
          <p style={{ color: TEXT_SUB }}>
            穩固不掉落・全金屬結構・自由角度調整
          </p>
        </div>
      </Panel>

      {/* 圖片展示（2~6.jpg 放在 public 根目錄） */}
      <Panel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 34,
            alignItems: "center",
          }}
        >
          {["/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg"].map((src, i) => (
            <CenterImg key={i} src={src} alt={`產品圖 ${i + 1}`} />
          ))}
        </div>
      </Panel>

      {/* 比較表 */}
      <Panel>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          一表看懂｜與一般支架差在哪？
        </h2>
        <div
          style={{
            overflowX: "auto",
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 620,
            }}
          >
            <thead>
              <tr style={{ background: "rgba(255,255,255,.05)" }}>
                <th style={th}>項目</th>
                <th style={th}>真空磁吸款</th>
                <th style={th}>一般夾式/黏貼式</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["固定力道", "真空 + 磁吸雙固定，穩固不掉", "彈簧/黏膠，易鬆脫"],
                ["視角調整", "三軸細緻可調", "單軸，角度難固定"],
                ["對內裝影響", "不傷車、不殘膠", "易殘膠，拔除傷飾板"],
                ["安裝難度", "貼上即用，單手操作", "需螺絲或多步驟調整"],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={tdHead}>{r[0]}</td>
                  <td style={tdGood}>{r[1]}</td>
                  <td style={tdBad}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 三大賣點（在比較表下面） */}
      <Panel>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          為什麼人人都換這一款？
        </h2>
        <div style={{ display: "grid", gap: 16 }}>
          {[
            { title: "真空強力吸附", desc: "顛簸路面依然穩固不掉落。" },
            { title: "三軸視角自由", desc: "360° 多軸可調，導航不再擋視線。" },
            { title: "MagSafe 相容", desc: "單手放上即吸，附磁環更穩固。" },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: "rgba(255,255,255,.04)",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
              <div style={{ color: TEXT_SUB, fontSize: 14 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* FAQ */}
      <Panel>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          常見問題
        </h2>
        <FAQ
          qa={[
            ["會不會傷車？", "採真空吸附，不殘膠；移除後不留痕。"],
            ["裝殼可以用嗎？", "相容 MagSafe；一般殼加贈磁環也可穩固。"],
            ["會不會掉？", "真空 + 磁吸雙重固定，正常路況穩固不掉落。"],
            ["怎麼清潔？", "微濕布輕拭即可，避免溶劑與強酸鹼。"],
          ]}
        />
      </Panel>

      {/* 購買區：數量控制 + 可點選方案 + 小計 + 加入購物車 */}
      <Panel style={{ padding: "28px 20px 38px" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          立即購買
        </h2>
        <p style={{ textAlign: "center", color: TEXT_SUB, marginBottom: 16 }}>
          真空磁吸手機架（單組 NT$ 299）
        </p>

        {/* 數量控制（半形 '-' '+'） */}
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            style={btnCircle}
            aria-label="decrease"
          >
            -
          </button>
          <div style={{ minWidth: 48, textAlign: "center", fontSize: 20, fontWeight: 800 }}>
            {qty}
          </div>
          <button
            onClick={() => setQty((q) => q + 1)}
            style={btnCircle}
            aria-label="increase"
          >
            +
          </button>
        </div>

        {/* 可點選方案（1 / 2 / 3 入）→ 直接設定數量 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 6,
            marginBottom: 8,
          }}
        >
          {[
            { label: "1 入組", qty: 1, price: 299, compareAt: 899 },
            { label: "2 入組", qty: 2, price: 560, compareAt: 1798 },
            { label: "3 入組", qty: 3, price: 780, compareAt: 2697 },
          ].map((t) => (
            <DealChip
              key={t.qty}
              label={t.label}
              price={t.price}
              compareAt={t.compareAt}
              perUnit={Math.round(t.price / t.qty)}
              active={qty === t.qty}
              onClick={() => setQty(t.qty)}
            />
          ))}
        </div>

        {/* 小計 & 組合明細（最省組合） */}
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <div style={{ fontSize: 14, color: TEXT_SUB }}>小計</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#facc15", lineHeight: 1.1 }}>
            NT$ {deal.total.toLocaleString()}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: TEXT_SUB }}>
            {deal.pick
              .filter(([, n]) => n > 0)
              .map(([pack, n, price], i) => (
                <span key={i} style={{ marginRight: 10 }}>
                  {pack}入 × {n}（NT$ {price}）
                </span>
              ))}
          </div>

          {/* CTA */}
          <button
            onClick={addToCart}
            style={{
              display: "inline-block",
              marginTop: 16,
              background: "linear-gradient(90deg,#f43f5e,#fb7185)",
              padding: "14px 28px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 16,
              color: "white",
              boxShadow: "0 4px 12px rgba(244,63,94,.35)",
              border: 0,
              cursor: "pointer",
            }}
          >
            加入購物車
          </button>
        </div>
      </Panel>

      {/* footer */}
      <footer
        style={{
          textAlign: "center",
          color: "#475569",
          fontSize: 13,
          padding: "30px 0 40px",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        © 2025 Minimal Stand. All rights reserved.
      </footer>
    </div>
  );
}

/* 表格樣式物件 */
const th = {
  padding: "12px 14px",
  textAlign: "left",
  borderBottom: `1px solid ${BORDER}`,
  fontWeight: 800,
  fontSize: 14,
};
const tdHead = {
  padding: "12px 14px",
  borderBottom: `1px solid ${BORDER}`,
  fontWeight: 700,
  color: "#e2e8f0",
  width: "28%",
};
const tdGood = {
  padding: "12px 14px",
  borderBottom: `1px solid ${BORDER}`,
  color: TEXT_SUB,
  width: "36%",
};
const tdBad = {
  padding: "12px 14px",
  borderBottom: `1px solid ${BORDER}`,
  color: MUTED,
  width: "36%",
};
const btnCircle = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: "rgba(255,255,255,.08)",
  border: `1px solid ${BORDER}`,
  fontSize: 20,
  fontWeight: 900,
  color: "white",
  cursor: "pointer",
};
