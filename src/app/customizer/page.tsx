"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { useAuth } from "@/context/AuthContext";
import { 
  Sparkles, Upload, Download, ShoppingCart, Camera, RotateCcw, 
  Type, Image as ImageIcon, Settings, Layers, Trash2, Plus, 
  Minus, Palette, Check, ArrowLeft, RefreshCw, Eye
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Center } from "@react-three/drei";
import * as THREE from "three";

// --- CUSTOM 3D CANVAS TEXTURE MAPPING COMPONENTS ---

// 3D Mug Mesh Mapping a live dynamic HTML <canvas> texture
function Mug3D({ canvasRef, baseColor }: { canvasRef: React.RefObject<HTMLCanvasElement | null>, baseColor: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (textureRef.current && canvasRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const texture = useMemo(() => {
    if (typeof window === "undefined" || !canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1.2, 1);
    tex.offset.set(-0.1, 0);
    textureRef.current = tex;
    return tex;
  }, [canvasRef]);

  return (
    <group ref={meshRef}>
      {/* Mug Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 2.4, 64]} />
        <meshStandardMaterial 
          color={baseColor} 
          map={texture || undefined}
          roughness={0.12} 
          metalness={0.08} 
        />
      </mesh>
      {/* Mug Handle */}
      <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.55, 0.12, 16, 100, Math.PI]} />
        <meshStandardMaterial color={baseColor} roughness={0.12} metalness={0.08} />
      </mesh>
    </group>
  );
}

// 3D Business Card Mesh mapping
function Card3D({ canvasRef, baseColor }: { canvasRef: React.RefObject<HTMLCanvasElement | null>, baseColor: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (textureRef.current && canvasRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const texture = useMemo(() => {
    if (typeof window === "undefined" || !canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current = tex;
    return tex;
  }, [canvasRef]);

  return (
    <group ref={meshRef}>
      {/* Business Card Mesh */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 1.8, 0.04]} />
        {/* Multimaterial: Front has design canvas texture, back has base color with logo */}
        <meshStandardMaterial attach="material-0" color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-1" color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-2" color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-3" color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-4" map={texture || undefined} roughness={0.25} metalness={0.05} /> {/* Front Face */}
        <meshStandardMaterial attach="material-5" color={baseColor} roughness={0.3} /> {/* Back Face */}
      </mesh>
    </group>
  );
}

// 3D T-Shirt Decal Mapping
function Tshirt3D({ canvasRef, baseColor }: { canvasRef: React.RefObject<HTMLCanvasElement | null>, baseColor: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (textureRef.current && canvasRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const texture = useMemo(() => {
    if (typeof window === "undefined" || !canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current = tex;
    return tex;
  }, [canvasRef]);

  return (
    <group ref={meshRef}>
      {/* Core Chest Box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 3, 0.22]} />
        <meshStandardMaterial color={baseColor} roughness={0.65} metalness={0.01} />
      </mesh>
      {/* Left Sleeve */}
      <mesh position={[-1.3, 0.9, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshStandardMaterial color={baseColor} roughness={0.65} />
      </mesh>
      {/* Right Sleeve */}
      <mesh position={[1.3, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshStandardMaterial color={baseColor} roughness={0.65} />
      </mesh>
      {/* Graphic Overlay mapped directly to dynamic Canvas */}
      {texture && (
        <mesh position={[0, 0.3, 0.12]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial 
            map={texture} 
            transparent={true} 
            polygonOffset={true}
            polygonOffsetFactor={-2}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  );
}

// 3D Packaging Box Mapping
function PackagingBox3D({ canvasRef, baseColor }: { canvasRef: React.RefObject<HTMLCanvasElement | null>, baseColor: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
    if (textureRef.current && canvasRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const texture = useMemo(() => {
    if (typeof window === "undefined" || !canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current = tex;
    return tex;
  }, [canvasRef]);

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 1.5, 1.5]} />
        {/* Mapping canvas on top and sides, solid on others */}
        <meshStandardMaterial attach="material-0" map={texture || undefined} color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-1" map={texture || undefined} color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-2" map={texture || undefined} color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-3" map={texture || undefined} color={baseColor} roughness={0.3} />
        <meshStandardMaterial attach="material-4" map={texture || undefined} roughness={0.25} metalness={0.05} />
        <meshStandardMaterial attach="material-5" map={texture || undefined} roughness={0.25} metalness={0.05} />
      </mesh>
    </group>
  );
}

// 3D Poster Mesh with Elegant Frame
function Poster3D({ canvasRef, baseColor }: { canvasRef: React.RefObject<HTMLCanvasElement | null>, baseColor: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
    }
    if (textureRef.current && canvasRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const texture = useMemo(() => {
    if (typeof window === "undefined" || !canvasRef.current) return null;
    const tex = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current = tex;
    return tex;
  }, [canvasRef]);

  return (
    <group ref={meshRef}>
      {/* Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.1, 3.0, 0.12]} />
        <meshStandardMaterial color={baseColor === "#ffffff" ? "#1e293b" : baseColor} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Paper print sheet showing custom dynamic Canvas */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.94, 2.84]} />
        <meshStandardMaterial 
          color="#ffffff" 
          map={texture || undefined} 
          roughness={0.45} 
          metalness={0.02} 
        />
      </mesh>
    </group>
  );
}

// --- CORE TRANSLATIONS FOR THE STUDIO PAGE ---
const STUDIO_T: { [key: string]: { [key: string]: string } } = {
  ar: {
    studioTitle: "استوديو التخصيص 3D والواقع المعزز",
    studioSubtitle: "صمّم منتجك مباشرة بالخطوط العربية والشعارات وعاين النتيجة في بيئتك عبر الكاميرا",
    selectProduct: "1. اختر المنتج الأساسي :",
    selectBaseColor: "2. لون المجسم الأساسي :",
    designSettings: "تخصيص التصميم والنسيج",
    textTab: "نصوص",
    imageTab: "شعار / صورة",
    bgTab: "خلفيات وتدرجات",
    arTab: "الواقع المعزز AR",
    optionsTab: "خيارات الطلب",
    enterText: "اكتب النص المراد طباعته:",
    addText: "إضافة نص جديد",
    textPosition: "موضع النص:",
    textSize: "حجم الخط:",
    textColor: "لون النص:",
    fontStyle: "نوع الخط العربي/اللاتيني:",
    uploadLogo: "ارفع شعارك الخاص أو صورة بدقة عالية:",
    logoScale: "تكبير/تصغير الشعار:",
    logoRotate: "دوران الشعار:",
    logoX: "إزاحة أفقية (X):",
    logoY: "إزاحة عمودية (Y):",
    chooseBg: "اختر خلفية التصميم الحيوية:",
    solidColor: "لون موحد",
    gradientColor: "تدرج لوني فاخر",
    launchAR: "تشغيل وضع كاميرا الواقع المعزز Web-AR",
    closeAR: "إغلاق الكاميرا والعودة للمعاينة ثلاثية الأبعاد",
    arInstruction: "قم بتوجيه الكاميرا إلى طاولتك أو مكتبك، واستخدم الماوس/التمرير لتدوير ووضع التصميم المطبوع بشكل طبيعي بالكامل!",
    arSupportError: "الكاميرا غير مدعومة أو تم رفض الإذن بالوصول إليها.",
    orderSettings: "تأكيد الطلب والكمية",
    quantity: "الكمية المطلوبة (كلما زادت الكمية قل السعر):",
    paperFinish: "نوع الورق / التشطيب التخصصي للطباعة:",
    paperMatte: "مات مخملي فاخر (Standard Matte 300g)",
    paperGlossy: "لامع براق كريستال (Luxury Glossy 350g)",
    paperEco: "ورق صديق للبيئة طبيعي (Eco Recycled 280g)",
    corners: "زوايا التصميم والقص:",
    cornersStraight: "زوايا قائمة كلاسيكية",
    cornersRounded: "زوايا دائرية عصرية قص ليزر (+200 د.ج)",
    insufficientLogo: "يرجى كتابة نص أو رفع صورة لتوليد التصميم الفاخر",
    addToCart: "إضافة التصميم ثلاثي الأبعاد إلى السلة",
    totalPrice: "السعر الإجمالي للكمية المخصصة:",
    discountApplied: "تم تطبيق خصم الكميات المتميزة:",
    loadingModel: "جاري شحن مجسم 3D الفاخر والمحرك..."
  },
  fr: {
    studioTitle: "Studio de Personnalisation 3D & Web-AR",
    studioSubtitle: "Créez votre design en temps réel, ajoutez des textes, logos et projetez en Réalité Augmentée",
    selectProduct: "1. Choisissez le produit de base :",
    selectBaseColor: "2. Couleur de base de l'objet :",
    designSettings: "Personnaliser le Design",
    textTab: "Textes",
    imageTab: "Logo / Image",
    bgTab: "Fonds & Textures",
    arTab: "Réalité Augmentée",
    optionsTab: "Options",
    enterText: "Saisissez votre texte :",
    addText: "Ajouter un texte",
    textPosition: "Position du texte :",
    textSize: "Taille du texte :",
    textColor: "Couleur du texte :",
    fontStyle: "Style de police :",
    uploadLogo: "Uploadez votre logo ou image HD :",
    logoScale: "Échelle du logo :",
    logoRotate: "Rotation du logo :",
    logoX: "Décalage horizontal (X) :",
    logoY: "Décalage vertical (Y) :",
    chooseBg: "Choisissez le fond de votre design :",
    solidColor: "Couleur unie",
    gradientColor: "Dégradé premium",
    launchAR: "Lancer le mode Réalité Augmentée (Web-AR)",
    closeAR: "Fermer la caméra & Retourner à la 3D",
    arInstruction: "Orientez votre caméra vers une table ou un bureau, et utilisez la souris pour faire tourner ou déplacer l'objet 3D comme s'il était réel !",
    arSupportError: "Caméra non supportée ou accès refusé.",
    orderSettings: "Options de commande",
    quantity: "Quantité souhaitée (Brackets de prix avantageux) :",
    paperFinish: "Type de papier / Finition d'impression :",
    paperMatte: "Mat Velouté (Standard Matte 300g)",
    paperGlossy: "Brillant Éclatant (Luxury Glossy 350g)",
    paperEco: "Écologique recyclé naturel (Eco Recycled 280g)",
    corners: "Coins et découpe :",
    cornersStraight: "Coins droits classiques",
    cornersRounded: "Coins arrondis découpe Laser (+200 DA)",
    insufficientLogo: "Veuillez écrire un texte ou uploader une image pour générer le design.",
    addToCart: "Ajouter le design 3D au Panier",
    totalPrice: "Prix total de la commande :",
    discountApplied: "Remise sur quantité appliquée :",
    loadingModel: "Chargement du modèle 3D haute fidélité..."
  }
};

// Available Products Setup
const PRODUCTS = [
  { id: "mug", nameAr: "كوب سيراميك فاخر", nameFr: "Mug en Céramique", basePrice: 1500, image: "https://lesgommettesfrancaises.com/wp-content/uploads/2024/01/GF506-stickers-joyeux-anniversaire-personnalise-gommettes-francaises.jpg" },
  { id: "card", nameAr: "بطاقات عمل بريميوم", nameFr: "Cartes de Visite Premium", basePrice: 2500, image: "https://img.magnific.com/psd-gratuit/modele-conception-carte-visite-professionnelle_47987-19617.jpg?semt=ais_hybrid&w=740&q=80" },
  { id: "box", nameAr: "علبة تغليف هدايا", nameFr: "Boîte Emballage Luxe", basePrice: 1800, image: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80&w=800" },
  { id: "tshirt", nameAr: "قميص قطني مصمم", nameFr: "T-Shirt Personnalisé", basePrice: 3200, image: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800" },
  { id: "poster", nameAr: "ملصق فني مؤطر", nameFr: "Poster d'Art Encadré", basePrice: 2800, image: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80&w=800" }
];

// Available base colors for the 3D meshes themselves
const BASE_COLORS = [
  { name: "White", code: "#ffffff" },
  { name: "Sleek Dark", code: "#1a1a1a" },
  { name: "Navy Blue", code: "#1e3a8a" },
  { name: "Luxury Gold", code: "#d4af37" },
  { name: "Ruby Red", code: "#b91c1c" }
];

// Available pre-made premium background gradients for the design canvas
const GRADIENTS = [
  { name: "Luxury Gold", value: "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)" },
  { name: "Midnight Purple", value: "linear-gradient(135deg, #3b0066, #11001c, #6b00b3)" },
  { name: "Emerald Mint", value: "linear-gradient(135deg, #0f5132, #198754, #d1e7dd)" },
  { name: "Neon Sunset", value: "linear-gradient(135deg, #ff007f, #7f00ff, #00ffff)" },
  { name: "Clean Slate", value: "linear-gradient(135deg, #e2e8f0, #cbd5e1, #94a3b8)" },
  { name: "Minimal Dark", value: "linear-gradient(135deg, #1e293b, #0f172a, #020617)" }
];

// Available premium typography fonts
const FONTS = [
  { name: "Cairo (Premium Arabic)", value: "Cairo" },
  { name: "Amiri (Elegant Naskh)", value: "Amiri" },
  { name: "Outfit (Geometric Sans)", value: "Outfit" },
  { name: "Inter (Modern Tech)", value: "Inter" },
  { name: "Playfair (Classic Serif)", value: "Playfair Display" },
  { name: "Arial (Standard)", value: "Arial" }
];

export default function CustomizerPage() {
  const { language } = useAppStore();
  const addToCart = useAppStore((state) => state.addToCart);
  
  const isRtl = language === "ar";
  const st = STUDIO_T[language];

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "image" | "bg" | "ar" | "options">("text");

  // --- STUDIO CUSTOMIZER STATES ---
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [modelBaseColor, setModelBaseColor] = useState(BASE_COLORS[0].code);

  // Background states
  const [bgType, setBgType] = useState<"solid" | "gradient">("solid");
  const [bgSolidColor, setBgSolidColor] = useState("#ffffff");
  const [bgGradientIndex, setBgGradientIndex] = useState(0);

  // Text layers states
  const [textLayers, setTextLayers] = useState<Array<{
    id: string;
    text: string;
    font: string;
    size: number;
    color: string;
    x: number;
    y: number;
    weight: string;
  }>>([
    { id: "t1", text: isRtl ? "مطبوعات الحرفي فاخرة" : "Premium L'Artisan", font: "Outfit", size: 38, color: "#1e293b", x: 256, y: 220, weight: "900" },
    { id: "t2", text: isRtl ? "جودة ذهبية 100%" : "Quality Guaranteed", font: "Cairo", size: 22, color: "#bf953f", x: 256, y: 280, weight: "bold" }
  ]);
  const [selectedTextId, setSelectedTextId] = useState("t1");

  // Logo / Image Upload states
  const [logoImageSrc, setLogoImageSrc] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(0.6);
  const [logoRotate, setLogoRotate] = useState(0);
  const [logoX, setLogoX] = useState(256);
  const [logoY, setLogoY] = useState(130);

  // Order Options states
  const [quantity, setQuantity] = useState(100);
  const [paperFinish, setPaperFinish] = useState("matte");
  const [cornersType, setCornersType] = useState("straight");

  // Live Camera Web-AR states
  const [isARActive, setIsARActive] = useState(false);
  const [arScale, setArScale] = useState(1);
  const [arError, setArError] = useState<string | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mounted checking
  useEffect(() => {
    setMounted(true);
    return () => {
      // Clean up camera streams if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Calculate customized price based on basePrice, quantity discount, and selections
  const unitPrice = useMemo(() => {
    let price = selectedProduct.basePrice;
    
    // finishing additions
    if (paperFinish === "glossy") price += 300;
    if (paperFinish === "eco") price += 150;
    if (cornersType === "rounded") price += 200;

    // Quantity discounts
    if (quantity >= 1000) {
      price = price * 0.80; // 20% off
    } else if (quantity >= 500) {
      price = price * 0.88; // 12% off
    } else if (quantity >= 250) {
      price = price * 0.94; // 6% off
    }

    return Math.round(price);
  }, [selectedProduct, quantity, paperFinish, cornersType]);

  const totalPrice = unitPrice * quantity;

  // Render/Redraw the dynamic 2D canvas texture
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw Background
    if (bgType === "solid") {
      ctx.fillStyle = bgSolidColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradientStyle = GRADIENTS[bgGradientIndex].value;
      // Convert linear gradient string into canvas linear gradient
      // Simple parse for luxury representation: linear-gradient(135deg, color1, color2, ...)
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (bgGradientIndex === 0) { // Gold gradient
        grad.addColorStop(0, "#bf953f");
        grad.addColorStop(0.25, "#fcf6ba");
        grad.addColorStop(0.5, "#b38728");
        grad.addColorStop(0.75, "#fbf5b7");
        grad.addColorStop(1, "#aa771c");
      } else if (bgGradientIndex === 1) { // Midnight
        grad.addColorStop(0, "#3b0066");
        grad.addColorStop(0.5, "#11001c");
        grad.addColorStop(1, "#6b00b3");
      } else if (bgGradientIndex === 2) { // Emerald
        grad.addColorStop(0, "#0f5132");
        grad.addColorStop(0.5, "#198754");
        grad.addColorStop(1, "#aef2d6");
      } else if (bgGradientIndex === 3) { // Neon Sunset
        grad.addColorStop(0, "#ff007f");
        grad.addColorStop(0.5, "#7f00ff");
        grad.addColorStop(1, "#00ffff");
      } else if (bgGradientIndex === 4) { // Clean slate
        grad.addColorStop(0, "#e2e8f0");
        grad.addColorStop(1, "#94a3b8");
      } else { // Minimal dark
        grad.addColorStop(0, "#1e293b");
        grad.addColorStop(1, "#020617");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Image/Logo if loaded
    if (logoImageSrc) {
      const img = new Image();
      img.src = logoImageSrc;
      // Draw image if cached/loaded, otherwise hook onload
      const drawImg = () => {
        ctx.save();
        ctx.translate(logoX, logoY);
        ctx.rotate((logoRotate * Math.PI) / 180);
        const w = img.width * logoScale;
        const h = img.height * logoScale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        
        // Redraw texts on top of image
        drawTexts(ctx);
      };
      
      if (img.complete) {
        drawImg();
      } else {
        img.onload = drawImg;
      }
    } else {
      drawTexts(ctx);
    }
  };

  const drawTexts = (ctx: CanvasRenderingContext2D) => {
    textLayers.forEach(layer => {
      ctx.save();
      ctx.fillStyle = layer.color;
      ctx.font = `${layer.weight} ${layer.size}px ${layer.font}, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(layer.text, layer.x, layer.y);
      ctx.restore();
    });
  };

  // Re-draw whenever canvas states update
  useEffect(() => {
    if (mounted) {
      // Slight delay to ensure custom fonts are loaded/rendered
      const timer = setTimeout(() => redrawCanvas(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    mounted, bgType, bgSolidColor, bgGradientIndex, 
    textLayers, logoImageSrc, logoScale, logoRotate, 
    logoX, logoY, selectedProduct
  ]);

  // Handle Logo Uploading
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoImageSrc(event.target.result as string);
        toast.success(isRtl ? "تم تحميل الشعار بنجاح!" : "Logo importé avec succès !");
      }
    };
    reader.readAsDataURL(file);
  };

  // Web-AR Camera stream Activation
  const startCameraAR = async () => {
    setArError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsARActive(true);
      setActiveTab("ar");
      toast.info(isRtl ? "تم تشغيل وضع الكاميرا! عاين المجسم الآن." : "Mode Réalité Augmentée activé !");
    } catch (err) {
      console.error(err);
      setArError(st.arSupportError);
      toast.error(isRtl ? "عذراً، فشل فتح الكاميرا" : "Échec de l'accès à la caméra");
    }
  };

  const stopCameraAR = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsARActive(false);
    setActiveTab("text");
  };

  // Add customized design to Zustand store Cart
  const handleAddToCart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Snapshot image to represent custom item
    const customImageSnapshot = canvas.toDataURL("image/png");

    const cartItem = {
      id: `custom-${selectedProduct.id}-${Date.now()}`,
      name: isRtl ? `تخصيص: ${selectedProduct.nameAr}` : `Custom: ${selectedProduct.nameFr}`,
      price: unitPrice,
      image: customImageSnapshot,
      category: "Customizer",
      basePrice: selectedProduct.basePrice,
      selectedOptions: {
        productType: selectedProduct.id,
        baseColor: modelBaseColor,
        paper: paperFinish,
        corners: cornersType,
        textCount: textLayers.length,
        hasImage: !!logoImageSrc,
        finition: isRtl 
          ? `كمية ${quantity} قطعة (${paperFinish === 'matte' ? 'مات' : paperFinish === 'glossy' ? 'لامع' : 'إيكو'})`
          : `${quantity} pcs (${paperFinish} finish, ${cornersType} corners)`
      }
    };

    addToCart(cartItem as any);
    
    // Confetti and notification
    toast.success(
      isRtl 
        ? "✨ تمت إضافة تصميمك المخصص ثلاثي الأبعاد إلى السلة بنجاح!" 
        : "✨ Votre design 3D personnalisé a été ajouté au panier !",
      { duration: 4000 }
    );
  };

  // Helpers to update text layers
  const updateSelectedText = (field: string, value: any) => {
    setTextLayers(prev => prev.map(t => {
      if (t.id === selectedTextId) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const currentTextLayer = textLayers.find(t => t.id === selectedTextId) || textLayers[0];

  if (!mounted) return null;

  return (
    <div className={`animate-fadeIn pb-24 ${isARActive ? "p-0 max-w-full m-0" : "max-w-7xl mx-auto px-4 sm:px-6"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Dynamic 2D canvas in absolute/hidden for texture creation */}
      <canvas 
        ref={canvasRef} 
        width={512} 
        height={512} 
        className="hidden" 
      />

      {/* Web-AR Fullscreen Elements */}
      {isARActive && (
        <div className="fixed inset-0 w-full h-full z-40 bg-black overflow-hidden flex flex-col items-center justify-between">
          
          {/* Camera Background Video stream */}
          <video 
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-10"
          />

          {/* transparent Three.js WebGL canvas over the video */}
          <div className="absolute inset-0 w-full h-full z-20 bg-transparent">
            <Canvas gl={{ alpha: true }} camera={{ position: [0, 1.5, 4.5], fov: 45 }}>
              <ambientLight intensity={0.8} />
              <spotLight position={[5, 10, 5]} angle={0.25} penumbra={1} intensity={1.5} />
              
              <Suspense fallback={null}>
                <Center>
                  <group scale={[arScale, arScale, arScale]}>
                    {selectedProduct.id === "mug" && <Mug3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                    {selectedProduct.id === "card" && <Card3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                    {selectedProduct.id === "tshirt" && <Tshirt3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                    {selectedProduct.id === "box" && <PackagingBox3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                    {selectedProduct.id === "poster" && <Poster3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                  </group>
                </Center>
              </Suspense>
              <OrbitControls enableZoom={true} enablePan={true} />
            </Canvas>
          </div>

          {/* Interactive AR HUD controls */}
          <div className="relative z-30 w-full p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
            <button 
              onClick={stopCameraAR}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2.5 rounded-full shadow-lg"
            >
              <ArrowLeft size={16} />
              {st.closeAR}
            </button>
            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-black/60 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Web-AR Simulator Active
            </span>
          </div>

          <div className="relative z-30 w-full max-w-md p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-center space-y-4 rounded-t-[2.5rem]">
            <p className="text-xs font-bold text-slate-200">{st.arInstruction}</p>
            
            <div className="flex items-center justify-center gap-6">
              {/* Scale Control */}
              <div className="flex items-center gap-2.5 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <button onClick={() => setArScale(prev => Math.max(0.4, prev - 0.15))} className="text-white text-xs font-black p-1">➖</button>
                <span className="text-white text-xs font-black select-none">AR Scale: {Math.round(arScale * 100)}%</span>
                <button onClick={() => setArScale(prev => Math.min(2.5, prev + 0.15))} className="text-white text-xs font-black p-1">➕</button>
              </div>

              {/* Reset Control */}
              <button 
                onClick={() => { setArScale(1); setModelBaseColor("#ffffff"); }}
                className="w-10 h-10 rounded-full bg-white/20 border border-white/15 flex items-center justify-center text-white"
                title="Reset model position"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="h-px bg-white/10 w-full" />
            <div className="flex items-center justify-between text-white">
              <div className="text-start">
                <h4 className="text-xs font-black text-slate-350">{isRtl ? selectedProduct.nameAr : selectedProduct.nameFr}</h4>
                <div className="text-sm font-black text-emerald-400">{totalPrice} DA</div>
              </div>
              <button 
                onClick={() => { stopCameraAR(); handleAddToCart(); }}
                className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg"
              >
                <ShoppingCart size={14} />
                {st.addToCart}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Main UI for standard 3D studio (Camera AR is not active) */}
      {!isARActive && (
        <>
          {/* Header */}
          <div className="flex flex-col items-center text-center mt-20 mb-10 gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <Sparkles size={14} />
              {isRtl ? "محرر ومحاكي مجسمات 3D تفاعلي" : "Studio Interactive Customizer & AR Preview"}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              {st.studioTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {st.studioSubtitle}
            </p>
          </div>

          {/* Core Customizer Workspace grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT / UPPER BLOCK: 3D Viewport canvas */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Visual 3D Frame */}
              <div className="relative w-full h-[450px] bg-gradient-to-tr from-slate-50 to-indigo-50/20 dark:from-slate-950 dark:to-slate-900/60 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden group">
                
                {/* 3D R3F Viewport */}
                <Canvas shadows camera={{ position: [0, 1.5, 4.5], fov: 45 }}>
                  <ambientLight intensity={0.65} />
                  <spotLight position={[8, 8, 8]} angle={0.2} penumbra={1} intensity={1.3} castShadow />
                  <directionalLight position={[-5, 5, -5]} intensity={0.3} />
                  
                  <Suspense fallback={null}>
                    <Center>
                      {selectedProduct.id === "mug" && <Mug3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                      {selectedProduct.id === "card" && <Card3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                      {selectedProduct.id === "tshirt" && <Tshirt3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                      {selectedProduct.id === "box" && <PackagingBox3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                      {selectedProduct.id === "poster" && <Poster3D canvasRef={canvasRef} baseColor={modelBaseColor} />}
                    </Center>
                    <Environment preset="studio" />
                    <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={8} blur={2.5} far={4} />
                  </Suspense>
                  <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.6} />
                </Canvas>

                {/* Instructions Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                  <span className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-full text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200/50 dark:border-slate-800/40">
                    🔄 Drag to Rotate 3D
                  </span>
                  <button 
                    onClick={startCameraAR}
                    className="pointer-events-auto flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105"
                  >
                    <Camera size={12} />
                    <span>Launch Web-AR</span>
                  </button>
                </div>

                {/* Product Selection Quick Badge */}
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black text-emerald-400 border border-white/10">
                  {isRtl ? selectedProduct.nameAr : selectedProduct.nameFr}
                </div>
              </div>

              {/* Step 1: Select Core Product Grid */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-850 shadow-md space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {st.selectProduct}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {PRODUCTS.map(prod => {
                    const isSelected = selectedProduct.id === prod.id;
                    return (
                      <button
                        key={prod.id}
                        onClick={() => {
                          setSelectedProduct(prod);
                          // Default adjustments for textures if necessary
                          redrawCanvas();
                          toast.info(isRtl ? `تم التغيير إلى: ${prod.nameAr}` : `Produit changé pour : ${prod.nameFr}`);
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isSelected 
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg scale-105" 
                            : "bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="text-xl mb-1">
                          {prod.id === "mug" && "☕"}
                          {prod.id === "card" && "📇"}
                          {prod.id === "box" && "📦"}
                          {prod.id === "tshirt" && "👕"}
                          {prod.id === "poster" && "🖼️"}
                        </div>
                        <div className="text-[10px] font-bold leading-tight select-none">
                          {isRtl ? prod.nameAr.split(" ")[0] : prod.nameFr.split(" ")[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Base Color Selection */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-850 shadow-md space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {st.selectBaseColor}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {BASE_COLORS.map(col => {
                    const isSelected = modelBaseColor === col.code;
                    return (
                      <button
                        key={col.code}
                        onClick={() => setModelBaseColor(col.code)}
                        className={`w-9 h-9 rounded-full border-2 transition-transform relative flex items-center justify-center ${
                          isSelected ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: col.code }}
                        title={col.name}
                      >
                        {isSelected && (
                          <Check size={14} className={col.code === "#ffffff" ? "text-slate-900" : "text-white"} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT BLOCK: Sidebar design properties customizer panels */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-950 p-6 md:p-8 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 shadow-xl space-y-6">
              
              {/* Tab Navigation header */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3 gap-2 overflow-x-auto scrollbar-none">
                {[
                  { id: "text", label: st.textTab, icon: <Type size={14} /> },
                  { id: "image", label: st.imageTab, icon: <ImageIcon size={14} /> },
                  { id: "bg", label: st.bgTab, icon: <Palette size={14} /> },
                  { id: "options", label: st.optionsTab, icon: <Settings size={14} /> }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-colors whitespace-nowrap cursor-pointer ${
                        isActive 
                          ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900" 
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: TEXT CUSTOMIZATION PROPERTIES */}
              {activeTab === "text" && (
                <div className="space-y-6 animate-slideUp">
                  
                  {/* Select active text layer or add one */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      {textLayers.map((layer, idx) => (
                        <button
                          key={layer.id}
                          onClick={() => setSelectedTextId(layer.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                            selectedTextId === layer.id
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          T{idx + 1}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      {/* Add new Text layer */}
                      <button
                        onClick={() => {
                          const newId = `t-${Date.now()}`;
                          const newLayer = {
                            id: newId,
                            text: isRtl ? "نص جديد" : "New Text",
                            font: "Outfit",
                            size: 26,
                            color: "#1e293b",
                            x: 256,
                            y: 180 + textLayers.length * 40,
                            weight: "bold"
                          };
                          setTextLayers(prev => [...prev, newLayer]);
                          setSelectedTextId(newId);
                          toast.success(isRtl ? "تمت إضافة طبقة نصية!" : "Nouvelle couche de texte ajoutée !");
                        }}
                        className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg hover:scale-105 transition-transform"
                        title="Add layer"
                      >
                        <Plus size={14} />
                      </button>
                      
                      {/* Delete Text layer */}
                      <button
                        onClick={() => {
                          if (textLayers.length <= 1) {
                            toast.error(isRtl ? "لا يمكنك حذف جميع طبقات النص." : "Impossible de supprimer toutes les couches.");
                            return;
                          }
                          setTextLayers(prev => prev.filter(t => t.id !== selectedTextId));
                          setSelectedTextId(textLayers[0].id);
                          toast.info(isRtl ? "تم حذف الطبقة النصية" : "Couche de texte supprimée");
                        }}
                        className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-lg hover:scale-105 transition-transform"
                        title="Delete layer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Text Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.enterText}</label>
                    <input 
                      type="text"
                      value={currentTextLayer.text}
                      onChange={(e) => updateSelectedText("text", e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                      placeholder="L'Artisan Imprimeur"
                    />
                  </div>

                  {/* Font Styling Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.fontStyle}</label>
                    <select
                      value={currentTextLayer.font}
                      onChange={(e) => updateSelectedText("font", e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                    >
                      {FONTS.map(font => (
                        <option key={font.value} value={font.value}>{font.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Typography configurations */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Font Size slider */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between">
                        <span>{st.textSize}</span>
                        <span className="text-emerald-500">{currentTextLayer.size}px</span>
                      </label>
                      <input 
                        type="range"
                        min="12"
                        max="80"
                        value={currentTextLayer.size}
                        onChange={(e) => updateSelectedText("size", parseInt(e.target.value))}
                        className="w-full accent-slate-900 dark:accent-emerald-400"
                      />
                    </div>

                    {/* Font Color picker */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between">
                        <span>{st.textColor}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{currentTextLayer.color}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={currentTextLayer.color}
                          onChange={(e) => updateSelectedText("color", e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={currentTextLayer.color}
                          onChange={(e) => updateSelectedText("color", e.target.value)}
                          className="w-full px-3 py-2 text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-900 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Positioning Sliders */}
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-200/30 dark:border-slate-800/30">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">موقع النص على المجسم (Position Offset)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* X slider */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-500 flex justify-between">
                          <span>أفقي (X):</span>
                          <span>{currentTextLayer.x}</span>
                        </div>
                        <input 
                          type="range" 
                          min="40" 
                          max="472" 
                          value={currentTextLayer.x} 
                          onChange={(e) => updateSelectedText("x", parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Y slider */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-500 flex justify-between">
                          <span>عمودي (Y):</span>
                          <span>{currentTextLayer.y}</span>
                        </div>
                        <input 
                          type="range" 
                          min="40" 
                          max="472" 
                          value={currentTextLayer.y} 
                          onChange={(e) => updateSelectedText("y", parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: LOGO / CUSTOM IMAGE UPLOAD PROPERTIES */}
              {activeTab === "image" && (
                <div className="space-y-6 animate-slideUp">
                  
                  {/* File Upload Zone */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.uploadLogo}</label>
                    <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/50 group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 text-slate-400 group-hover:scale-105 transition-transform">
                          <Upload size={20} className="text-emerald-500" />
                        </div>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                          {isRtl ? "اضغط هنا لرفع صورتك (PNG, JPG)" : "Parcourir vos images (PNG, JPG)"}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">ملف شفاف PNG ينصح به بشدة</span>
                      </div>
                    </div>
                  </div>

                  {/* Image transform controls if loaded */}
                  {logoImageSrc ? (
                    <div className="space-y-5 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-white">تعديلات أبعاد الشعار الفنية</span>
                        <button 
                          onClick={() => { setLogoImageSrc(null); toast.info(isRtl ? "تم مسح الشعار" : "Logo retiré"); }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-[10px] font-black"
                        >
                          <Trash2 size={12} />
                          <span>{isRtl ? "حذف" : "Supprimer"}</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Logo scale */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-500 flex justify-between">
                            <span>{st.logoScale}</span>
                            <span className="text-emerald-500">{Math.round(logoScale * 100)}%</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="200"
                            value={logoScale * 100}
                            onChange={(e) => setLogoScale(parseFloat(e.target.value) / 100)}
                            className="w-full"
                          />
                        </div>

                        {/* Logo Rotation */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-500 flex justify-between">
                            <span>{st.logoRotate}</span>
                            <span className="text-emerald-500">{logoRotate}°</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="360"
                            value={logoRotate}
                            onChange={(e) => setLogoRotate(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        {/* Coordinates mapping */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* logo X offset */}
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-500 flex justify-between">
                              <span>{st.logoX}</span>
                              <span>{logoX}</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="512"
                              value={logoX}
                              onChange={(e) => setLogoX(parseInt(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          {/* logo Y offset */}
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-500 flex justify-between">
                              <span>{st.logoY}</span>
                              <span>{logoY}</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="512"
                              value={logoY}
                              onChange={(e) => setLogoY(parseInt(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl text-xs text-slate-400 font-bold border border-slate-200/50 dark:border-slate-800/40">
                      {isRtl ? "لم يتم رفع أي شعار بعد." : "Aucun logo importé pour le moment."}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: BACKGROUND DESIGN AND PATTERNS */}
              {activeTab === "bg" && (
                <div className="space-y-6 animate-slideUp">
                  
                  {/* Select Background Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.chooseBg}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBgType("solid")}
                        className={`py-3.5 rounded-2xl font-black text-xs border text-center transition-all ${
                          bgType === "solid"
                            ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md"
                            : "bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {st.solidColor}
                      </button>
                      
                      <button
                        onClick={() => setBgType("gradient")}
                        className={`py-3.5 rounded-2xl font-black text-xs border text-center transition-all ${
                          bgType === "gradient"
                            ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md"
                            : "bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {st.gradientColor}
                      </button>
                    </div>
                  </div>

                  {/* Render solid bg picker */}
                  {bgType === "solid" ? (
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 animate-fadeIn">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">لوحة الألوان الموحدة للطباعة</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color"
                          value={bgSolidColor}
                          onChange={(e) => setBgSolidColor(e.target.value)}
                          className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0 overflow-hidden"
                        />
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={bgSolidColor}
                            onChange={(e) => setBgSolidColor(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Render luxury gradient catalog */
                    <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                      {GRADIENTS.map((grad, idx) => {
                        const isSelected = bgGradientIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setBgGradientIndex(idx)}
                            className={`h-20 rounded-2xl border transition-all relative flex flex-col items-center justify-center overflow-hidden ${
                              isSelected ? "border-slate-950 dark:border-white scale-105 shadow-md" : "border-slate-200/50 dark:border-slate-800/50 hover:opacity-90"
                            }`}
                            style={{ background: grad.value }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-bold">
                                <Check size={18} />
                              </div>
                            )}
                            <span className="absolute bottom-1 bg-black/60 px-2 py-0.5 rounded text-[8px] font-black text-white">{grad.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 4: ORDER SETTINGS & BRACKET QUANTITY CHECKOUT */}
              {activeTab === "options" && (
                <div className="space-y-6 animate-slideUp">
                  
                  {/* Select Quantity */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.quantity}</label>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setQuantity(prev => Math.max(50, prev - 50))}
                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 font-black text-lg flex items-center justify-center transition-colors"
                      >
                        ➖
                      </button>
                      <input 
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 100))}
                        className="flex-1 h-12 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-base outline-none"
                      />
                      <button 
                        onClick={() => setQuantity(prev => prev + 50)}
                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 font-black text-lg flex items-center justify-center transition-colors"
                      >
                        ➕
                      </button>
                    </div>
                  </div>

                  {/* Quantity guidelines badge */}
                  <div className="flex gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 text-[10px] font-black text-indigo-650 dark:text-indigo-400">
                    <span>💡</span>
                    <span>{isRtl 
                      ? "خصومات الكمية التفاعلية: +250 قطعة (خصم 6%) | +500 قطعة (خصم 12%) | +1000 قطعة (خصم 20%!)" 
                      : "Remises : +250 pcs (-6%) | +500 pcs (-12%) | +1000 pcs (-20%!)"}
                    </span>
                  </div>

                  {/* Paper Type Finish Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.paperFinish}</label>
                    <select
                      value={paperFinish}
                      onChange={(e) => setPaperFinish(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                    >
                      <option value="matte">{st.paperMatte}</option>
                      <option value="glossy">{st.paperGlossy} (+300 DA)</option>
                      <option value="eco">{st.paperEco} (+150 DA)</option>
                    </select>
                  </div>

                  {/* Rounded corners toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{st.corners}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCornersType("straight")}
                        className={`py-3.5 rounded-2xl font-black text-xs border text-center transition-all ${
                          cornersType === "straight"
                            ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md"
                            : "bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {st.cornersStraight}
                      </button>
                      
                      <button
                        onClick={() => setCornersType("rounded")}
                        className={`py-3.5 rounded-2xl font-black text-xs border text-center transition-all ${
                          cornersType === "rounded"
                            ? "bg-slate-950 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md"
                            : "bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {st.cornersRounded}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Price & Cart Bridge Panel */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
                
                <div className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{st.totalPrice}</h4>
                    {quantity >= 250 && (
                      <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5 animate-pulse">
                        {st.discountApplied}
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                    {totalPrice} <span className="text-xs font-bold text-slate-400">{isRtl ? "د.ج" : "DA"}</span>
                  </div>
                </div>

                <button 
                  onClick={handleAddToCart}
                  className="w-full py-4.5 bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white font-black text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <ShoppingCart size={18} />
                  <span>{st.addToCart}</span>
                </button>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}
