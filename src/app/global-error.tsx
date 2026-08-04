"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f1f5f9", color: "#0f172a" }}>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            minHeight: "100vh",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <section
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgb(15 23 42 / 0.12)",
              fontFamily: "system-ui, sans-serif",
              maxWidth: "480px",
              padding: "32px",
              width: "100%",
            }}
          >
            <p style={{ color: "#6d28d9", fontSize: "12px", fontWeight: 700 }}>
              Application recovery
            </p>
            <h1 style={{ fontSize: "28px", margin: "8px 0 0" }}>
              Worksite needs a reload
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.65 }}>
              A core application provider could not start. Reload explicitly to
              reconnect; saved attendance on this device is not cleared.
            </p>
            {error.digest ? (
              <p
                style={{
                  color: "#64748b",
                  fontFamily: "monospace",
                  fontSize: "11px",
                }}
              >
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#6d28d9",
                border: 0,
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 700,
                marginTop: "16px",
                minHeight: "44px",
                padding: "0 18px",
              }}
            >
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
