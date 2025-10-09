// app/api/cvs/preview/route.js
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pick = (k) => (process.env[k] == null ? "" : String(process.env[k]).trim());

function aesEncryptBase64(plain, key, iv) {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64");
}
function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]));

export async function GET(req) {
  const url = new URL(req.url);

  // 優先用物流憑證，其次用金流憑證
  const LOG_UID = pick("NEWEBPAY_LOGISTICS_UID");
  const LOG_KEY = pick("NEWEBPAY_LOGISTICS_HASH_KEY");
  const LOG_IV  = pick("NEWEBPAY_LOGISTICS_HASH_IV");

  const PAY_MER = pick("NEWEBPAY_MERCHANT_ID");
  const PAY_KEY = pick("NEWEBPAY_HASH_KEY");
  const PAY_IV  = pick("NEWEBPAY_HASH_IV");

  const USE_LOGISTICS = !!(LOG_UID && LOG_KEY && LOG_IV);
  const UID = USE_LOGISTICS ? LOG_UID : PAY_MER;
  const KEY = USE_LOGISTICS ? LOG_KEY : PAY_KEY;
  const IV  = USE_LOGISTICS ? LOG_IV  : PAY_IV;

  const which = USE_LOGISTICS ? "logistics" : (UID && KEY && IV ? "payment" : "none");

  const clientBase = pick("CLIENT_BASE_URL") || url.origin;

  const encObj = {
    MerchantOrderNo: `MAP_${Date.now().toString(36)}`.slice(0, 30),
    LgsType  : url.searchParams.get("lgs")  || "C2C",
    ShipType : url.searchParams.get("ship") || "1", // 1: 7-11
    ReturnURL: `${clientBase}/api/cvs/callback`,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  const EncryptData_ = UID && KEY && IV ? aesEncryptBase64(encStr, KEY, IV) : "";
  const HashData_    = EncryptData_ ? sha256Upper(`HashKey=${KEY}&EncryptData=${EncryptData_}&HashIV=${IV}`) : "";

  const fields = {
    UID_: UID,
    Version_: "1.0",
    RespondType_: "JSON",
    EncryptData_: EncryptData_,
    HashData_: HashData_,
  };

  const debugRows = `
    <tr><td>using</td><td>${esc(which)}</td></tr>
    <tr><td>UID length</td><td>${UID ? UID.length : 0}</td></tr>
    <tr><td>KEY length</td><td>${KEY ? KEY.length : 0}</td></tr>
    <tr><td>IV length</td><td>${IV ? IV.length : 0}</td></tr>
  `;

  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="word-break:break-all">${esc(v)}</td></tr>`)
    .join("");

  const hidden = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");

  const MAP_URL = pick("NEWEBPAY_LOGISTICS_MAP_URL") || "https://ccore.newebpay.com/API/Logistic/storeMap";
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7);

  const html = `<!doctype html><meta charset="utf-8" />
  <h3>NewebPay storeMap - Preview (build ${esc(sha)})</h3>
  <table border="1" cellpadding="6" cellspacing="0">
    <tr><th colspan="2">env check</th></tr>
    ${debugRows}
    <tr><th colspan="2">post fields</th></tr>
    ${rows}
  </table>
  <form method="post" action="${esc(MAP_URL)}" accept-charset="UTF-8" style="margin-top:12px">
    ${hidden}
    <button type="submit">POST 到藍新 (storeMap)</button>
  </form>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
