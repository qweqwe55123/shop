// app/api/cvs/start/route.js
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
  return enc.toString("base64");
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

  const MAP_URL =
    process.env.NEWEBPAY_LOGISTICS_MAP_URL || "https://ccore.newebpay.com/API/Logistic/storeMap";

  if (!UID || !HASH_KEY || !HASH_IV) {
    return new Response("<h1>缺少環境變數</h1>", {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const clientBase = process.env.CLIENT_BASE_URL || url.origin;

  const encObj = {
    MerchantOrderNo: `MAP_${Date.now().toString(36)}`.slice(0, 30),
    LgsType: url.searchParams.get("lgs") || "C2C",
    ShipType: url.searchParams.get("ship") || "1",
    ReturnURL: `${clientBase}/api/cvs/callback`,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  const EncryptData_ = aesEncryptBase64(encStr, HASH_KEY, HASH_IV);
  const HashData_ = sha256Upper(`HashKey=${HASH_KEY}&EncryptData=${EncryptData_}&HashIV=${HASH_IV}`);

  // ★ 帶底線命名
  const fields = {
    UID_: UID,
    Version_: "1.0",
    RespondType_: "JSON",
    EncryptData_: EncryptData_,
    HashData_: HashData_,
  };

  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");

  const html = `<!doctype html><meta charset="utf-8">
    <form id="f" method="post" accept-charset="UTF-8" action="${esc(MAP_URL)}">
      ${inputs}
    </form>
    <script>document.getElementById('f').submit();</script>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
