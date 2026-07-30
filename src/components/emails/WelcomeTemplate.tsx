// src/components/emails/WelcomeTemplate.tsx
import * as React from "react";

interface WelcomeTemplateProps {
  displayName: string;
  promoCode: string;
}

export const WelcomeTemplate: React.FC<Readonly<WelcomeTemplateProps>> = ({
  displayName,
  promoCode,
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
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      {/* Premium Gradient Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
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
            color: "#60a5fa",
            display: "block",
            marginBottom: "8px",
          }}
        >
          L'Artisan Imprimeur
        </span>
        <h1
          style={{
            margin: "0",
            fontSize: "28px",
            fontWeight: "900",
            lineHeight: "1.2",
          }}
        >
          Bienvenue parmi nous ! ✨
        </h1>
      </div>

      {/* Main Body */}
      <div style={{ padding: "40px 30px" }}>
        <p style={{ fontSize: "16px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
          Bonjour <strong>{displayName || "Cher client"}</strong>,
        </p>
        <p style={{ fontSize: "16px", lineHeight: "1.6", margin: "0 0 30px 0" }}>
          Nous sommes ravis de vous compter parmi les membres de la communauté de <strong>L'Artisan Imprimeur</strong>. Pour célébrer votre inscription, nous avons le plaisir de vous offrir une réduction de <strong>10%</strong> sur votre première commande !
        </p>

        {/* Promo Code Box (Translucent Glass Look) */}
        <div
          style={{
            background: "rgba(37, 99, 235, 0.03)",
            borderRadius: "16px",
            border: "1px dashed rgba(37, 99, 235, 0.3)",
            padding: "24px",
            textAlign: "center" as const,
            marginBottom: "30px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Votre code de bienvenue
          </span>
          <span
            style={{
              fontSize: "32px",
              fontWeight: "950",
              fontFamily: "monospace",
              letterSpacing: "4px",
              color: "#2563eb",
              display: "block",
            }}
          >
            {promoCode}
          </span>
        </div>

        <div style={{ textAlign: "center" as const, marginBottom: "30px" }}>
          <a
            href="https://artisan-imprimeur.dz/services"
            style={{
              display: "inline-block",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "14px",
              textDecoration: "none",
              padding: "16px 36px",
              borderRadius: "14px",
              boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.3)",
            }}
          >
            Découvrir nos services
          </a>
        </div>

        <p style={{ fontSize: "14px", color: "#64748b", margin: "0", lineHeight: "1.5" }}>
          À très bientôt,<br />
          <strong>L'équipe L'Artisan Imprimeur</strong>
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
