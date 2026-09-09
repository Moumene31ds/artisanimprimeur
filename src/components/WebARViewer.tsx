"use client";

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { 
  X, Camera, RotateCcw, ZoomIn, ZoomOut, Zap, ZapOff, 
  Sparkles, Check, Share2, Download, Maximize2, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";
import type { LuxuryFinishingType } from "@/components/LuxuryFinishing3D";

export type ARModelType = "card" | "mug" | "box" | "tshirt" | "poster";

interface WebARViewerProps {
  isOpen: boolean;
  onClose: () => void;
  modelType?: ARModelType;
  modelColor?: string;
  finishing?: LuxuryFinishingType;
  textureUrl?: string;
  isRtl?: boolean;
}

// 3D Models tailored for AR ground projection
function ARCardModel({ finishing = "gold_foil", baseColor = "#0f172a", isRtl = true }: { finishing?: LuxuryFinishingType; baseColor?: string; isRtl?: boolean }) {
  const meshRef = useRef<THREE.Group>(null);

  const foilTexture = useMemo(() => {
    if (typeof window === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 640);

    ctx.strokeStyle =
      finishing === "gold_foil" ? "#D4AF37" :
      finishing === "silver_foil" ? "#E2E8F0" :
      finishing === "rose_gold" ? "#E0A9AF" : "#38BDF8";
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 964, 580);
    ctx.strokeRect(40, 40, 944, 560);

    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 44px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("L'ARTISAN IMPRIMEUR", 512, 260);

    ctx.font = "600 20px 'Montserrat', sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("ATELIER D'EXCEPTION • ORAN", 512, 310);

    ctx.font = "bold 20px 'Cairo', sans-serif";
    ctx.fillText(isRtl ? "مطبوعات فاخرة • بريق ذهبي 24K" : "ÉDITION DE LUXE & DORURE", 512, 500);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [finishing, baseColor, isRtl]);

  const matProps = useMemo(() => {
    switch (finishing) {
      case "gold_foil": return { roughness: 0.1, metalness: 0.9, clearcoat: 0.9 };
      case "silver_foil": return { roughness: 0.08, metalness: 0.95, clearcoat: 1.0 };
      case "rose_gold": return { roughness: 0.12, metalness: 0.85, clearcoat: 0.8 };
      case "spot_uv": return { roughness: 0.6, metalness: 0.15, clearcoat: 1.0 };
      default: return { roughness: 0.3, metalness: 0.1 };
    }
  }, [finishing]);

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 1.8, 0.04]} />
        <meshStandardMaterial attach="material-0" color={baseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-1" color={baseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-2" color={baseColor} roughness={0.7} />
        <meshStandardMaterial attach="material-3" color={baseColor} roughness={0.7} />
        <meshPhysicalMaterial attach="material-4" map={foilTexture || undefined} {...matProps} />
        <meshStandardMaterial attach="material-5" color={baseColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

function ARMugModel({ baseColor = "#ffffff" }: { baseColor?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 2.2, 48]} />
        <meshStandardMaterial color={baseColor} roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.5, 0.12, 16, 64, Math.PI]} />
        <meshStandardMaterial color={baseColor} roughness={0.15} metalness={0.05} />
      </mesh>
    </group>
  );
}

function ARBoxModel({ baseColor = "#1e293b" }: { baseColor?: string }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[2.2, 1.5, 1.5]} />
      <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

function ARTshirtModel({ baseColor = "#ffffff" }: { baseColor?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.0, 2.6, 0.2]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>
      <mesh position={[-1.2, 0.8, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.45, 0.8, 0.18]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>
      <mesh position={[1.2, 0.8, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.45, 0.8, 0.18]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>
    </group>
  );
}

function ARPosterModel({ baseColor = "#ffffff" }: { baseColor?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.0, 2.8, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.85, 2.65]} />
        <meshStandardMaterial color={baseColor} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function WebARViewer({
  isOpen,
  onClose,
  modelType = "card",
  modelColor = "#0f172a",
  finishing = "gold_foil",
  textureUrl,
  isRtl = true,
}: WebARViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // AR Transform States
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1.0);
  const [rotationY, setRotationY] = useState<number>(0);
  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Multi-touch tracking refs
  const touchStartRef = useRef<{
    touches: { x: number; y: number }[];
    initialDistance: number;
    initialAngle: number;
    initialScale: number;
    initialRotation: number;
    initialPos: { x: number; y: number };
  }>({
    touches: [],
    initialDistance: 0,
    initialAngle: 0,
    initialScale: 1.0,
    initialRotation: 0,
    initialPos: { x: 0, y: 0 },
  });

  // Start back environment camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Check for torch/flashlight capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      toast.success(isRtl ? "تم تشغيل كاميرا الواقع المعزز بنجاح!" : "Caméra AR activée avec succès !");
    } catch (err: any) {
      console.warn("Camera AR init error:", err);
      setCameraError(
        isRtl
          ? "يرجى منح إذن الوصول إلى الكاميرا لمعاينة المنتج في مساحتك الحقيقية."
          : "Veuillez autoriser l'accès à la caméra pour afficher le produit dans votre espace."
      );
    }
  }, [isRtl]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
      try { triggerHapticFeedback("light"); } catch {}
    } catch {
      toast.error(isRtl ? "مصباح الفلاش غير مدعوم في هذا الجهاز" : "Flash non supporté");
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
      setIsPlaced(false);
      setPosition({ x: 0, y: 0 });
      setScale(1.0);
      setRotationY(0);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Touch Gesture Handlers (Single finger pan, 2-finger pinch zoom, 2-finger twist rotation)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current.touches = [{ x: t.clientX, y: t.clientY }];
      touchStartRef.current.initialPos = { ...position };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

      touchStartRef.current.initialDistance = dist;
      touchStartRef.current.initialAngle = angle;
      touchStartRef.current.initialScale = scale;
      touchStartRef.current.initialRotation = rotationY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const start = touchStartRef.current.touches[0];
      if (!start) return;

      const deltaX = (t.clientX - start.x) / 100;
      const deltaY = -(t.clientY - start.y) / 100;

      setPosition({
        x: Math.max(-2.5, Math.min(2.5, touchStartRef.current.initialPos.x + deltaX)),
        y: Math.max(-2.5, Math.min(2.5, touchStartRef.current.initialPos.y + deltaY)),
      });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

      // Pinch Scale
      if (touchStartRef.current.initialDistance > 0) {
        const factor = dist / touchStartRef.current.initialDistance;
        const newScale = Math.max(0.35, Math.min(3.0, touchStartRef.current.initialScale * factor));
        setScale(newScale);
      }

      // Twist Rotation
      const deltaAngle = angle - touchStartRef.current.initialAngle;
      setRotationY(touchStartRef.current.initialRotation + deltaAngle);
    }
  };

  // True 1:1 Scale calibration
  const resetToTrueScale = () => {
    try { triggerHapticFeedback("medium"); } catch {}
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
    setRotationY(0);
    toast.info(isRtl ? "تم ضبط الحجم الطبيعي 1:1 في الواقع" : "Échelle réelle 1:1 calibrée");
  };

  // Merge Camera + Three.js Canvas snapshot
  const captureARPhoto = async () => {
    setIsCapturing(true);
    try { triggerHapticFeedback("heavy"); } catch {}

    try {
      const video = videoRef.current;
      const webglCanvas = containerRef.current?.querySelector("canvas");

      if (!video || !webglCanvas) {
        toast.error("Échec de la capture");
        setIsCapturing(false);
        return;
      }

      const composite = document.createElement("canvas");
      composite.width = video.videoWidth || 1280;
      composite.height = video.videoHeight || 720;
      const ctx = composite.getContext("2d");

      if (!ctx) return;

      // 1. Draw video background
      ctx.drawImage(video, 0, 0, composite.width, composite.height);

      // 2. Overlay WebGL 3D Model
      ctx.drawImage(webglCanvas, 0, 0, composite.width, composite.height);

      // 3. Add Luxury Watermark & Badge
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.roundRect(composite.width - 340, composite.height - 85, 310, 60, 16);
      ctx.fill();

      ctx.fillStyle = "#D4AF37";
      ctx.font = "bold 20px 'Cinzel', serif";
      ctx.fillText("L'ARTISAN IMPRIMEUR", composite.width - 320, composite.height - 50);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "14px 'Cairo', sans-serif";
      ctx.fillText(isRtl ? "معاينة الواقع المعزز AR • وهران" : "Aperçu Réalité Augmentée AR", composite.width - 320, composite.height - 32);

      const dataUrl = composite.toDataURL("image/png");

      // Download
      const link = document.createElement("a");
      link.download = `Artisan_AR_Preview_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(isRtl ? "تم حفظ لقطة الواقع المعزز بنجاح!" : "Photo AR enregistrée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "تعذر التقاط الصورة" : "Erreur de capture");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col justify-between select-none">
      {/* 1. Camera Passthrough Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
      />

      {/* Fallback if Camera Permission Denied or Unavailable */}
      {!cameraActive && (
        <div className="absolute inset-0 z-15 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
            <Camera size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-2">
            {isRtl ? "كاميرا الواقع المعزز (Web-AR)" : "Caméra de Réalité Augmentée"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            {cameraError || (isRtl ? "جاري تشغيل كاميرا الهاتف الخلفية لمطابقة الأبعاد الواقعية..." : "Initialisation du flux caméra...")}
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xl flex items-center gap-2"
          >
            <Camera size={16} />
            {isRtl ? "إعادة محاولة تفعيل الكاميرا" : "Autoriser la caméra"}
          </button>
        </div>
      )}

      {/* 2. Interactive Three.js AR Canvas Layer with Gestures */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="absolute inset-0 w-full h-full z-20 cursor-grab active:cursor-grabbing touch-none"
      >
        <Canvas
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: [0, 1.2, 3.8], fov: 45 }}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 8, 5]} intensity={2.2} castShadow />
          <Environment preset="city" />

          <group position={[position.x, position.y, 0]} scale={[scale, scale, scale]} rotation={[0.2, rotationY, 0]}>
            <Suspense fallback={null}>
              {modelType === "card" && (
                <ARCardModel finishing={finishing} baseColor={modelColor} isRtl={isRtl} />
              )}
              {modelType === "mug" && <ARMugModel baseColor={modelColor} />}
              {modelType === "box" && <ARBoxModel baseColor={modelColor} />}
              {modelType === "tshirt" && <ARTshirtModel baseColor={modelColor} />}
              {modelType === "poster" && <ARPosterModel baseColor={modelColor} />}
            </Suspense>

            {/* Realistic Contact Shadow on invisible surface */}
            <ContactShadows
              position={[0, -1.0, 0]}
              opacity={0.7}
              scale={5}
              blur={2.0}
              far={3}
              color="#000000"
            />
          </group>
        </Canvas>
      </div>

      {/* 3. Real-World Surface Reticle Guide Indicator (Animates on load) */}
      <div className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center">
        {!isPlaced && (
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-48 h-24 rounded-full border-2 border-dashed border-amber-400/70 shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center justify-center transform rotate-X-60">
              <Sparkles size={20} className="text-amber-400 animate-spin" />
            </div>
            <span className="text-[11px] font-black text-white bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
              {isRtl ? "وجّه الكاميرا لسطح مستوٍ (مكتب / طاولة)" : "Pointez vers une surface plane"}
            </span>
          </div>
        )}
      </div>

      {/* 4. Top Header HUD Controls */}
      <div className="relative z-30 w-full p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
          title={isRtl ? "إغلاق الواقع المعزز" : "Fermer"}
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-widest text-amber-400 uppercase bg-black/70 backdrop-blur-md border border-amber-500/30 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Web-AR Pro
          </span>

          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                torchOn ? "bg-amber-400 text-slate-950 border-amber-300" : "bg-black/60 border-white/20 text-white"
              }`}
              title={isRtl ? "المصباح" : "Flash"}
            >
              {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* 5. Bottom Interactive Controls HUD */}
      <div className="relative z-30 w-full max-w-lg mx-auto p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col items-center gap-4 rounded-t-[2.5rem] pointer-events-auto border-t border-white/10">
        {/* Scale & Calibrate Bar */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/15">
          <button
            onClick={() => {
              try { triggerHapticFeedback("light"); } catch {}
              setScale((s) => Math.max(0.4, s - 0.15));
            }}
            className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center font-black active:scale-90"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <span className="text-xs font-black text-slate-200 font-mono min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => {
              try { triggerHapticFeedback("light"); } catch {}
              setScale((s) => Math.min(2.8, s + 0.15));
            }}
            className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center font-black active:scale-90"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <div className="h-5 w-px bg-white/20 mx-1" />

          <button
            onClick={resetToTrueScale}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-black border border-amber-500/30 transition-all active:scale-95"
            title={isRtl ? "الحجم الحقيقي 1:1" : "Échelle 1:1"}
          >
            <RotateCcw size={13} />
            <span>1:1</span>
          </button>
        </div>

        {/* Action Buttons: Snapshot + Placement confirmation */}
        <div className="flex items-center justify-between w-full px-2">
          <div className="text-start">
            <span className="text-[10px] font-bold text-slate-400 block">
              {isRtl ? "حرّك بإصبعك للسحب والتدوير" : "Glissez pour déplacer / pivoter"}
            </span>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              {modelType === "card" ? (finishing ? finishing.replace("_", " ") : "Business Card") : modelType}
            </span>
          </div>

          {/* Shutter Capture Button */}
          <button
            onClick={captureARPhoto}
            disabled={isCapturing}
            className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-2xl flex items-center justify-center text-slate-900 active:scale-90 transition-transform hover:bg-slate-100"
            title={isRtl ? "التقاط صورة للواقع المعزز" : "Prendre une photo"}
          >
            <Camera size={26} className={isCapturing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
