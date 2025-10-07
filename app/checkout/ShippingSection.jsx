"use client";
import { useState, useEffect } from "react";

export default function ShippingSection({
  value,
  onChange,
  error,
}) {
  // value: { method?: 'POST' | 'CVS_NEWEBPAY', address?: string, pickupStore?: string }
  const [method, setMethod] = useState(value?.method || "");
  const [address, setAddress] = useState(value?.address || "");
  const [pickupStore, setPickupStore] = useState(value?.pickupStore || "");

  useEffect(() => {
    onChange?.({ method, address, pickupStore });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, address, pickupStore]);

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-lg">配送方式</h3>

      {/* 單選：郵局宅配 / 超商取貨（藍新） */}
      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="ship"
            value="POST"
            checked={method === "POST"}
            onChange={() => setMethod("POST")}
          />
          <span>郵局宅配</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="ship"
            value="CVS_NEWEBPAY"
            checked={method === "CVS_NEWEBPAY"}
            onChange={() => setMethod("CVS_NEWEBPAY")}
          />
          <span>超商取貨（藍新）</span>
        </label>
      </div>

      {/* 依配送方式顯示對應欄位 */}
      {method === "POST" && (
        <div className="space-y-1">
          <label className="block">收件地址*</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="請填寫完整地址"
            className="w-full rounded px-3 py-2"
          />
        </div>
      )}

      {method === "CVS_NEWEBPAY" && (
        <div className="space-y-2">
          <label className="block">取貨門市*</label>
          <div className="flex gap-2">
            <input
              value={pickupStore}
              onChange={(e) => setPickupStore(e.target.value)}
              placeholder="請選擇或輸入門市名稱"
              className="flex-1 rounded px-3 py-2"
            />
            {/* 之後改成打開藍新門市地圖；先保留一顆按鈕位子 */}
            <button
              type="button"
              className="rounded px-3 py-2 border"
              onClick={() => {
                // TODO: 導去藍新門市地圖；完成後由 ReturnURL 帶回門市資訊
                alert("之後串藍新門市地圖，這裡會自動帶回門市");
              }}
            >
              選擇門市
            </button>
          </div>
        </div>
      )}

      {!!error && (
        <div className="rounded px-3 py-2">
          {error}
        </div>
      )}
    </section>
  );
}
