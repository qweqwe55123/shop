// app/api/shipping/newebpay/cvs-return/route.js
import { NextResponse } from "next/server";

// 這支是給藍新的「門市選擇地圖」ReturnURL 使用
export async function GET(req) {
  const url = new URL(req.url);

  // 依藍新實際參數調整，常見：StoreID / StoreName / StoreAddress
  const storeId = url.searchParams.get("StoreID") || url.searchParams.get("CVSStoreID");
  const storeName = url.searchParams.get("StoreName") || url.searchParams.get("CVSStoreName");
  const storeAddr = url.searchParams.get("StoreAddress") || url.searchParams.get("CVSAddress");

  // 回到哪個頁面（可由 query 指定，沒有就回 /checkout）
  const redirectTo = url.searchParams.get("redirect") || "/checkout";

  const store = { storeId, storeName, storeAddr };
  const res = NextResponse.redirect(new URL(redirectTo, req.url));

  // 寫一個 10 分鐘有效的 cookie，前端 checkout 讀出來塞進表單
  res.cookies.set("cvs_store", encodeURIComponent(JSON.stringify(store)), {
    path: "/",
    maxAge: 60 * 10,
    httpOnly: false, // 讓前端能讀
  });

  return res;
}
