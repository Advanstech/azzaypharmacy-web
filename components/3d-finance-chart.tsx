'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export interface FinanceDataPoint {
  day: string;
  sales: number;
  revenue: number;
}

interface Finance3DChartProps {
  data: FinanceDataPoint[];
}

function BarGroup({ data, index, total, maxSales, maxRevenue }: { data: FinanceDataPoint; index: number; total: number; maxSales: number; maxRevenue: number }) {
  const xOffset = (index - total / 2) * 2.5;
  const salesRef = useRef<THREE.Mesh>(null);
  const revenueRef = useRef<THREE.Mesh>(null);

  // Calculate normalized heights based on maximums (max height is 4 units)
  const salesHeight = maxSales > 0 ? (data.sales / maxSales) * 4 : 0.1;
  const revenueHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 4 : 0.1;

  useFrame((state, delta) => {
    // Animate sales bar
    if (salesRef.current) {
      salesRef.current.scale.y = THREE.MathUtils.lerp(salesRef.current.scale.y, 1, delta * 3);
    }
    // Animate revenue bar with slight delay
    if (revenueRef.current && state.clock.elapsedTime > index * 0.1) {
      revenueRef.current.scale.y = THREE.MathUtils.lerp(revenueRef.current.scale.y, 1, delta * 3);
    }
  });

  return (
    <group position={[xOffset, 0, 0]}>
      {/* Sales Bar */}
      <mesh
        ref={salesRef}
        position={[-0.5, salesHeight / 2, 0]}
        scale={[1, 0.001, 1]}
      >
        <cylinderGeometry args={[0.4, 0.4, salesHeight, 32]} />
        <meshPhysicalMaterial color="#00D9FF" roughness={0.1} metalness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>

      {/* Revenue Bar */}
      <mesh
        ref={revenueRef}
        position={[0.5, revenueHeight / 2, 0]}
        scale={[1, 0.001, 1]}
      >
        <cylinderGeometry args={[0.4, 0.4, revenueHeight, 32]} />
        <meshPhysicalMaterial color="#A855F7" roughness={0.1} metalness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.5}
        color="#64748B"
        anchorX="center"
        anchorY="middle"
      >
        {data.day}
      </Text>
    </group>
  );
}

function ChartScene({ data }: { data: FinanceDataPoint[] }) {
  const groupRef = useRef<THREE.Group>(null);

  const maxSales = useMemo(() => Math.max(...data.map(d => d.sales), 1), [data]);
  const maxRevenue = useMemo(() => Math.max(...data.map(d => d.revenue), 1), [data]);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation is fine, but make it very subtle
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {data.map((d, index) => (
        <BarGroup 
          key={d.day} 
          data={d} 
          index={index} 
          total={data.length} 
          maxSales={maxSales} 
          maxRevenue={maxRevenue} 
        />
      ))}
      <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={20} blur={2} far={10} />
    </group>
  );
}

export function Finance3DChart({ data }: Finance3DChartProps) {
  // If no data, render an empty state or placeholder
  const safeData = data && data.length > 0 ? data : [
    { day: 'Mon', sales: 0, revenue: 0 },
    { day: 'Tue', sales: 0, revenue: 0 },
  ];

  return (
    <div className="w-full h-[400px] relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800" style={{ touchAction: 'none' }}>
      <div className="absolute top-6 left-6 z-10 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00D9FF]" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sales Volume</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#A855F7]" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Financial Revenue</span>
        </div>
      </div>
      
      <Canvas camera={{ position: [0, 5, 12], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.5} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.8} />
        <directionalLight position={[0, 10, -5]} intensity={0.5} />
        
        <ChartScene data={safeData} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.5}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>
      
      {/* Decorative glass overlay elements */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/10 p-3 rounded-xl">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Drag to rotate 3D view</p>
        </div>
      </div>
    </div>
  );
}
