"use client";

import { useState } from "react";

export default function OrderLookupPage() {
  const [orderNo, setOrderNo] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setData(null);

    const no = orderNo.trim();
    if (!no) {
      setErr("請輸入訂單編號");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNo: no }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error || `查詢失敗（${res.status}）`);
        return;
      }
      setData(json);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "28px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 12 }}>訂單查詢</h1>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="輸入訂單編號（例如：HEM_20251007_xxxx）"
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: 0,
            borderRadius: 8,
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "查詢中…" : "查詢"}
        </button>
      </form>

      {err ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fdecec",
            color: "#a00",
            border: "1px solid #f5b5b5",
          }}
        >
          {err === "NOT_FOUND" ? "查無此訂單" : err}
        </div>
      ) : null}

      {data ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>訂單資訊</div>
          <div>訂單編號：{data.orderNo}</div>
          {"status" in data && <div>狀態：{data.status}</div>}
          {"shipMethod" in data && <div>配送方式：{data.shipMethod}</div>}
          {"pickupStore" in data && data.pickupStore && (
            <div>取貨門市：{data.pickupStore}</div>
          )}
          <div>小計：NT$ {data.subTotal}</div>
          <div>運費：NT$ {data.shipping}</div>
          <div style={{ fontWeight: 800 }}>總計：NT$ {data.total}</div>

          {Array.isArray(data.items) && data.items.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>品項</div>
              <ul style={{ paddingLeft: 18 }}>
                {data.items.map((it) => (
                  <li key={it.id}>
                    {it.name} × {it.qty} — NT$ {it.price * it.qty}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
