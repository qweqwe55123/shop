// app/api/cvs/start/route.js
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * 開藍新物流門市地圖 (B51 storeMap)
 * 可用 query：lgs=C2C|B2C（預設C2C）、ship=1|2|3|4（1=7-11）
 */
export async function GET(req) {
  const url = new URL(req.url);

  // 物流UID/金鑰（沒有物流專用就沿用金流）
  const UID = process.env.NEWEBPAY_LOGISTICS_UID || process.env.NEWEBPAY_MERCHANT_ID || "";
  const HASH_KEY = process.env.NEWEBPAY_LOGISTICS_HASH_KEY || process.env.NEWEBPAY_HASH_KEY || "";
  const HASH_IV  = process.env.NEWEBPAY_LOGISTICS_HASH_IV  || process.env.NEWEBPAY_HASH_IV  || "";
  const MAP_URL  = process.env.NEWEBPAY_LOGISTICS_MAP_URL
    || "https://ccore.newebpay.com/API/Logistic/storeMap"; // 沙箱端點

  if (!UID || !HASH_KEY || !HASH_IV) {
    return new Response("Logistics UID/HashKey/HashIV 未設定", { status: 500 });
  }

  // 業務參數
  const lgsType  = url.searchParams.get("lgs")  || "C2C";
  const shipType = url.searchParams.get("ship") || "1"; // 1=7-11
  const clientBase = process.env.CLIENT_BASE_URL || new URL(req.url).origin;
  const returnURL = `${clientBase}/api/cvs/callback`;

  const merchantOrderNo = `MAP_${Date.now().toString(36)}`.slice(0, 30);

  // EncryptData 內容 (querystring 字串)
  const encObj = {
    MerchantOrderNo: merchantOrderNo,
    LgsType: lgsType,
    ShipType: shipType,
    ReturnURL: returnURL,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  // AES-256-CBC (hex)
  const EncryptData = aesEncrypt(encStr, HASH_KEY, HASH_IV);
  // HashData = SHA256( "HashKey=...&EncryptData=...&HashIV=..." ).toUpperCase()
  const HashData = sha256Upper(`HashKey=${HASH_KEY}&${EncryptData}&HashIV=${HASH_IV}`);

  // ⚠️ 關鍵：欄位名稱不要底線
  const postFields = {
    UID: UID,
    Version: "1.0",
    RespondType: "JSON",
    EncryptData,
    HashData,
  };

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
