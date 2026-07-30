// src/components/emails/AbandonedCartTemplate.tsx
import * as React from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  selectedOptions?: {
    finition?: string;
    paper?: string;
    corners?: string;
    lamination?: string;
  };
}

interface AbandonedCartTemplateProps {
  displayName: string;
  cartItems: CartItem[];
  checkoutUrl: string;
}

export const AbandonedCartTemplate: React.FC<Readonly<AbandonedCartTemplateProps>> = ({
  displayName,
  cartItems,
  checkoutUrl,
}) => (
  <div
    style={{
      fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundColor: "#f0f2f5",
      padding: "40px 20px",
      color: "#1e293b",
    }}
  >
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #a855f7 100%)",
          padding: "40px 30px",
          textAlign: "center" as const,
          color: "#ffffff",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: "900",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#e9d5ff",
            display: "block",
            marginBottom: "8px",
          }}
        >
          L'Artisan Imprimeur
        </span>
        <h1
          style={{
            margin: "0",
            fontSize: "26px",
            fontWeight: "900",
            lineHeight: "1.2",
          }}
        >
          Votre panier vous attend ! 🛒
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: "40px 30px" }}>
        <p style={{ fontSize: "16px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
          Bonjour <strong>{displayName || "Cher client"}</strong>,
        </p>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#475569", margin: "0 0 30px 0" }}>
          Nous avons remarqué que vous avez préparé votre design et configuré vos options d'impression, mais vous n'avez pas finalisé votre commande. Ne laissez pas votre projet de côté ! Voici les articles restés dans votre panier :
        </p>

        {/* Cart items list */}
        <div style={{ marginBottom: "30px" }}>
          {cartItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: idx === cartItems.length - 1 ? "none" : "1px solid #e2e8f0",
              }}
            >
              <div style={{ textAlign: "left" as const }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#a855f7", textTransform: "uppercase" }}>
                  {item.category || "Impression"}
                </span>
                <h4 style={{ margin: "2px 0 4px 0", fontSize: "15px", fontWeight: "bold", color: "#1e293b" }}>
                  {item.name}
                </h4>
                {item.selectedOptions && (
                  <p style={{ margin: "0", fontSize: "11px", color: "#94a3b8" }}>
                    Options : {item.selectedOptions.paper || "300g"} • {item.selectedOptions.lamination || "Aucune"}
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right" as const, fontWeight: "bold", fontSize: "14px", color: "#0f172a" }}>
                {item.quantity} x {item.price} DA
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" as const, marginBottom: "30px" }}>
          <a
            href={checkoutUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#a855f7",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "14px",
              textDecoration: "none",
              padding: "16px 36px",
              borderRadius: "14px",
              boxShadow: "0 10px 15px -3px rgba(168, 85, 247, 0.3)",
            }}
          >
            Finaliser ma commande
          </a>
        </div>

        <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center" as const, margin: "0" }}>
          Besoin d'aide ou d'un conseil technique ? Notre équipe est à votre disposition !
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          padding: "24px 30px",
          backgroundColor: "#f8fafc",
          textAlign: "center" as const,
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        © 2026 L'Artisan Imprimeur. Tous droits réservés.
      </div>
    </div>
  </div>
);
