// app/api/cvs/start/route.js
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * 產生門市地圖表單（自動 POST 到藍新 storeMap）
 * 可用 query 覆寫：
 *   lgs=C2C|B2C  預設 C2C
 *   ship=1|2|3|4  1=7-11, 2=全家, 3=萊爾富, 4=OK  預設 1(7-11)
 */
export async function GET(req) {
  const url = new URL(req.url);

  // Logistics（若未提供則退回你金流同組 Key/IV）
  const UID = process.env.NEWEBPAY_LOGISTICS_UID || process.env.NEWEBPAY_MERCHANT_ID || "";
  const HASH_KEY = process.env.NEWEBPAY_LOGISTICS_HASH_KEY || process.env.NEWEBPAY_HASH_KEY || "";
  const HASH_IV  = process.env.NEWEBPAY_LOGISTICS_HASH_IV  || process.env.NEWEBPAY_HASH_IV  || "";
  const MAP_URL  = process.env.NEWEBPAY_LOGISTICS_MAP_URL
    || "https://ccore.newebpay.com/API/Logistic/storeMap"; // 沙箱預設

  if (!UID || !HASH_KEY || !HASH_IV) {
    return new Response("Logistics UID/HashKey/HashIV 未設定", { status: 500 });
  }

  // 業務參數
  const lgsType  = url.searchParams.get("lgs")  || "C2C"; // C2C 店到店 / B2C
  const shipType = url.searchParams.get("ship") || "1";   // 1=7-11
  const clientBase = process.env.CLIENT_BASE_URL || new URL(req.url).origin;

  const returnURL = `${clientBase}/api/cvs/callback`;
  const merchantOrderNo = `MAP_${Date.now().toString(36)}`.slice(0, 30);

  // EncryptData_ 內容（以 querystring 字串加密）
  const encObj = {
    MerchantOrderNo: merchantOrderNo,
    LgsType: lgsType,        // C2C / B2C
    ShipType: shipType,      // 1=7-11, 2=全家, 3=萊爾富, 4=OK
    ReturnURL: returnURL,    // 地圖選完回呼
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  // AES-256-CBC 加密 (EncryptData_)
  const encryptData = aesEncrypt(encStr, HASH_KEY, HASH_IV);

  // HashData_（HashKey + EncryptData_ + HashIV → SHA256 大寫）
  const hashData = sha256Upper(`HashKey=${HASH_KEY}&${encryptData}&HashIV=${HASH_IV}`);

  const postFields = {
    UID_: UID,
    Version_: "1.0",
    RespondType_: "JSON",
    EncryptData_: encryptData,
    HashData_: hashData,
  };

  // 產生自動送出的 HTML
  const inputs = Object.entries(postFields)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(String(v))}">`)
    .join("");

  const html = `<!doctype html><meta charset="utf-8"><title>CVS Map</title>
<form id="f" method="post" action="${escapeHtml(MAP_URL)}">${inputs}</form>
<script>document.getElementById('f').submit();</script>`;

  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

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
