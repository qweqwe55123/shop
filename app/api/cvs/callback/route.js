// app/api/cvs/callback/route.js
import crypto from "crypto";

export const runtime = "nodejs";

const HASH_KEY = process.env.NEWEBPAY_LOGISTICS_HASH_KEY || process.env.NEWEBPAY_HASH_KEY || "";
const HASH_IV  = process.env.NEWEBPAY_LOGISTICS_HASH_IV  || process.env.NEWEBPAY_HASH_IV  || "";

const sha256Upper = (s) => crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
function aesDecrypt(hex, key, iv) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
}

export async function POST(req) {
  const form = await req.formData();

  // 依手冊：Status / Message / EncryptData / HashData
  const Status      = String(form.get("Status")      || "");
  const EncryptData = String(form.get("EncryptData") || "");
  const HashData    = String(form.get("HashData")    || "");

  const ok = HashData && sha256Upper(`HashKey=${HASH_KEY}&${EncryptData}&HashIV=${HASH_IV}`) === HashData;

  let store = { id: "", name: "", address: "" };
  try {
    if (ok && Status === "SUCCESS" && EncryptData) {
      const raw = aesDecrypt(EncryptData, HASH_KEY, HASH_IV);
      const obj = Object.fromEntries(new URLSearchParams(raw));
      // 常見欄位名（實際以你的手冊為準）
      store.id      = obj.StoreID || obj.CVSStoreID || "";
      store.name    = obj.StoreName || obj.CVSStoreName || "";
      store.address = obj.StoreAddr || obj.StoreAddress || obj.CVSAddress || "";
    }
  } catch { /* ignore */ }

  const target = process.env.CLIENT_BASE_URL || new URL(req.url).origin;
  const redirectUrl = `${target}/checkout?sid=${encodeURIComponent(store.id)}&sn=${encodeURIComponent(store.name)}&sa=${encodeURIComponent(store.address)}`;

  // 優先以 postMessage 帶回；沒有 opener 就導回 /checkout?sid=...
  const html = `<!doctype html><meta charset="utf-8"><title>Selected</title>
<script>
  (function(){
    var data = { type: "CVS_PICKED", data: ${JSON.stringify(store)} };
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(data, ${JSON.stringify(target)});
        window.close();
      } else {
        location.replace(${JSON.stringify(redirectUrl)});
      }
    } catch (e) { location.replace(${JSON.stringify(redirectUrl)}); }
  })();
</script>選擇完成，返回中…`;

  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
