"use client";

import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Sparkles, Upload, Camera, RotateCw, Lightbulb, 
  Layers, Package, Check, RefreshCw, Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useAppStore } from "@/lib/store";

// Preset textures for testing
const PRESETS = [
  { name: "Logo P1", url: "https://lesgommettesfrancaises.com/wp-content/uploads/2024/01/GF506-stickers-joyeux-anniversaire-personnalise-gommettes-francaises.jpg" },
  { name: "Design Retro", url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80&w=800" },
  { name: "Minimalist", url: "https://img.magnific.com/psd-gratuit/modele-conception-carte-visite-professionnelle_47987-19617.jpg?semt=ais_hybrid&w=740&q=80" }
];

type MaterialType = 'matte' | 'glossy' | 'holographic' | 'gold';
type ModelType = 'mug' | 'tshirt' | 'box' | 'poster' | 'card';

// Helper component to enable canvas export
function CanvasCaptureHelper({ triggerCapture, onCaptureComplete }: { triggerCapture: boolean; onCaptureComplete: (url: string) => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (triggerCapture) {
      // Force render to ensure correct snapshot
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      onCaptureComplete(dataUrl);
    }
  }, [triggerCapture, gl, scene, camera, onCaptureComplete]);

  return null;
}

// يعيد الرسم عند أي تغيير في خصائص المشهد (ضروري مع frameloop="demand")
function InvalidateOnRender() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); });
  return null;
}

// مشغّل دوران تلقائي اقتصادي (~20fps بدل 60fps) — لا يرسم شيئاً عند التوقف
function AutoSpinDriver({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => invalidate(), 50);
    return () => window.clearInterval(id);
  }, [active, invalidate]);
  return null;
}

// 3D MODELS WITH DYNAMIC MATERIALS

// 1. Mug Model
function ShowroomMug({ designUrl, material, modelColor }: { designUrl: string; material: MaterialType; modelColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = designUrl ? useTexture(designUrl) : null;
  
  if (texture) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1.2, 1);
    texture.offset.set(-0.1, 0);
  }

  // Adjust material specs based on selection
  const materialProps = {
    color: material === 'gold' ? "#D4AF37" : modelColor,
    roughness: material === 'matte' ? 0.8 : material === 'glossy' ? 0.05 : material === 'gold' ? 0.15 : 0.1,
    metalness: material === 'gold' ? 0.95 : material === 'holographic' ? 0.8 : 0.02,
    clearcoat: material === 'glossy' ? 1.0 : 0,
    clearcoatRoughness: 0.1,
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 2.4, 32]} />
        <meshPhysicalMaterial 
          {...materialProps} 
          map={texture || undefined}
        />
      </mesh>
      {/* Handle */}
      <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.55, 0.12, 16, 100, Math.PI]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
    </group>
  );
}

// 2. Box Model
function ShowroomBox({ designUrl, material, modelColor }: { designUrl: string; material: MaterialType; modelColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = designUrl ? useTexture(designUrl) : null;

  const materialProps = {
    color: material === 'gold' ? "#D4AF37" : modelColor,
    roughness: material === 'matte' ? 0.95 : material === 'glossy' ? 0.1 : material === 'gold' ? 0.25 : 0.2,
    metalness: material === 'gold' ? 0.9 : material === 'holographic' ? 0.75 : 0.01,
  };

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[2.4, 1.6, 1.6]} />
      <meshPhysicalMaterial 
        {...materialProps} 
        map={texture || undefined}
      />
    </mesh>
  );
}

// 3. Tshirt Model
function ShowroomTshirt({ designUrl, material, modelColor }: { designUrl: string; material: MaterialType; modelColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = designUrl ? useTexture(designUrl) : null;

  const materialProps = {
    color: material === 'gold' ? "#D4AF37" : modelColor,
    roughness: material === 'matte' ? 0.98 : 0.7,
    metalness: material === 'gold' ? 0.6 : 0,
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.2, 3, 0.22]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      <mesh position={[-1.3, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      <mesh position={[1.3, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      {texture && (
        <mesh position={[0, 0.3, 0.12]}>
          <planeGeometry args={[1.2, 1.4]} />
          <meshPhysicalMaterial 
            map={texture} 
            transparent={true} 
            polygonOffset={true}
            polygonOffsetFactor={-2}
            roughness={0.8}
            metalness={material === 'gold' ? 0.8 : 0}
          />
        </mesh>
      )}
    </group>
  );
}

// 4. Poster Model
function ShowroomPoster({ designUrl, material, modelColor }: { designUrl: string; material: MaterialType; modelColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = designUrl ? useTexture(designUrl) : null;

  const paperProps = {
    roughness: material === 'matte' ? 0.95 : material === 'glossy' ? 0.05 : material === 'gold' ? 0.2 : 0.1,
    metalness: material === 'gold' ? 0.85 : material === 'holographic' ? 0.75 : 0.02,
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.15, 3.15, 0.12]} />
        <meshPhysicalMaterial color={modelColor} roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Paper print */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.98, 2.98]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          map={texture || undefined} 
          {...paperProps}
        />
      </mesh>
    </group>
  );
}

// 5. Carte de Visite (Business Card) Model
function ShowroomCard({ designUrl, material, modelColor }: { designUrl: string; material: MaterialType; modelColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = designUrl ? useTexture(designUrl) : null;

  const materialProps = {
    color: material === 'gold' ? "#D4AF37" : modelColor,
    roughness: material === 'matte' ? 0.9 : material === 'glossy' ? 0.05 : material === 'gold' ? 0.2 : 0.1,
    metalness: material === 'gold' ? 0.85 : material === 'holographic' ? 0.75 : 0.02,
    clearcoat: material === 'glossy' ? 1.0 : 0,
    clearcoatRoughness: 0.1,
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.15, 0, 0.05]}>
      {/* Card body — standard 85×55mm proportions */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.55, 1.65, 0.04]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>
      {/* Front face design */}
      {texture && (
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[2.55, 1.65]} />
          <meshPhysicalMaterial
            map={texture}
            transparent
            roughness={material === 'glossy' ? 0.05 : 0.8}
            metalness={material === 'gold' ? 0.8 : 0}
          />
        </mesh>
      )}
    </group>
  );
}

export default function ShowroomPage() {
  const { language } = useAppStore();
  const isRtl = language === 'ar';

  // --- States ---
  const [modelType, setModelType] = useState<ModelType>('mug');
  const [material, setMaterial] = useState<MaterialType>('matte');
  const [modelColor, setModelColor] = useState<string>('#ffffff');
  const [designUrl, setDesignUrl] = useState<string>(PRESETS[0].url);
  const [lightPreset, setLightPreset] = useState<'studio' | 'sunset' | 'neon'>('studio');
  
  // Capture states
  const [triggerCapture, setTriggerCapture] = useState(false);
  const [showARModal, setShowARModal] = useState(false);
  const [arShareUrl, setArShareUrl] = useState("");
  // الدوران التلقائي يتوقف نهائياً عند أول تفاعل — توفير كبير للمعالج والذاكرة
  const [autoSpin, setAutoSpin] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // استعادة إعدادات المشهد من رابط QR الممسوح ضوئياً (?model=&material=&color=&design=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("model");
      if (m === "mug" || m === "tshirt" || m === "box" || m === "poster" || m === "card") setModelType(m);
      const mat = params.get("material");
      if (mat === "matte" || mat === "glossy" || mat === "holographic" || mat === "gold") setMaterial(mat);
      const color = params.get("color");
      if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) setModelColor(color);
      const design = params.get("design");
      if (design && /^https:\/\/.{1,1900}$/.test(design)) setDesignUrl(design);
    } catch {
      // تجاهل روابط غير صالحة
    }
  }, []);

  // توليد رابط مشاركة حقيقي لنفس إعدادات المشهد عند فتح النافذة
  useEffect(() => {
    if (!showARModal) return;
    try {
      const params = new URLSearchParams();
      params.set("model", modelType);
      params.set("material", material);
      params.set("color", modelColor);
      // روابط blob: المحلية لا تعمل على الهاتف — نشارك الروابط العامة فقط
      if (/^https?:\/\//.test(designUrl)) params.set("design", designUrl);
      setArShareUrl(`${window.location.origin}/showroom?${params.toString()}`);
    } catch {
      setArShareUrl("");
    }
  }, [showARModal, modelType, material, modelColor, designUrl]);

  // Handle design texture upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // تحرير رابط blob السابق إن وجد لمنع تراكم الذاكرة
      if (designUrl.startsWith("blob:")) URL.revokeObjectURL(designUrl);
      const url = URL.createObjectURL(file);
      setDesignUrl(url);
      toast.success(isRtl ? "تم تطبيق التصميم الجديد!" : "Design appliqué avec succès !");
    }
  };

  // Run snapshot export
  const takeSnapshot = () => {
    setTriggerCapture(true);
  };

  const handleCaptureComplete = async (dataUrl: string) => {
    setTriggerCapture(false);

    // Auto download image
    const link = document.createElement("a");
    link.download = `Artisan_Showroom_${modelType}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    toast.success(isRtl ? "تم حفظ لقطة الشاشة للمنتج!" : "Capture d'écran enregistrée !");

    // تسويق مجاني: مشاركة اللقطة أولاً بأول (Web Share مع ملفات)
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `artisan-${modelType}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isRtl ? "تصميمي من الحرفي للطباعة" : "Mon design — L'Artisan Imprimeur",
          text: isRtl ? "شاهد تصميمي المطبوع ثلاثي الأبعاد! 🎨" : "Regardez mon design imprimé en 3D ! 🎨",
        });
      }
    } catch {
      // المستخدم ألغى المشاركة أو غير مدعوم — التحميل تم بالفعل
    }
  };

  return (
    <div className={`max-w-6xl mx-auto pb-24 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      <header className="mb-10 text-center md:text-start flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-2.5 inline-block border border-indigo-200 dark:border-indigo-900">
            <Sparkles size={12} className="inline mr-1" /> {isRtl ? "صالة العرض الرقمية الحصرية" : "Showroom 3D Interactif"}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRtl ? "استوديو وصالة العرض ثلاثية الأبعاد الفاخرة" : "Studio d'Exposition 3D Premium"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
            {isRtl 
              ? "تفحص تصاميمك المطبوعة على مجسمات حقيقية، عدّل المواد الخام كالتذهيب البارز والهولوغرام واللمعان، والتقط صورا احترافية."
              : "Personnalisez des maquettes 3D, choisissez des textures (vernis, dorure) et capturez des photos en haute définition."}
          </p>
        </div>
        <Link href="/" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black transition-transform">
          {isRtl ? "عودة للرئيسية" : "Retour"}
        </Link>
      </header>

      {/* Showroom Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: 3D interactive Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden relative border border-slate-200 dark:border-slate-850 shadow-inner">
            
            <Canvas
              shadows
              frameloop="demand"
              dpr={[1, 1.5]}
              gl={{ preserveDrawingBuffer: true }}
              camera={{ position: [0, 1.5, 4.5], fov: 45 }}
            >
              <InvalidateOnRender />
              <AutoSpinDriver active={autoSpin} />
              <ambientLight intensity={lightPreset === 'neon' ? 0.2 : 0.65} />
              
              {/* Studio Lights */}
              {lightPreset === 'studio' && (
                <>
                  <spotLight position={[8, 8, 8]} angle={0.2} penumbra={1} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
                  <directionalLight position={[-5, 5, -5]} intensity={0.4} />
                </>
              )}

              {/* Warm Sunset Lights */}
              {lightPreset === 'sunset' && (
                <>
                  <directionalLight position={[5, 5, 5]} color="#f59e0b" intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
                  <directionalLight position={[-5, 2, -5]} color="#ec4899" intensity={0.5} />
                </>
              )}

              {/* Cyber Neon Lights */}
              {lightPreset === 'neon' && (
                <>
                  <pointLight position={[3, 2, 2]} color="#06b6d4" intensity={3} />
                  <pointLight position={[-3, 2, 2]} color="#ec4899" intensity={3} />
                  <directionalLight position={[0, 4, 0]} color="#8b5cf6" intensity={1} />
                </>
              )}
              
              <Suspense fallback={null}>
                <Center>
                  {modelType === 'mug' && <ShowroomMug designUrl={designUrl} material={material} modelColor={modelColor} />}
                  {modelType === 'box' && <ShowroomBox designUrl={designUrl} material={material} modelColor={modelColor} />}
                  {modelType === 'tshirt' && <ShowroomTshirt designUrl={designUrl} material={material} modelColor={modelColor} />}
                  {modelType === 'poster' && <ShowroomPoster designUrl={designUrl} material={material} modelColor={modelColor} />}
                  {modelType === 'card' && <ShowroomCard designUrl={designUrl} material={material} modelColor={modelColor} />}
                </Center>
                
                {/* Dynamically adjust environment map reflection */}
                <Environment preset="studio" />
                <ContactShadows position={[0, -1.6, 0]} opacity={0.4} scale={8} blur={2} far={4} />
                
                <CanvasCaptureHelper triggerCapture={triggerCapture} onCaptureComplete={handleCaptureComplete} />
              </Suspense>
              
              <OrbitControls
                enableZoom={true}
                enablePan={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 1.6}
                onStart={() => setAutoSpin(false)}
              />
            </Canvas>

            {/* Canvas Actions floating */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between pointer-events-none">
              <button 
                onClick={takeSnapshot}
                className="pointer-events-auto px-5 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-black text-xs shadow-md border border-slate-200/40 dark:border-slate-700/40 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Camera size={14} />
                {isRtl ? "التقاط صورة بجودة عالية" : "Prendre une photo"}
              </button>
              
              <button 
                onClick={() => setShowARModal(true)}
                className="pointer-events-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Smartphone size={14} />
                {isRtl ? "عرض في الواقع المعزز AR" : "Simuler en AR"}
              </button>
            </div>

            {/* Rotate guide */}
            <div className="absolute top-6 left-6 pointer-events-none bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-wider">
              {isRtl ? "اسحب لتدوير المجسم 360°" : "Faites glisser pour tourner 360°"}
            </div>

          </div>

        </div>

        {/* Right Side: Customizer Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-xl flex flex-col justify-between h-full space-y-6">
            
            {/* Model Type Selector */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Package size={14} className="text-indigo-500" />
                {isRtl ? "1. اختر مجسم المنتج :" : "1. Choisir le produit :"}
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'mug', label: isRtl ? 'كوب سحري' : 'Mug', icon: "☕" },
                  { id: 'box', label: isRtl ? 'علبة كرتون' : 'Packaging', icon: "📦" },
                  { id: 'tshirt', label: isRtl ? 'قميص قطني' : 'T-Shirt', icon: "👕" },
                  { id: 'poster', label: isRtl ? 'ملصق مع إطار' : 'Poster', icon: "🖼️" },
                  { id: 'card', label: isRtl ? 'كارت فيزيت' : 'Carte Visite', icon: "💳" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setModelType(item.id as ModelType)}
                    className={`py-3.5 px-3 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                      modelType === item.id 
                        ? 'bg-slate-900 dark:bg-accent border-transparent text-white shadow-md' 
                        : 'bg-white/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-lg mb-1">{item.icon}</span>
                    <span className="text-[10px] font-black">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Material & Finish */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-500" />
                {isRtl ? "2. ملمس المطبوع والخامة :" : "2. Texture & Finition :"}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'matte', label: isRtl ? 'ورق مطفأ' : 'Matte Paper', desc: isRtl ? 'بدون انعكاس' : 'Sans reflet' },
                  { id: 'glossy', label: isRtl ? 'طلاء لامع' : 'Glossy Varnished', desc: isRtl ? 'انعكاس عال' : 'Reflet élevé' },
                  { id: 'holographic', label: isRtl ? 'هولوغرام عاكس' : 'Holographic', desc: isRtl ? 'طيف قزحي' : 'Iridescent' },
                  { id: 'gold', label: isRtl ? 'تذهيب بارز' : 'Or Brillant (Gold)', desc: isRtl ? 'فخم جداً' : 'Dorure à chaud' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMaterial(item.id as MaterialType)}
                    className={`py-3 px-3.5 rounded-2xl border text-start flex flex-col justify-center transition-all ${
                      material === item.id 
                        ? 'bg-gradient-to-tr from-indigo-500/25 to-blue-500/25 border-indigo-500 text-indigo-600 dark:text-accent shadow-sm' 
                        : 'bg-white/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-[10px] font-black flex items-center gap-1.5">
                      {material === item.id && <Check size={10} />}
                      {item.label}
                    </span>
                    <span className="text-[8px] opacity-70 font-semibold mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Design Uploader */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Upload size={14} className="text-indigo-500" />
                {isRtl ? "3. ارفع شعارك أو تصميمك :" : "3. Charger votre image/design :"}
              </h3>
              <div className="flex gap-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={14} />
                  {isRtl ? "اختر صورة التصميم" : "Téléverser image"}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Environment Lighting Preset */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Lightbulb size={14} className="text-indigo-500" />
                {isRtl ? "4. إضاءة الخلفية والاستوديو :" : "4. Éclairage du Studio :"}
              </h3>
              <div className="flex gap-2">
                {[
                  { id: 'studio', label: isRtl ? 'استوديو' : 'Studio', icon: "💡" },
                  { id: 'sunset', label: isRtl ? 'غروب' : 'Warm', icon: "🌅" },
                  { id: 'neon', label: isRtl ? 'نيون' : 'Neon', icon: "🌃" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setLightPreset(item.id as any)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      lightPreset === item.id
                        ? 'bg-slate-900 dark:bg-accent border-transparent text-white'
                        : 'bg-white/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Base Color */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                {isRtl ? "لون المنتج الأساسي :" : "Couleur de base du produit :"}
              </h3>
              <div className="flex gap-2">
                {['#ffffff', '#0f172a', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                  <button
                    key={c}
                    onClick={() => setModelColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${modelColor === c ? 'scale-110 border-indigo-500' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* AR Modal simulation overlay */}
      <AnimatePresence>
        {showARModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
              
              <Smartphone size={48} className="text-indigo-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-black text-slate-850 dark:text-white mb-2">
                {isRtl ? "الواقع المعزز في غرفتك" : "Visualiser en Web-AR"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold leading-relaxed">
                {isRtl 
                  ? "امسح الكود بهاتفك لفتح نفس التصميم ثلاثي الأبعاد (المجسم، الخامة، اللون والتصميم) على شاشة هاتفك مباشرة!"
                  : "Scannez ce code pour ouvrir exactement cette maquette 3D (modèle, matériau, couleur et design) sur votre mobile !"}
              </p>

              {/* QR حقيقي (مولّد محلياً) يشير لنفس إعدادات المشهد */}
              <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-800 mb-6 shadow-inner">
                {arShareUrl ? (
                  <QRCodeSVG value={arShareUrl} size={144} level="M" />
                ) : (
                  <Smartphone size={40} className="text-slate-300 animate-pulse" />
                )}
              </div>

              <button 
                onClick={() => setShowARModal(false)}
                className="w-full bg-slate-900 dark:bg-accent text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-md"
              >
                {isRtl ? "متابعة" : "Fermer"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
