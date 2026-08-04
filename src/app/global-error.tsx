"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "'Cairo', sans-serif", background: "#0f172a" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "30rem",
              width: "100%",
              textAlign: "center",
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(16px)",
              borderRadius: "2.5rem",
              padding: "3rem",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>💥</div>
            <h1 style={{ fontSize: "1.75rem", color: "#fff", fontWeight: 900, marginBottom: "0.75rem" }}>
              Erreur critique
            </h1>
            <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.6 }}>
              Une erreur critique est survenue. Réessayez ou rechargez la page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "1rem 2.5rem",
                borderRadius: "1rem",
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 10px 30px -8px rgba(59,130,246,0.6)",
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
