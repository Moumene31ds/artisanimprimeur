"use client";

import React, { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { 
  Sparkles, RotateCw, Smartphone, Camera, 
  Layers, Check, Eye, HelpCircle 
} from "lucide-react";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

export type LuxuryFinishingType = "gold_foil" | "silver_foil" | "rose_gold" | "spot_uv" | "emboss";

interface LuxuryCardMeshProps {
  finishing: LuxuryFinishingType;
  cardBaseColor: string;
  isRtl: boolean;
  gyroTilt: { x: number; y: number };
}

function LuxuryCardMesh({ finishing, cardBaseColor, isRtl, gyroTilt }: LuxuryCardMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Dynamic foil reflection canvas texture
  const foilTexture = useMemo(() => {
    if (typeof window === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = cardBaseColor;
    ctx.fillRect(0, 0, 1024, 640);

    // Elegant Luxury Border
    ctx.strokeStyle =
      finishing === "gold_foil"
        ? "#D4AF37"
        : finishing === "silver_foil"
        ? "#E2E8F0"
        : finishing === "rose_gold"
        ? "#E0A9AF"
        : "#38BDF8";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 964, 580);
    ctx.strokeRect(38, 38, 948, 564);

    // Luxury Emblem & Branding
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 44px 'Cinzel', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText("L'ARTISAN IMPRIMEUR", 512, 260);

    ctx.font = "600 20px 'Montserrat', sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("ATELIER D'EXCEPTION & FINITIONS RAFFINÉES", 512, 310);

    // Micro geometric pattern corners
    const drawCorner = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCorner(70, 70);
    drawCorner(954, 70);
    drawCorner(70, 570);
    drawCorner(954, 570);

    // Contact line
    ctx.font = "bold 18px 'Cairo', sans-serif";
    ctx.fillText(
      isRtl ? "جودة طباعة استثنائية • لمسات ذهبية ومخملية" : "ORAN • DORURE À CHAUD & VERNIS SÉLECTIF",
      512,
      500
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [finishing, cardBaseColor, isRtl]);

  // Frame loop for gentle rotation and gyroscope tilt
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Blend Gyroscope tilt with gentle animation
      const targetRotX = (gyroTilt.y * Math.PI) / 180 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
      const targetRotY = (gyroTilt.x * Math.PI) / 180 + Math.cos(state.clock.elapsedTime * 0.8) * 0.12;

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.08);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.08);
    }

    if (lightRef.current) {
      // Orbiting dynamic light that creates specular foil shine
      const t = state.clock.elapsedTime * 1.5;
      lightRef.current.position.x = Math.sin(t) * 3;
      lightRef.current.position.y = Math.cos(t) * 2;
    }
  });

  // Material tuning based on finishing type
  const materialProps = useMemo(() => {
    switch (finishing) {
      case "gold_foil":
        return {
          color: "#FFFFFF",
          roughness: 0.12,
          metalness: 0.88,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1,
        };
      case "silver_foil":
        return {
          color: "#F8FAFC",
          roughness: 0.08,
          metalness: 0.92,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        };
      case "rose_gold":
        return {
          color: "#FFDFE5",
          roughness: 0.14,
          metalness: 0.85,
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
        };
      case "spot_uv":
        return {
          color: "#FFFFFF",
          roughness: 0.65, // Matte card
          metalness: 0.15,
          clearcoat: 1.0, // Glossy selective varnish
          clearcoatRoughness: 0.02,
        };
      case "emboss":
        return {
          color: "#FFFFFF",
          roughness: 0.45,
          metalness: 0.05,
          clearcoat: 0.3,
          clearcoatRoughness: 0.2,
        };
      default:
        return { color: "#FFFFFF", roughness: 0.3, metalness: 0.1 };
    }
  }, [finishing]);

  return (
    <group ref={meshRef}>
      {/* Dynamic Specular Point Light */}
      <pointLight ref={lightRef} position={[0, 0, 3]} intensity={4} color="#FFF8E7" distance={8} />

      {/* 3D Business Card Mesh */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.4, 2.0, 0.04]} />
        <meshStandardMaterial attach="material-0" color={cardBaseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-1" color={cardBaseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-2" color={cardBaseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-3" color={cardBaseColor} roughness={0.7} />
        {/* Front Face with Luxury Foil Canvas */}
        <meshPhysicalMaterial
          attach="material-4"
          map={foilTexture || undefined}
          {...materialProps}
        />
        {/* Back Face */}
        <meshStandardMaterial attach="material-5" color={cardBaseColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

interface LuxuryFinishing3DProps {
  isRtl?: boolean;
}

export default function LuxuryFinishing3D({ isRtl = true }: LuxuryFinishing3DProps) {
  const [finishing, setFinishing] = useState<LuxuryFinishingType>("gold_foil");
  const [baseColor, setBaseColor] = useState<string>("#0f172a"); // Deep Navy Blue
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [gyroTilt, setGyroTilt] = useState({ x: 0, y: 0 });

  // Handle smartphone Gyroscope motion
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma: left to right (-90 to 90)
        // beta: front to back (-180 to 180)
        const tiltX = Math.min(25, Math.max(-25, e.gamma / 2));
        const tiltY = Math.min(25, Math.max(-25, (e.beta - 45) / 2));
        setGyroTilt({ x: tiltX, y: tiltY });
      }
    };

    if (gyroEnabled && typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, [gyroEnabled]);

  const requestGyroPermission = async () => {
    try {
      triggerHapticFeedback("light");
    } catch {}

    if (
      typeof window !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          setGyroEnabled(true);
          toast.success(isRtl ? "تم تفعيل حساس حركة الهاتف!" : "Capteur Gyroscope activé !");
        }
      } catch {
        toast.error(isRtl ? "تعذر تفعيل مستشعر الحركة" : "Erreur permission gyroscope");
      }
    } else {
      setGyroEnabled(!gyroEnabled);
      if (!gyroEnabled) {
        toast.success(isRtl ? "تم تفعيل تفاعل حركة الهاتف" : "Interaction gyroscope activée !");
      }
    }
  };

  const FINISHING_LIST: { id: LuxuryFinishingType; name: string; nameAr: string; desc: string; descAr: string; color: string }[] = [
    {
      id: "gold_foil",
      name: "Dorure à Chaud Or 24K",
      nameAr: "ذهب لامع 24K (Dorure Or)",
      desc: "Brillance métallique dorée prestigieuse.",
      descAr: "بريق ذهبي ملكي يعكس الضوء بدقة فائقة.",
      color: "#D4AF37",
    },
    {
      id: "silver_foil",
      name: "Dorure Argentée Miroir",
      nameAr: "فضة مرآتية (Dorure Argent)",
      desc: "Élégance chromée et reflets éclatants.",
      descAr: "انعكاس فضي راقٍ يلفت الأنظار للشعارات الاحترافية.",
      color: "#E2E8F0",
    },
    {
      id: "rose_gold",
      name: "Dorure Rose Gold",
      nameAr: "ذهب وردي (Rose Gold)",
      desc: "Idéal pour parfumeries, mode et cosmétiques.",
      descAr: "لمسة ناعمة وعصرية لصالونات التجميل وماركات الأزياء.",
      color: "#E0A9AF",
    },
    {
      id: "spot_uv",
      name: "Vernis Sélectif UV Relief",
      nameAr: "ورنيش موضعي بارز (Vernis 3D)",
      desc: "Contraste saisissant entre fond mat et zones brillantes.",
      descAr: "تباين ملموس بين خلفية البطاقة المطفية واللمعان البارز للشعار.",
      color: "#38BDF8",
    },
    {
      id: "emboss",
      name: "Gaufrage / Embossage Relief",
      nameAr: "نقش بارز وغائر (Gaufrage)",
      desc: "Relief tactile et ombres portées élégantes.",
      descAr: "بروز حقيقي في الورق يُشعر العميل بفخامة علامتك بمجرد اللمس.",
      color: "#CBD5E1",
    },
  ];

  const CARD_BACKGROUNDS = [
    { label: "Noir Intense (Mat Soft-Touch)", color: "#0f172a" },
    { label: "Bleu Nuit Prestige", color: "#1e1b4b" },
    { label: "Vert Émeraude Sombre", color: "#064e3b" },
    { label: "Bordeaux Impérial", color: "#4c0519" },
    { label: "Blanc Pur Coton", color: "#f8fafc" },
  ];

  return (
    <div className="ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={14} />
            {isRtl ? "محاكي التشطيبات الفاخرة ثلاثي الأبعاد" : "Simulateur 3D de Finitions de Luxe"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? "اختبر بريق الذهب والملمس المخملي قبل الطباعة" : "Rendu Photo-Réaliste WebGL"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? "حرّك الماوس أو أمِل هاتفك لمشاهدة انعكاس بريق الذهب والورنيش البارز بالزمن الحقيقي."
              : "Inclinez votre téléphone ou déplacez le curseur pour apprécier les reflets de dorure et vernis 3D."}
          </p>
        </div>

        {/* Gyroscope toggle for smartphone */}
        <button
          type="button"
          onClick={requestGyroPermission}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md shrink-0 ${
            gyroEnabled
              ? "bg-emerald-600 text-white shadow-emerald-600/20"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <Smartphone size={16} className={gyroEnabled ? "animate-bounce" : ""} />
          {gyroEnabled
            ? (isRtl ? "حساس الهاتف: نشط ✓" : "Gyroscope : Actif ✓")
            : (isRtl ? "تفعيل إمالة الهاتف" : "Activer Gyroscope")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* 3D WebGL Canvas Viewport */}
        <div className="lg:col-span-7 h-80 sm:h-[420px] rounded-3xl bg-radial from-slate-800 to-slate-950 shadow-2xl relative overflow-hidden border border-slate-700/50">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold animate-pulse">
                {isRtl ? "جاري تجهيز بيئة المحاكاة 3D..." : "Chargement de la scène 3D..."}
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 0, 4.2], fov: 45 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={1.2} />
              <Environment preset="city" />

              <LuxuryCardMesh
                finishing={finishing}
                cardBaseColor={baseColor}
                isRtl={isRtl}
                gyroTilt={gyroTilt}
              />

              <ContactShadows
                position={[0, -1.3, 0]}
                opacity={0.65}
                scale={6}
                blur={2.4}
                far={4}
                color="#000000"
              />

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 1.5}
                minAzimuthAngle={-Math.PI / 3}
                maxAzimuthAngle={Math.PI / 3}
              />
            </Canvas>
          </Suspense>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-[10px] text-slate-400 pointer-events-none px-2">
            <span>{isRtl ? "اسحب للدوران ثلاثي الأبعاد" : "Glissez pour faire pivoter"}</span>
            <span className="font-mono">{finishing.toUpperCase()}</span>
          </div>
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Select Finishings */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              {isRtl ? "1. نوع اللمسة الفنية الفاخرة" : "1. Finition de Luxe"}
            </span>

            <div className="space-y-2">
              {FINISHING_LIST.map((item) => {
                const isSelected = item.id === finishing;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      try {
                        triggerHapticFeedback("light");
                      } catch {}
                      setFinishing(item.id);
                    }}
                    className={`w-full p-3.5 rounded-2xl text-start transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-accent shadow-md shadow-accent/10"
                        : "bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:bg-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-black/10"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white block">
                          {isRtl ? item.nameAr : item.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {isRtl ? item.descAr : item.desc}
                        </span>
                      </div>
                    </div>

                    {isSelected && <Check size={18} className="text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Card Base Material Color */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              {isRtl ? "2. لون الورق الأساسي (Soft-Touch)" : "2. Couleur du Support de Base"}
            </span>

            <div className="flex flex-wrap gap-2.5">
              {CARD_BACKGROUNDS.map((bg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBaseColor(bg.color)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    baseColor === bg.color
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: bg.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
