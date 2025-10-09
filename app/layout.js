// app/layout.js
import Link from "next/link";

export const metadata = {
  title: "VacMag Stand | 真空磁吸手機架",
  description: "VacMag Stand 一頁式官方商店",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0, background: "#fff", color: "#111", fontFamily: "Noto Sans TC, system-ui, sans-serif" }}>
        {/* Header */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "#ffffffcc",
            backdropFilter: "saturate(180%) blur(8px)",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", color: "#111", fontWeight: 900, letterSpacing: 0.3 }}>
              VacMag Stand <span style={{ color: "#64748b", marginLeft: 6, fontWeight: 700 }}>| 真空磁吸手機架</span>
            </Link>
            <nav style={{ display: "flex", gap: 16 }}>
              <Link href="/orders/lookup" style={navStyle}>訂單查詢</Link>
              <Link href="/cart" style={navStyle}>購物車</Link>
              <Link href="/checkout" style={{ ...navStyle, color: "#fff", background: "#111", padding: "8px 12px", borderRadius: 10 }}>結帳</Link>
            </nav>
          </div>
        </header>

        {/* Page content */}
        {children}

        {/* Footer（也放一個訂單查詢入口） */}
        <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <small style={{ color: "#64748b" }}>© {new Date().getFullYear()} VacMag Stand</small>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/orders/lookup" style={{ ...navStyle, padding: 0 }}>訂單查詢</Link>
              <Link href="/cart" style={{ ...navStyle, padding: 0 }}>購物車</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

const navStyle = {
  textDecoration: "none",
  color: "#111",
  fontWeight: 700,
};
