"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 訂單查詢（方案 A）
 * - 查詢條件：訂單編號 + Email(或手機)
 * - 成功：顯示訂單摘要＋前往訂單頁按鈕
 * - 失敗：顯示統一訊息（避免被猜單）
 * - 風格：白底、簡潔、不影響既有全站配色
 */

export default function OrderLookupPage() {
  const [orderNo, setOrderNo] = useState("");
  const [contact, setContact] = useState(""); // email or phone
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setResult(null);

    if (!orderNo.trim() || !contact.trim()) {
      setErr("請輸入訂單編號與 Email（或手機）。");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNo: orderNo.trim(), contact: contact.trim() }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) {
        setErr(data?.message || "查無資料，請確認輸入是否正確。");
        return;
      }
      setResult(data.summary);
    } catch (e) {
      setErr("暫時無法查詢，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  const statusMap = {
    PENDING: { text: "待付款", color: "#f59e0b", bg: "#fef3c7" },
    PAID: { text: "已付款", color: "#16a34a", bg: "#dcfce7" },
    FAILED: { text: "付款失敗", color: "#dc2626", bg: "#fee2e2" },
    REFUND: { text: "已退款", color: "#0891b2", bg: "#cffafe" },
  };

  return (
    <main style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "30px 16px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>訂單查詢</h1>
        <p style={{ color: "#475569", marginBottom: 18 }}>
          請輸入 <b>訂單編號</b> 與 <b>Email（或手機）</b> 進行查詢。
        </p>

        <form
          onSubmit={onSubmit}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>
                訂單編號
              </label>
              <input
                className="input"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="例如：HEM_20241007_xxxxxx"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>
                Email 或 手機
              </label>
              <input
                className="input"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@example.com 或 0912xxxxxx"
                style={inputStyle}
              />
            </div>
          </div>

          {err && (
            <div style={errorBoxStyle}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 12,
              padding: "12px 18px",
              fontWeight: 900,
              color: "#fff",
              background: "linear-gradient(90deg,#2563eb,#60a5fa)",
              boxShadow: "0 10px 18px rgba(37,99,235,0.2)",
              cursor: "pointer",
            }}
          >
            {loading ? "查詢中…" : "查詢訂單"}
          </button>
        </form>

        {result && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>訂單摘要</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 8 }}>
              <div>訂單編號：<b>{result.orderNo}</b></div>
              <div>
                狀態：
                <span style={statusPillStyle(statusMap[result.status])}>
                  {statusMap[result.status]?.text ?? result.status}
                </span>
              </div>
              <div>
                配送方式：
                <b>{result.shipMethod === "CVS_NEWEBPAY" ? "超商取貨（藍新）" : "郵局宅配"}</b>
              </div>
              {result.pickupStore ? <div>取貨門市：{result.pickupStore}</div> : <div />}
              <div>成立時間：{new Date(result.createdAt).toLocaleString()}</div>
            </div>

            <hr style={{ margin: "14px 0", border: 0, borderTop: "1px dashed #e5e7eb" }} />

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {result.items.map((it, idx) => (
                <li key={idx} style={itemRowStyle}>
                  <span>{it.name} × {it.qty}</span>
                  <span>NT$ {it.price * it.qty}</span>
                </li>
              ))}
            </ul>
            <div style={{ height: 1, background: "#eee", margin: "10px 0" }} />
            <div style={subRowStyle}><span>商品小計</span><span>NT$ {result.subTotal}</span></div>
            <div style={subRowStyle}><span>運費</span><span>NT$ {result.shipping}</span></div>
            <div style={totalRowStyle}><span>應付總計</span><span>NT$ {result.total}</span></div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <Link
                href={`/orders/${result.orderNo}`}
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                }}
              >
                查看完整訂單
              </Link>
              {result.status === "PENDING" && (
                <form method="POST" action="/api/pay/newebpay/create">
                  <input type="hidden" name="orderNo" value={result.orderNo} />
                  <button
                    type="submit"
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: 0,
                      color: "#fff",
                      background: "linear-gradient(90deg,#ef4444,#fb7185)",
                      boxShadow: "0 8px 16px rgba(244,63,94,0.25)",
                      cursor: "pointer",
                    }}
                  >
                    前往結帳
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  padding: "10px 12px",
  outline: "none",
};

const errorBoxStyle = {
  background: "rgba(254,226,226,0.5)",
  border: "1px solid rgba(248,113,113,0.6)",
  color: "#7f1d1d",
  borderRadius: 10,
  padding: "10px 12px",
  margin: "12px 0",
  fontSize: 14,
};

const itemRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px dashed #f1f5f9",
  fontSize: 14,
};

const subRowStyle = { display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: 6 };
const totalRowStyle = { display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 18 };

function statusPillStyle(meta) {
  const m = meta || { color: "#334155", bg: "#e2e8f0" };
  return {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 8,
    background: m.bg,
    color: m.color,
    fontWeight: 700,
    fontSize: 13,
  };
}
