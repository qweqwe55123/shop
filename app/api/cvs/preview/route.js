// app/api/cvs/preview/route.js
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function aesEncryptBase64(plain, key, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8")
  );
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64"); // ★ 改成 base64
}
function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}
const esc = (s) =>
  String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

export async function GET(req) {
  const url = new URL(req.url);

  const UID = process.env.NEWEBPAY_LOGISTICS_UID || process.env.NEWEBPAY_MERCHANT_ID || "";
  const HASH_KEY = process.env.NEWEBPAY_LOGISTICS_HASH_KEY || process.env.NEWEBPAY_HASH_KEY || "";
  const HASH_IV = process.env.NEWEBPAY_LOGISTICS_HASH_IV || process.env.NEWEBPAY_HASH_IV || "";

  const clientBase = process.env.CLIENT_BASE_URL || url.origin;

  const encObj = {
    MerchantOrderNo: `MAP_${Date.now().toString(36)}`.slice(0, 30),
    LgsType: url.searchParams.get("lgs") || "C2C",
    ShipType: url.searchParams.get("ship") || "1", // 1=7-ELEVEN
    ReturnURL: `${clientBase}/api/cvs/callback`,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  const EncryptData = UID && HASH_KEY && HASH_IV ? aesEncryptBase64(encStr, HASH_KEY, HASH_IV) : "";
  const HashData = EncryptData
    ? sha256Upper(`HashKey=${HASH_KEY}&EncryptData=${EncryptData}&HashIV=${HASH_IV}`)
    : "";

  const fields = {
    UID,
    Version: "1.0",         // ★ 改成 1.0
    RespondType: "JSON",
    EncryptData,
    HashData,
  };

  const rows = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px;border:1px solid #ddd">${esc(k)}</td><td style="padding:6px;border:1px solid #ddd;word-break:break-all">${esc(
          v
        )}</td></tr>`
    )
    .join("");

  const hidden = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");

  const MAP_URL =
    process.env.NEWEBPAY_LOGISTICS_MAP_URL || "https://ccore.newebpay.com/API/Logistic/storeMap";
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7);

  const html = `<!doctype html><meta charset="utf-8">
  <h3>NewebPay storeMap - Preview (build ${esc(sha)})</h3>
  <p>確認下列 5 個欄位<span style="font-weight:700">都有值</span>（EncryptData 會是 Base64、通常會有「/」「+」「=」）。OK 後再按下方送出。</p>
  <table style="border-collapse:collapse">${rows}</table>
  <form method="post" action="${esc(MAP_URL)}" accept-charset="UTF-8" style="margin-top:12px">
    ${hidden}
    <button type="submit">POST 到藍新 (storeMap)</button>
  </form>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
