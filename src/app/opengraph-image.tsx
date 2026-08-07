import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "L'Artisan Imprimeur — Plateforme d'impression premium en Algérie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// غلاف Open Graph بصيغة Glassmorphism فاخرة: لوح زجاجي متجمد في المنتصف
// مع خلفية داكنة، شبكة هندسية، وتدرجات CMYK (سماوي/أرجواني/أصفر/أسود).
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0e1628 45%, #151d33 75%, #0b1120 100%)",
          overflow: "hidden",
        }}
      >
        {/* شبكة هندسية خفيفة */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* توهجات CMYK خلفية */}
        <div
          style={{
            position: "absolute",
            left: -160,
            top: -120,
            width: 560,
            height: 560,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(6,182,212,0.55), transparent 65%)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -80,
            width: 520,
            height: 520,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(217,70,239,0.5), transparent 65%)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "30%",
            bottom: -200,
            width: 620,
            height: 620,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(250,204,21,0.4), transparent 65%)",
            filter: "blur(12px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "22%",
            bottom: -140,
            width: 480,
            height: 480,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(59,130,246,0.5), transparent 65%)",
            filter: "blur(10px)",
          }}
        />

        {/* شريط CMYK متدرج علوي وسفلي */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            display: "flex",
            background: "linear-gradient(90deg, #06b6d4 0%, #a855f7 25%, #facc15 50%, #3b82f6 75%, #ec4899 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            display: "flex",
            background: "linear-gradient(90deg, #ec4899 0%, #3b82f6 25%, #facc15 50%, #a855f7 75%, #06b6d4 100%)",
          }}
        />

        {/* الحافة المعدنية للوح الزجاجي (تدرج خلفي يظهر كإطار) */}
        <div
          style={{
            position: "relative",
            display: "flex",
            padding: 2,
            borderRadius: 44,
            background:
              "linear-gradient(140deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 30%, rgba(6,182,212,0.55) 55%, rgba(168,85,247,0.55) 78%, rgba(255,255,255,0.35) 100%)",
            boxShadow: "0 0 80px rgba(99,102,241,0.35), 0 40px 90px rgba(0,0,0,0.55)",
          }}
        >
          {/* اللوح الزجاجي المتجمد */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 84px",
              borderRadius: 42,
              background: "linear-gradient(150deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.10) 100%)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -40px 80px rgba(255,255,255,0.05)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* لمعان قطري (انعكاس ضوئي) */}
            <div
              style={{
                position: "absolute",
                top: -120,
                left: -100,
                width: 900,
                height: 260,
                transform: "rotate(18deg)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.0))",
              }}
            />

            {/* شارة CMYK فوق العنوان */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 26,
              }}
            >
              <div style={{ display: "flex", width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #06b6d4, #a855f7)", boxShadow: "0 8px 24px rgba(139,92,246,0.5)" }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  color: "rgba(226,232,240,0.9)",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                }}
              >
                <span style={{ color: "#22d3ee" }}>C</span>
                <span style={{ color: "#e879f9" }}>M</span>
                <span style={{ color: "#fde047" }}>Y</span>
                <span style={{ color: "#e2e8f0" }}>K</span>
                <span style={{ color: "rgba(148,163,184,0.8)", marginLeft: 4 }}>·</span>
                <span>PRINT STUDIO</span>
              </div>
            </div>

            {/* العنوان الرئيسي */}
            <div
              style={{
                display: "flex",
                fontSize: 74,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                textShadow: "0 4px 30px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              L&apos;Artisan
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 74,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                textShadow: "0 4px 30px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  backgroundImage: "linear-gradient(92deg, #22d3ee 0%, #818cf8 30%, #e879f9 60%, #fde047 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Imprimeur
              </span>
            </div>

            {/* خط فاصل زجاجي */}
            <div
              style={{
                display: "flex",
                width: 200,
                height: 3,
                marginTop: 24,
                marginBottom: 20,
                borderRadius: 999,
                background: "linear-gradient(90deg, transparent, #22d3ee, #e879f9, transparent)",
              }}
            />

            {/* شعار فرعي */}
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                color: "rgba(203,213,225,0.95)",
                letterSpacing: "0.08em",
              }}
            >
              Impression Premium · Oran, Algérie
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                gap: 10,
              }}
            >
              {["Cartes", "Flyers", "Goodies", "3D"].map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    padding: "6px 16px",
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "rgba(226,232,240,0.85)",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
