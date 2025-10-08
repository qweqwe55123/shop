// app/api/cvs/start/route.js
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 禁止靜態化/快取，確保讀到最新 env

function aesEncrypt(plain, key, iv) {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex");
}
function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}
function escapeHtml(s) {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}
function htmlError(msg, pairs = {}) {
  const dump = Object.entries(pairs)
    .map(([k, v]) => `<li><b>${escapeHtml(k)}</b>: ${escapeHtml(String(v))}</li>`)
    .join("");
  const body = `<h1 style="font-family:ui-sans-serif">NewebPay storeMap 設定錯誤</h1>
  <p>${escapeHtml(msg)}</p><ul>${dump}</ul>`;
  return new Response(`<!doctype html><meta charset="utf-8">${body}`, {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req) {
  const url = new URL(req.url);

  // 1) 讀取環境變數（物流專用沒有就用金流）
  const UID = process.env.NEWEBPAY_LOGISTICS_UID || process.env.NEWEBPAY_MERCHANT_ID || "";
  const HASH_KEY = process.env.NEWEBPAY_LOGISTICS_HASH_KEY || process.env.NEWEBPAY_HASH_KEY || "";
  const HASH_IV  = process.env.NEWEBPAY_LOGISTICS_HASH_IV  || process.env.NEWEBPAY_HASH_IV  || "";
  const MAP_URL  = process.env.NEWEBPAY_LOGISTICS_MAP_URL
    || "https://ccore.newebpay.com/API/Logistic/storeMap";

  // 2) 驗證 env 是否存在，若缺就直接顯示錯誤（避免送空欄位去藍新）
  const missing = [];
  if (!UID)      missing.push("UID (NEWEBPAY_LOGISTICS_UID 或 NEWEBPAY_MERCHANT_ID)");
  if (!HASH_KEY) missing.push("HASH_KEY (NEWEBPAY_LOGISTICS_HASH_KEY 或 NEWEBPAY_HASH_KEY)");
  if (!HASH_IV)  missing.push("HASH_IV (NEWEBPAY_LOGISTICS_HASH_IV 或 NEWEBPAY_HASH_IV)");
  if (missing.length) {
    return htmlError("缺少必要的環境變數，請到 Vercel 專案 → Settings → Environment Variables 補上後重新部署。",
      { 缺少項目: missing.join("、") });
  }

  // 3) 組業務參數
  const lgsType  = url.searchParams.get("lgs")  || "C2C"; // C2C/B2C
  const shipType = url.searchParams.get("ship") || "1";   // 1=7-11
  const clientBase = process.env.CLIENT_BASE_URL || new URL(req.url).origin;
  const returnURL = `${clientBase}/api/cvs/callback`;

  const merchantOrderNo = `MAP_${Date.now().toString(36)}`.slice(0, 30);

  // 4) EncryptData 的內容（querystring）
  const encObj = {
    MerchantOrderNo: merchantOrderNo,
    LgsType: lgsType,
    ShipType: shipType,
    ReturnURL: returnURL,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  // 5) 產生 EncryptData & HashData
  const EncryptData = aesEncrypt(encStr, HASH_KEY, HASH_IV);
  const HashData = sha256Upper(`HashKey=${HASH_KEY}&EncryptData=${EncryptData}&HashIV=${HASH_IV}`);

  // 6) 正確欄位名稱（不帶底線）
  const fields = {
    UID: UID,
    Version: "1.0",
    RespondType: "JSON",
    EncryptData,
    HashData,
  };

  // 7) 產生自動提交表單
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(String(v))}">`)
    .join("");

  const html = `<!doctype html><meta charset="utf-8"><title>CVS Map</title>
  <form id="f" method="post" action="${escapeHtml(MAP_URL)}">${inputs}</form>
  <script>document.getElementById('f').submit();</script>`;

  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
