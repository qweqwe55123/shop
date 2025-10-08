// app/api/cvs/start/route.js
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 每次即時讀 env

function aesEncrypt(plain, key, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8")
  );
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex"); // hex 小寫
}
function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}
function esc(s) {
  return String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}
function htmlError(msg, extra = {}) {
  const list = Object.entries(extra)
    .map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(v)}</li>`)
    .join("");
  return new Response(
    `<!doctype html><meta charset="utf-8"><h1>NewebPay storeMap 設定錯誤</h1><p>${esc(
      msg
    )}</p><ul>${list}</ul>`,
    { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  // 1) 讀 env（物流專用沒有就用金流）
  const UID =
    process.env.NEWEBPAY_LOGISTICS_UID ||
    process.env.NEWEBPAY_MERCHANT_ID ||
    "";
  const HASH_KEY =
    process.env.NEWEBPAY_LOGISTICS_HASH_KEY ||
    process.env.NEWEBPAY_HASH_KEY ||
    "";
  const HASH_IV =
    process.env.NEWEBPAY_LOGISTICS_HASH_IV ||
    process.env.NEWEBPAY_HASH_IV ||
    "";
  const MAP_URL =
    process.env.NEWEBPAY_LOGISTICS_MAP_URL ||
    "https://ccore.newebpay.com/API/Logistic/storeMap";

  if (!UID || !HASH_KEY || !HASH_IV) {
    return htmlError("缺少必要的環境變數。", {
      UID: UID ? "OK" : "MISSING",
      HASH_KEY: HASH_KEY ? "OK" : "MISSING",
      HASH_IV: HASH_IV ? "OK" : "MISSING",
    });
  }

  // 2) 組 EncryptData 內容
  const clientBase = process.env.CLIENT_BASE_URL || new URL(req.url).origin;
  const encObj = {
    MerchantOrderNo: `MAP_${Date.now().toString(36)}`.slice(0, 30),
    LgsType: url.searchParams.get("lgs") || "C2C",
    ShipType: url.searchParams.get("ship") || "1", // 1=7-11
    ReturnURL: `${clientBase}/api/cvs/callback`,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
  };
  const encStr = new URLSearchParams(encObj).toString();

  // 3) 產生 EncryptData / HashData
  const EncryptData = aesEncrypt(encStr, HASH_KEY, HASH_IV);
  const HashData = sha256Upper(
    `HashKey=${HASH_KEY}&EncryptData=${EncryptData}&HashIV=${HASH_IV}`
  );

  // 4) 要送給藍新的欄位（名稱必須是這些）
  const fields = {
    UID,
    Version: "1.0",
    RespondType: "JSON",
    EncryptData,
    HashData,
  };

  // 5) debug：先不要自動送出，讓你看欄位值
  if (debug) {
    const rows = Object.entries(fields)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px;border:1px solid #ddd">${esc(
            k
          )}</td><td style="padding:6px;border:1px solid #ddd">${esc(v)}</td></tr>`
      )
      .join("");
    const formInputs = Object.entries(fields)
      .map(
        ([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`
      )
      .join("");
    const html = `<!doctype html><meta charset="utf-8">
      <h3>NewebPay storeMap - Debug</h3>
      <p>請確認欄位都有值，然後按下送出。</p>
      <table style="border-collapse:collapse">${rows}</table>
      <form method="post" action="${esc(MAP_URL)}" accept-charset="UTF-8" style="margin-top:12px">
        ${formInputs}
        <button type="submit">送出到藍新</button>
      </form>`;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // 6) 正式模式：自動送出
  const inputs = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`
    )
    .join("");
  const html = `<!doctype html><meta charset="utf-8">
    <form method="post" action="${esc(MAP_URL)}" accept-charset="UTF-8" id="f">
      ${inputs}
    </form>
    <script>document.getElementById('f').submit();</script>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
