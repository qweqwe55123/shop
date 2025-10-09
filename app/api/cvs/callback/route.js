// app/api/cvs/callback/route.js
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pick = (k) => (process.env[k] == null ? "" : String(process.env[k]).trim());

function aesDecryptBase64ToUtf8(b64, key, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8")
  );
  const dec = Buffer.concat([
    decipher.update(Buffer.from(b64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

function sha256Upper(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

export async function POST(req) {
  const raw = await req.text(); // x-www-form-urlencoded
  const p = new URLSearchParams(raw);

  const UID_ = p.get("UID_") || "";
  const EncryptData_ = p.get("EncryptData_") || "";
  const HashData_ = p.get("HashData_") || "";

  const KEY = pick("NEWEBPAY_LOGISTICS_HASH_KEY");
  const IV = pick("NEWEBPAY_LOGISTICS_HASH_IV");

  // 驗簽（建議保留）
  const calc = sha256Upper(`HashKey=${KEY}&EncryptData=${EncryptData_}&HashIV=${IV}`);
  const signOK = HashData_ && calc === HashData_;

  let plain = "";
  let data = {};
  try {
    plain = aesDecryptBase64ToUtf8(EncryptData_, KEY, IV); // 內容是 querystring
    const q = new URLSearchParams(plain);
    data = {
      LgsType: q.get("LgsType") || "",
      ShipType: q.get("ShipType") || "",
      StoreID: q.get("StoreID") || "",
      StoreName: q.get("StoreName") || "",
      StoreAddress: q.get("StoreAddress") || "",
      LogisticsSubType: q.get("LogisticsSubType") || "",
    };
  } catch (e) {
    return new Response(
      `<!doctype html><meta charset="utf-8">
       <script>
         window.opener && window.opener.postMessage(
           { type: "CVS_SELECTED", ok:false, err:"DECRYPT_FAIL" },
           "*"
         );
         window.close();
       </script>`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const payload = JSON.stringify({ ok: signOK, uid: UID_, data });
  return new Response(
    `<!doctype html><meta charset="utf-8">
     <script>
       try {
         window.opener && window.opener.postMessage(
           { type: "CVS_SELECTED", result: ${payload} },
           "*"
         );
       } catch(e) {}
       window.close();
     </script>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
