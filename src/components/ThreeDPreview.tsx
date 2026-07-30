"use client";

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDPreviewProps {
  modelType: 'mug' | 'tshirt' | 'box' | 'poster';
  designUrl?: string; // Image URL to map onto the 3D model
  modelColor?: string; // Customizable model base color
}

// 1. MUG MODEL WITH DETAILED 3D MESH (Body + Torus Handle)
function Mug({ designUrl, modelColor }: { designUrl?: string; modelColor?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const texture = designUrl ? useTexture(designUrl) : null;
  if (texture) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    // Standard mug decal placement
    texture.repeat.set(1.2, 1);
    texture.offset.set(-0.1, 0);
  }

  return (
    <group ref={meshRef}>
      {/* Mug Cylinder Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 2.4, 32]} />
        <meshStandardMaterial 
          color={modelColor || "#ffffff"} 
          map={texture || undefined}
          roughness={0.15} 
          metalness={0.05} 
        />
      </mesh>
      {/* Torus Handle */}
      <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.55, 0.12, 16, 100, Math.PI]} />
        <meshStandardMaterial color={modelColor || "#ffffff"} roughness={0.15} metalness={0.05} />
      </mesh>
    </group>
  );
}

// 2. TSHIRT DECALS MODEL OVERLAY ON BOX REPRESENTATION
function Tshirt({ designUrl, modelColor }: { designUrl?: string; modelColor?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const texture = designUrl ? useTexture(designUrl) : null;

  return (
    <group ref={meshRef}>
      {/* Tshirt Core Body Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 3, 0.22]} />
        <meshStandardMaterial color={modelColor || "#ffffff"} roughness={0.65} metalness={0.01} />
      </mesh>
      {/* Left Sleeve */}
      <mesh position={[-1.3, 0.9, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshStandardMaterial color={modelColor || "#ffffff"} roughness={0.65} />
      </mesh>
      {/* Right Sleeve */}
      <mesh position={[1.3, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.9, 0.2]} />
        <meshStandardMaterial color={modelColor || "#ffffff"} roughness={0.65} />
      </mesh>
      {/* Graphic Overlay on Chest */}
      {texture && (
        <mesh position={[0, 0.3, 0.12]}>
          <planeGeometry args={[1.2, 1.4]} />
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

// 3. PACKAGING/BOX MODEL
function PackagingBox({ designUrl, modelColor }: { designUrl?: string; modelColor?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const texture = designUrl ? useTexture(designUrl) : null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[2.4, 1.6, 1.6]} />
      <meshStandardMaterial 
        color={modelColor || "#ffffff"} 
        map={texture || undefined}
        roughness={0.3} 
        metalness={0.02}
      />
    </mesh>
  );
}

// 4. POSTER IN A SLEEK SLATE FRAME
function Poster({ designUrl, modelColor }: { designUrl?: string; modelColor?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  const texture = designUrl ? useTexture(designUrl) : null;

  return (
    <group ref={meshRef}>
      {/* Poster Slate Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.15, 3.15, 0.12]} />
        <meshStandardMaterial color={modelColor || "#1e293b"} roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Print Paper Sheet */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.98, 2.98]} />
        <meshStandardMaterial 
          color="#ffffff" 
          map={texture || undefined} 
          roughness={0.5} 
          metalness={0.05} 
        />
      </mesh>
    </group>
  );
}

export default function ThreeDPreview({ modelType, designUrl, modelColor }: ThreeDPreviewProps) {
  return (
    <div className="w-full h-[400px] bg-slate-100 dark:bg-slate-950 rounded-[2rem] overflow-hidden relative cursor-grab active:cursor-grabbing border border-slate-200 dark:border-slate-800/80 shadow-inner">
      <Canvas shadows camera={{ position: [0, 1.5, 4.5], fov: 45 }}>
        <ambientLight intensity={0.65} />
        <spotLight position={[8, 8, 8]} angle={0.2} penumbra={1} intensity={1.2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        
        <Suspense fallback={null}>
          <Center>
            {modelType === 'mug' && <Mug designUrl={designUrl} modelColor={modelColor} />}
            {modelType === 'tshirt' && <Tshirt designUrl={designUrl} modelColor={modelColor} />}
            {modelType === 'box' && <PackagingBox designUrl={designUrl} modelColor={modelColor} />}
            {modelType === 'poster' && <Poster designUrl={designUrl} modelColor={modelColor} />}
          </Center>
          <Environment preset="studio" />
          <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={8} blur={2.5} far={4} />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.6} />
      </Canvas>
      
      <div className="absolute bottom-4 left-0 w-full flex justify-center pointer-events-none">
         <span className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-350 shadow-sm border border-slate-200/40 dark:border-slate-800/40">
             Faites glisser pour tourner (3D)
         </span>
      </div>
    </div>
  );
}
