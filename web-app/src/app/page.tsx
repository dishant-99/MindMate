"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Sparkles, OrbitControls, Float, TorusKnot, MeshDistortMaterial, Sphere, Octahedron } from "@react-three/drei";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles as SparklesIcon } from "lucide-react";
import * as THREE from 'three';
import { useMemo } from "react";

function NeuralNetwork() {
  const count = 40;
  const radius = 2.4;
  const maxDistance = 1.3;

  const [positions, lines] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const lineIndices: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }

    // Connect close neighbors
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < maxDistance) {
          lineIndices.push(i, j);
        }
      }
    }

    return [pos, new Uint16Array(lineIndices)];
  }, [count, radius, maxDistance]);

  const pointsRef = useRef<any>(null);
  const linesRef = useRef<any>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
       pointsRef.current.rotation.y = t * 0.2;
    }
    if (linesRef.current) {
       linesRef.current.rotation.y = t * 0.2;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.06} color="#60a5fa" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="index"
            args={[lines, 1]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.08} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

function CoreScene() {
  const meshRef = useRef<any>(null);
  const coreRef = useRef<any>(null);
  const orb1Ref = useRef<any>(null);
  const orb2Ref = useRef<any>(null);
  const orb3Ref = useRef<any>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.2;
      coreRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);
      // Soft glow breathe
      if (coreRef.current.material) {
        coreRef.current.material.emissiveIntensity = 2 + Math.sin(t * 1.5) * 1;
      }
    }
    if (orb1Ref.current) {
      orb1Ref.current.position.x = Math.cos(t * 1.5) * 2.2;
      orb1Ref.current.position.z = Math.sin(t * 1.5) * 2.2;
      orb1Ref.current.position.y = Math.sin(t * 0.75) * 1.2;
    }
    if (orb2Ref.current) {
      orb2Ref.current.position.y = Math.cos(t * 2.1) * 1.8;
      orb2Ref.current.position.x = Math.sin(t * 2.1) * 1.8;
      orb2Ref.current.position.z = Math.sin(t * 1.05) * 1.5;
    }
    if (orb3Ref.current) {
      orb3Ref.current.position.z = Math.cos(t * 1.8) * 2.5;
      orb3Ref.current.position.y = Math.sin(t * 1.8) * 2.5;
      orb3Ref.current.position.x = Math.cos(t * 0.9) * 1.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} intensity={3} color="#60a5fa" />
      <pointLight position={[-5, -5, -5]} intensity={2} color="#c084fc" />
      
      <Sparkles count={400} scale={15} size={1.5} speed={0.8} opacity={0.7} color="#3b82f6" />
      
      <Float speed={4} rotationIntensity={0.5} floatIntensity={0.5}>
        <group ref={meshRef}>
          {/* Glowing Orb Core - Clean & Minimal */}
          <Sphere ref={coreRef} args={[0.8, 32, 32]}>
            <meshStandardMaterial 
              color="#1e293b" 
              emissive="#6366f1" 
              emissiveIntensity={2} 
              metalness={0.8} 
              roughness={0.2} 
            />
          </Sphere>

          {/* Orbiting Metallic Nodes */}
          <Sphere ref={orb1Ref} args={[0.16, 32, 32]}>
            <meshStandardMaterial color="#f8fafc" emissive="#3b82f6" emissiveIntensity={6} metalness={1} roughness={0} />
          </Sphere>
          <Sphere ref={orb2Ref} args={[0.13, 32, 32]}>
            <meshStandardMaterial color="#f8fafc" emissive="#a78bfa" emissiveIntensity={6} metalness={1} roughness={0} />
          </Sphere>
          <Sphere ref={orb3Ref} args={[0.1, 32, 32]}>
            <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={6} metalness={1} roughness={0} />
          </Sphere>

          {/* Hyper-Bright Metallic Wireframe */}
          <Icosahedron args={[3.2, 2]}>
            <meshStandardMaterial 
              color="#3b82f6" 
              wireframe 
              transparent 
              opacity={0.8} 
              emissive="#3b82f6"
              emissiveIntensity={4}
              metalness={1}
              roughness={0}
            />
          </Icosahedron>

          {/* New Neural Network Integration */}
          <NeuralNetwork />
        </group>
      </Float>
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="relative w-full h-[100dvh] bg-[#020617] overflow-hidden selection:bg-blue-500/30">
      
      {/* Floating Gradient Orbs for depth */}
      <div className="absolute top-1/4 -left-1/4 w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-0 w-[50vw] h-[50vw] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Main Grid Layout */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center px-6 md:px-12 py-10 lg:py-0">
        
        {/* Left Content Column */}
        <div className="flex flex-col items-start justify-center order-2 lg:order-1">
          {/* Header Tags */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors cursor-default"
          >
            <SparklesIcon size={14} className="text-blue-400" />
            <span className="text-sm font-medium tracking-wide text-slate-300 uppercase">
              Your Digital Sanctuary
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-left tracking-tight leading-[1.1] text-white"
          >
            Navigate your thoughts with <br/>
            <span className="bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 text-transparent">MindMate.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-6 text-base md:text-lg text-slate-400 max-w-lg text-left leading-relaxed font-light"
          >
            An immersive AI-powered wellness journey. Formulate your mind, track your emotional landscape, and reflect safely in the digital void.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-8 flex flex-wrap items-center justify-start gap-6 w-full"
          >
            <Link 
              href="/auth/login"
              className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-violet-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                Start Journey <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link 
              href="/auth/login"
              className="group text-slate-400 hover:text-white transition-colors font-medium relative px-4 py-2"
            >
              Sign In
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/30 scale-x-0 group-hover:scale-x-100 transform origin-left transition-transform duration-300" />
            </Link>
          </motion.div>
        </div>

        {/* Right 3D Column */}
        <div className="h-[40vh] lg:h-[80vh] w-full relative order-1 lg:order-2">
          <div className="absolute inset-0 z-0 pointer-events-auto">
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
              <Suspense fallback={null}>
                <CoreScene />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
              </Suspense>
            </Canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
