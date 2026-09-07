'use client';

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useCustomAuth } from '@/lib/custom-auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import {
  gql,
  Q_LOGIN_STAFF,
  M_CHANGE_PASSWORD,
  M_FORGOT_PASSWORD,
  M_UPDATE_DUTY_STATUS,
  M_SET_STAFF_PIN,
} from '@/lib/gql';
import { saveToCache, getFromCache } from '@/lib/offline';
import { StaffMember } from '@/lib/store';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  Sparkles,
  KeyRound,
  Delete,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sun,
  Moon,
  Pill,
} from 'lucide-react';

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

// ── 3D FLOATING PHARMACEUTICAL ELEMENTS ──────────────────────────────────────

function ParticleField({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const count = 900;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (ref.current) {
      ref.current.rotation.y = elapsed.current * 0.03;
      ref.current.rotation.x = Math.sin(elapsed.current * 0.02) * 0.1;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color={isDark ? '#10B981' : '#059669'}
        transparent
        opacity={isDark ? 0.65 : 0.45}
        sizeAttenuation
      />
    </points>
  );
}

function Capsule3D({
  pos,
  color1,
  color2,
  speed,
  isDark,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  pos: [number, number, number];
  color1: string;
  color2: string;
  speed: number;
  isDark: boolean;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const initialPos = useRef(pos);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (ref.current) {
      ref.current.rotation.x += delta * 0.45 * speed;
      ref.current.rotation.y += delta * 0.6 * speed;
      ref.current.rotation.z += delta * 0.25 * speed;
      ref.current.position.y =
        initialPos.current[1] + Math.sin(elapsed.current * speed * 0.8) * 0.45;
      ref.current.position.x =
        initialPos.current[0] + Math.cos(elapsed.current * speed * 0.5) * 0.35;
    }
  });

  return (
    <Float speed={speed * 1.4} rotationIntensity={1.2} floatIntensity={1.4}>
      <group ref={ref} position={pos} scale={scale} rotation={rotation}>
        {/* Top Half */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.7, 24]} />
          <meshStandardMaterial
            color={color1}
            emissive={color1}
            emissiveIntensity={isDark ? 0.6 : 0.25}
            metalness={isDark ? 0.4 : 0.2}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.26, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={color1}
            emissive={color1}
            emissiveIntensity={isDark ? 0.6 : 0.25}
            metalness={isDark ? 0.4 : 0.2}
            roughness={0.25}
          />
        </mesh>

        {/* Bottom Half */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.7, 24]} />
          <meshStandardMaterial
            color={color2}
            emissive={color2}
            emissiveIntensity={isDark ? 0.5 : 0.2}
            metalness={isDark ? 0.3 : 0.15}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.7, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.26, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={color2}
            emissive={color2}
            emissiveIntensity={isDark ? 0.5 : 0.2}
            metalness={isDark ? 0.3 : 0.15}
            roughness={0.3}
          />
        </mesh>
      </group>
    </Float>
  );
}

function Tablet3D({
  pos,
  color,
  speed,
  isDark,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  pos: [number, number, number];
  color: string;
  speed: number;
  isDark: boolean;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const initialPos = useRef(pos);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (ref.current) {
      ref.current.rotation.x += delta * 0.5 * speed;
      ref.current.rotation.z += delta * 0.35 * speed;
      ref.current.position.y =
        initialPos.current[1] + Math.sin(elapsed.current * speed * 0.9) * 0.5;
    }
  });

  return (
    <Float speed={speed * 1.3} rotationIntensity={1.3} floatIntensity={1.2}>
      <group ref={ref} position={pos} scale={scale} rotation={rotation}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.16, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isDark ? 0.45 : 0.2}
            metalness={0.25}
            roughness={0.35}
          />
        </mesh>
        {/* Scored line in the center of the tablet */}
        <mesh position={[0, 0.082, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.72, 12]} />
          <meshStandardMaterial color={isDark ? '#0F172A' : '#E2E8F0'} roughness={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

function OvalPill({
  pos,
  color,
  speed,
  isDark,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  pos: [number, number, number];
  color: string;
  speed: number;
  isDark: boolean;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  const initialPos = useRef(pos);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (ref.current) {
      ref.current.rotation.x += delta * 0.4 * speed;
      ref.current.rotation.y += delta * 0.3 * speed;
      ref.current.position.y =
        initialPos.current[1] + Math.sin(elapsed.current * speed * 0.7) * 0.4;
    }
  });

  return (
    <Float speed={speed * 1.5} rotationIntensity={1.1} floatIntensity={1.3}>
      <mesh ref={ref} position={pos} scale={scale} rotation={rotation}>
        <capsuleGeometry args={[0.22, 0.55, 12, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isDark ? 0.45 : 0.2}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
    </Float>
  );
}

function BlisterPack({
  isDark,
  pos,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  isDark: boolean;
  pos: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.18;
      ref.current.rotation.y += delta * 0.24;
    }
  });

  const foilColor = isDark ? '#94A3B8' : '#CBD5E1';
  const pillColor = isDark ? '#10B981' : '#059669';

  return (
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.1}>
      <group ref={ref} position={pos} scale={scale} rotation={rotation}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.7, 0.06, 1.05]} />
          <meshStandardMaterial
            color={foilColor}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[-0.5, 0, 0.5].map((x, i) =>
          [-0.25, 0.25].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.05, z]}>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial
                color={pillColor}
                emissive={pillColor}
                emissiveIntensity={isDark ? 0.4 : 0.2}
                metalness={0.3}
                roughness={0.3}
              />
            </mesh>
          ))
        )}
      </group>
    </Float>
  );
}

function PillBottle({
  isDark,
  pos,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  isDark: boolean;
  pos: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.25;
      ref.current.rotation.z += delta * 0.08;
    }
  });

  return (
    <Float speed={1.3} rotationIntensity={0.6} floatIntensity={0.9}>
      <group ref={ref} position={pos} scale={scale} rotation={rotation}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 1.35, 32]} />
          <meshStandardMaterial
            color={isDark ? '#F1F5F9' : '#FFFFFF'}
            emissive={isDark ? '#1E293B' : '#F8FAFC'}
            emissiveIntensity={0.1}
            metalness={0.15}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.74, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 32]} />
          <meshStandardMaterial
            color={isDark ? '#10B981' : '#059669'}
            emissive={isDark ? '#059669' : '#047857'}
            emissiveIntensity={0.35}
            metalness={0.3}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.02, 0.53]}>
          <boxGeometry args={[0.78, 0.65, 0.04]} />
          <meshStandardMaterial
            color={isDark ? '#00D9FF' : '#0EA5E9'}
            emissive={isDark ? '#00D9FF' : '#0EA5E9'}
            emissiveIntensity={0.25}
            metalness={0.1}
            roughness={0.4}
          />
        </mesh>
      </group>
    </Float>
  );
}

function MedicalCross({
  isDark,
  pos,
  scale = 1,
  rotationSpeed = 1,
}: {
  isDark: boolean;
  pos: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 0.3 * rotationSpeed;
      ref.current.rotation.x += delta * 0.15 * rotationSpeed;
    }
  });

  const mat = (
    <meshStandardMaterial
      color={isDark ? '#10B981' : '#059669'}
      emissive={isDark ? '#10B981' : '#059669'}
      emissiveIntensity={isDark ? 0.7 : 0.4}
      metalness={isDark ? 0.6 : 0.3}
      roughness={0.2}
    />
  );

  return (
    <Float speed={1.4 * rotationSpeed} rotationIntensity={0.6} floatIntensity={1.5}>
      <group ref={ref} position={pos} scale={scale}>
        <mesh>
          <boxGeometry args={[0.2, 1.2, 0.2]} />
          {mat}
        </mesh>
        <mesh>
          <boxGeometry args={[1.2, 0.2, 0.2]} />
          {mat}
        </mesh>
      </group>
    </Float>
  );
}

function MovingPillsScene({ isDark }: { isDark: boolean }) {
  return (
    <>
      <color attach="background" args={[isDark ? '#040810' : '#F7F9FC']} />
      <fog attach="fog" args={[isDark ? '#040810' : '#F7F9FC', 8, 30]} />

      <ambientLight intensity={isDark ? 0.45 : 1.4} />
      <pointLight position={[10, 10, 10]} intensity={isDark ? 3.5 : 2.5} color={isDark ? '#10B981' : '#059669'} />
      <pointLight position={[-10, -8, -5]} intensity={isDark ? 2.5 : 2.0} color={isDark ? '#00D9FF' : '#0EA5E9'} />
      <pointLight position={[0, 12, 4]} intensity={isDark ? 3.0 : 2.2} color={isDark ? '#34D399' : '#10B981'} />
      <pointLight position={[-6, 2, 6]} intensity={isDark ? 2.0 : 1.8} color={isDark ? '#F59E0B' : '#D97706'} />

      <ParticleField isDark={isDark} />

      {/* Floating 3D Capsules */}
      <Capsule3D isDark={isDark} pos={[-6, 2.5, -2]} color1="#10B981" color2="#FFFFFF" speed={1.3} scale={0.9} />
      <Capsule3D isDark={isDark} pos={[6.5, 3.2, -3]} color1="#00D9FF" color2="#FFFFFF" speed={1.6} scale={0.8} rotation={[Math.PI / 4, 0, 0]} />
      <Capsule3D isDark={isDark} pos={[-5.5, -3.2, 0]} color1="#F59E0B" color2="#FFFFFF" speed={1.4} scale={0.75} />
      <Capsule3D isDark={isDark} pos={[5.8, -2.5, 1]} color1="#10B981" color2="#34D399" speed={1.7} scale={0.85} rotation={[0, 0, Math.PI / 3]} />
      <Capsule3D isDark={isDark} pos={[0.5, 4.2, -2]} color1="#A78BFA" color2="#FFFFFF" speed={1.2} scale={0.7} />
      <Capsule3D isDark={isDark} pos={[-1.5, -4.5, -1]} color1="#00D9FF" color2="#10B981" speed={1.5} scale={0.75} />

      {/* Floating Tablets */}
      <Tablet3D isDark={isDark} pos={[-7, -0.5, -3]} color={isDark ? '#FBBF24' : '#F59E0B'} speed={1.2} scale={0.85} />
      <Tablet3D isDark={isDark} pos={[7, 0.5, -2]} color={isDark ? '#34D399' : '#10B981'} speed={1.5} scale={0.8} rotation={[0, Math.PI / 4, 0]} />
      <Tablet3D isDark={isDark} pos={[-3.5, 4.0, -1]} color={isDark ? '#38BDF8' : '#0EA5E9'} speed={1.4} scale={0.7} />
      <Tablet3D isDark={isDark} pos={[4.0, -4.0, -2]} color={isDark ? '#F472B6' : '#EC4899'} speed={1.6} scale={0.65} />

      {/* Scattered Oval Pills */}
      <OvalPill isDark={isDark} pos={[-4.5, 1.8, 1]} color={isDark ? '#34D399' : '#10B981'} speed={1.8} scale={0.75} rotation={[0.4, 0.5, 0]} />
      <OvalPill isDark={isDark} pos={[4.5, 1.2, 0]} color={isDark ? '#FBBF24' : '#F59E0B'} speed={1.5} scale={0.7} rotation={[0.2, 0.8, 0.3]} />
      <OvalPill isDark={isDark} pos={[-2.5, -3.2, 1]} color={isDark ? '#00D9FF' : '#0EA5E9'} speed={1.9} scale={0.65} rotation={[0.5, 0.1, 0.4]} />
      <OvalPill isDark={isDark} pos={[3.0, 3.8, 1]} color={isDark ? '#A78BFA' : '#8B5CF6'} speed={1.7} scale={0.6} />

      {/* Blister Packs & Pill Bottles */}
      <BlisterPack isDark={isDark} pos={[-6.8, -4.0, -4]} scale={1.1} rotation={[0.3, 0.5, 0.1]} />
      <BlisterPack isDark={isDark} pos={[6.2, 4.5, -5]} scale={1.15} rotation={[-0.3, 0.4, 0.2]} />
      <PillBottle isDark={isDark} pos={[-7.5, 3.8, -4]} scale={1.05} rotation={[0.2, 0.4, 0]} />
      <PillBottle isDark={isDark} pos={[7.2, -3.8, -3]} scale={1.0} rotation={[0.3, -0.3, 0.1]} />

      {/* Medical Cross Symbols */}
      <MedicalCross isDark={isDark} pos={[-3.0, 0.0, -4]} scale={0.65} rotationSpeed={1.2} />
      <MedicalCross isDark={isDark} pos={[3.5, -0.8, -4]} scale={0.6} rotationSpeed={1.4} />

      {isDark && <Stars radius={80} depth={40} count={2500} factor={3} saturation={0} fade speed={0.8} />}

      <EffectComposer>
        <Bloom luminanceThreshold={isDark ? 0.2 : 0.75} intensity={isDark ? 1.8 : 0.5} levels={8} mipmapBlur />
        <Vignette eskil={false} offset={0.12} darkness={isDark ? 0.55 : 0.15} />
      </EffectComposer>
    </>
  );
}

// ── ROLE HELPER ─────────────────────────────────────────────────────────────

function getRoleBadge(role: string, isDark: boolean) {
  const r = (role || '').toUpperCase();
  switch (r) {
    case 'OWNER':
    case 'SE_ADMIN':
      return {
        label: 'Owner',
        color: isDark ? '#34D399' : '#059669',
        bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.08)',
        border: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(5,150,105,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #064E3B 0%, #047857 100%)' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
      };
    case 'MANAGER':
      return {
        label: 'Manager',
        color: isDark ? '#FBBF24' : '#D97706',
        bg: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(217,119,6,0.08)',
        border: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(217,119,6,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #78350F 0%, #B45309 100%)' : 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
      };
    case 'HEAD_PHARMACIST':
      return {
        label: 'Head Pharmacist',
        color: isDark ? '#00D9FF' : '#0284C7',
        bg: isDark ? 'rgba(0,217,255,0.12)' : 'rgba(2,132,199,0.08)',
        border: isDark ? 'rgba(0,217,255,0.3)' : 'rgba(2,132,199,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 100%)' : 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
      };
    case 'PHARMACIST':
      return {
        label: 'Pharmacist',
        color: isDark ? '#A78BFA' : '#7C3AED',
        bg: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(124,58,237,0.08)',
        border: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)' : 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
      };
    case 'CASHIER':
    case 'CHEMICAL_CASHIER':
      return {
        label: 'Cashier',
        color: isDark ? '#F472B6' : '#DB2777',
        bg: isDark ? 'rgba(244,114,182,0.12)' : 'rgba(219,39,119,0.08)',
        border: isDark ? 'rgba(244,114,182,0.3)' : 'rgba(219,39,119,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #831843 0%, #BE185D 100%)' : 'linear-gradient(135deg, #DB2777 0%, #F472B6 100%)',
      };
    default:
      return {
        label: role ? role.replace(/_/g, ' ') : 'Staff',
        color: isDark ? '#94A3B8' : '#64748B',
        bg: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.08)',
        border: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)',
        gradient: isDark ? 'linear-gradient(135deg, #1E293B 0%, #334155 100%)' : 'linear-gradient(135deg, #64748B 0%, #94A3B8 100%)',
      };
  }
}

function getInitials(name: string) {
  if (!name) return 'AP';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ── MAIN CLOCK-IN LOGIN PAGE ────────────────────────────────────────────────

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // PIN / Auth State
  const [pin, setPin] = useState('');
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Success Transition
  const [isSuccessTransition, setIsSuccessTransition] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPinChangeModal, setShowPinChangeModal] = useState(false);
  const [pinChangeUser, setPinChangeUser] = useState<any | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(false);

  const { signIn, signInWithPin, signOut } = useCustomAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingStaff(true);

    try {
      const cached = await getFromCache('staff_cache');
      if (cached?.length) {
        setStaff(cached);
        setLoadingStaff(false);
      }

      const data = await gql<{ loginStaff?: StaffMember[] }>(Q_LOGIN_STAFF);
      if (data?.loginStaff?.length) {
        setStaff(data.loginStaff);
        await saveToCache('staff_cache', data.loginStaff);
      }
    } catch (e) {
      console.error('Failed to fetch staff list', e);
    } finally {
      setLoadingStaff(false);
      isFetchingRef.current = false;
    }
  };

  const isDark = !mounted || resolvedTheme === 'dark';

  const submitAuth = useCallback(async (pinOverride?: string) => {
    if (!selectedStaff || isVerifying) return;
    const email = selectedStaff.email.trim();
    const secret = pinOverride ?? (authMode === 'pin' ? pin : password);

    if (!secret) {
      setError(authMode === 'pin' ? 'Please enter your 4-digit PIN' : 'Please enter your password');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      let result;
      if (authMode === 'pin') {
        result = await signInWithPin(email, secret);
      } else {
        result = await signIn(email, secret);
      }

      if (result.error) {
        setError(result.error);
        setShakeKey((k) => k + 1);
        if (authMode === 'pin') setPin('');
        setIsVerifying(false);
        return;
      }

      if (authMode === 'pin' && result.data?.requiresPinChange) {
        setPinChangeUser(result.data.user);
        setShowPinChangeModal(true);
        setIsVerifying(false);
        return;
      }

      // Check first-time temporary password
      if (secret.startsWith('Azzay@')) {
        setIsFirstTimeLogin(true);
        setShowPasswordChangeModal(true);
        setIsVerifying(false);
        return;
      }

      // Auto-clock in on duty
      if (result.data?.user?.id) {
        try {
          await gql(M_UPDATE_DUTY_STATUS, { userId: result.data.user.id, isOnDuty: true });
        } catch (e) {
          console.error('[AUTH] Duty status update failed', e);
        }
      }

      setIsSuccessTransition(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 850);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
      setShakeKey((k) => k + 1);
      if (authMode === 'pin') setPin('');
      setIsVerifying(false);
    }
  }, [selectedStaff, isVerifying, authMode, pin, password, signInWithPin, signIn]);

  // Handle PIN input
  const handlePinDigit = useCallback((digit: string) => {
    if (pin.length >= 6 || isVerifying) return;
    setError(null);
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-verify on 4-digit PIN (or allow 6-digit)
    if (newPin.length === 4) {
      setTimeout(() => {
        submitAuth(newPin);
      }, 150);
    }
  }, [pin, isVerifying, submitAuth]);

  const handlePinBackspace = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying]);

  const handlePinClear = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin('');
  }, [isVerifying]);

  // Keyboard navigation for PIN & form
  useEffect(() => {
    if (!selectedStaff || authMode !== 'pin' || isVerifying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        setSelectedStaff(null);
        setPin('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStaff, authMode, isVerifying, handlePinDigit, handlePinBackspace]);

  return (
    <div className="relative w-full h-[100dvh] lg:h-screen overflow-hidden flex flex-col lg:flex-row items-stretch select-none">
      {/* ── 3D CANVAS BACKGROUND ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 13], fov: 50 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <MovingPillsScene isDark={isDark} />
          </Suspense>
        </Canvas>
      </div>

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="relative z-10 w-full lg:w-[380px] xl:w-[420px] p-3 sm:p-6 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r backdrop-blur-xl transition-all"
        style={{
          background: isDark
            ? 'linear-gradient(165deg, rgba(2, 6, 23, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(165deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
          borderColor: isDark ? 'rgba(0, 217, 255, 0.15)' : 'rgba(0, 217, 255, 0.25)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
          {/* Top Brand & Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(0, 217, 255, 0.35)',
                }}
              >
                <img src="/azzay-logo.png" alt="Azzay" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
                  Azzay Pharmacy
                </span>
                <span className="text-[10px] sm:text-xs text-cyan-300 font-bold uppercase tracking-widest mt-0.5">
                  Pro Edition
                </span>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 sm:p-2.5 rounded-lg lg:rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all border border-white/10"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Heading & Tagline */}
          <div className="flex flex-col items-center lg:items-start space-y-2 sm:space-y-4 text-center lg:text-left flex-1 justify-center mt-8 lg:mt-0 mb-4 lg:mb-0">
            <p className="hidden lg:block text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
              System Access Portal
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-200 tracking-tight leading-[1.05] whitespace-nowrap">
              NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Terminal</span>
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-300/80 leading-relaxed max-w-[280px] sm:max-w-sm mx-auto lg:mx-0">
              Select your profile to authenticate and securely access pharmacy operations.
            </p>
          </div>

        {/* Bottom Metadata */}
        <div className="hidden lg:flex pt-6 border-t border-white/10 items-center justify-between text-xs text-slate-300/70 font-medium">
          <span>NEXUS v2.0</span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* ── RIGHT MAIN STAFF GRID AREA ── */}
      <div className="relative z-10 flex-1 overflow-y-auto min-h-0 pt-5 pb-3 px-3 sm:p-6 lg:p-10 flex flex-col items-center justify-start">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-2 sm:mb-10 mt-4 sm:mt-0">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-2"
              style={{
                color: isDark ? '#F8FAFC' : '#0F172A',
                fontFamily: 'serif, ui-serif, Georgia',
              }}
            >
              Who&apos;s clocking in?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide"
            >
              Select your profile to continue
            </motion.p>
          </div>

          {/* Grid of Staff Profiles */}
          {loadingStaff && staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold opacity-60">Loading staff profiles...</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.04,
                  },
                },
              }}
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6"
            >
              {staff.map((member) => {
                const roleInfo = getRoleBadge(member.role, isDark);
                const initials = getInitials(member.name);

                return (
                  <motion.div
                    key={member.id}
                    variants={{
                      hidden: { opacity: 0, y: 30, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1 },
                    }}
                    whileHover={{ y: -8, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setSelectedStaff(member);
                      setPin('');
                      setPassword('');
                      setError(null);
                      setAuthMode('pin');
                    }}
                    className="cursor-pointer group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col items-center text-center transition-all border backdrop-blur-2xl"
                    style={{
                      background: isDark
                        ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)'
                        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                      boxShadow: isDark
                        ? '0 20px 40px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 20px 40px -10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
                    }}
                  >
                    {/* Glowing card border/shadow on hover */}
                    <div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                      style={{
                        boxShadow: `0 0 0 2px ${roleInfo.color}33, 0 20px 40px -10px ${roleInfo.color}40`,
                      }}
                    />

                    {/* Circular Avatar / Initials */}
                    <div className="relative mb-4 sm:mb-5">
                      <div className="absolute inset-0 rounded-[22px] blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-500" style={{ background: roleInfo.gradient }} />
                      <div
                        className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-[20px] sm:rounded-[24px] flex items-center justify-center text-base sm:text-xl lg:text-2xl font-black text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                        style={{
                          background: roleInfo.gradient,
                          border: '2px solid rgba(255,255,255,0.25)',
                          boxShadow: `0 10px 25px -5px ${roleInfo.color}66`,
                        }}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover rounded-[18px] sm:rounded-[22px]"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                    </div>

                    {/* Staff Name */}
                    <h3
                      className="font-bold text-sm sm:text-base lg:text-lg tracking-tight mb-1 sm:mb-1.5 w-full truncate px-2"
                      style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                      title={member.name}
                    >
                      {member.name}
                    </h3>

                    {/* Role Title */}
                    <span
                      className="text-[10px] sm:text-xs font-bold tracking-wider uppercase"
                      style={{ color: roleInfo.color }}
                    >
                      {roleInfo.label}
                    </span>

                    {/* Branch subtle indicator */}
                    {member.branch?.name && (
                      <div className="mt-3 w-full flex justify-center">
                        <span className="text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 rounded-full text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800/50 truncate max-w-[90%] border border-slate-200 dark:border-slate-700/50 shadow-sm">
                          {member.branch.name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── PIN CLOCK-IN KEYPAD MODAL ── */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isVerifying) {
                  setSelectedStaff(null);
                  setPin('');
                  setError(null);
                }
              }}
              className="absolute inset-0 bg-black/65 backdrop-blur-md"
            />

            {/* Dialog Content */}
            <motion.div
              key={shakeKey}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={
                error
                  ? { opacity: 1, scale: 1, y: 0, x: [-8, 8, -6, 6, -3, 3, 0] }
                  : { opacity: 1, scale: 1, y: 0, x: 0 }
              }
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-sm rounded-[32px] overflow-hidden border p-6 sm:p-7 shadow-2xl"
              style={{
                background: isDark
                  ? 'linear-gradient(165deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 29, 0.98) 100%)'
                  : 'linear-gradient(165deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.55)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (!isVerifying) {
                    setSelectedStaff(null);
                    setPin('');
                    setError(null);
                  }
                }}
                className="absolute right-5 top-5 p-2 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Staff Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-xl mb-3"
                  style={{
                    background: getRoleBadge(selectedStaff.role, isDark).gradient,
                    border: '2px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {getInitials(selectedStaff.name)}
                </div>
                <h3
                  className="font-bold text-lg tracking-tight"
                  style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                >
                  {selectedStaff.name}
                </h3>
                <p
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5"
                >
                  {getRoleBadge(selectedStaff.role, isDark).label}
                  {selectedStaff.branch?.name ? ` • ${selectedStaff.branch.name}` : ''}
                </p>
              </div>

              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-2.5 rounded-xl text-xs font-semibold text-center bg-red-500/10 border border-red-500/30 text-red-500"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode: PIN Keypad */}
              {authMode === 'pin' ? (
                <div className="flex flex-col items-center">
                  {/* PIN Dots Display */}
                  <div className="flex items-center gap-3 mb-6 h-4">
                    {[0, 1, 2, 3].map((index) => {
                      const isFilled = pin.length > index;
                      return (
                        <motion.div
                          key={index}
                          animate={
                            isVerifying
                              ? {
                                  scale: [1, 1.3, 1],
                                  opacity: [0.3, 1, 0.3],
                                  borderColor: '#10B981',
                                }
                              : {
                                  scale: isFilled ? 1.15 : 1,
                                  opacity: 1,
                                  borderColor: isFilled
                                    ? '#10B981'
                                    : isDark
                                    ? 'rgba(255,255,255,0.2)'
                                    : 'rgba(0,0,0,0.2)',
                                }
                          }
                          transition={
                            isVerifying
                              ? {
                                  repeat: Infinity,
                                  duration: 0.9,
                                  delay: index * 0.15,
                                  ease: 'easeInOut',
                                }
                              : { duration: 0.2 }
                          }
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                          style={{
                            background: isFilled ? '#10B981' : 'transparent',
                            boxShadow: isFilled ? '0 0 12px rgba(16,185,129,0.5)' : 'none',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Numpad 3x4 */}
                  <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handlePinDigit(digit)}
                        className="h-14 rounded-2xl font-bold text-xl flex items-center justify-center transition-all active:scale-95 border hover:bg-black/5 dark:hover:bg-white/10"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                        }}
                      >
                        {digit}
                      </button>
                    ))}

                    {/* Clear Button */}
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handlePinClear}
                      className="h-14 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all active:scale-95 border opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        color: isDark ? '#94A3B8' : '#64748B',
                      }}
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => handlePinDigit('0')}
                      className="h-14 rounded-2xl font-bold text-xl flex items-center justify-center transition-all active:scale-95 border hover:bg-black/5 dark:hover:bg-white/10"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                      }}
                    >
                      0
                    </button>

                    {/* Backspace Button */}
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handlePinBackspace}
                      className="h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 border opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        color: isDark ? '#94A3B8' : '#64748B',
                      }}
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Alternative: Password Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode('password');
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Use Password instead
                  </button>
                </div>
              ) : (
                /* Mode: Password Entry */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitAuth();
                  }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <input
                      autoFocus
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none border transition-all"
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 opacity-50 hover:opacity-100"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying || !password}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all shadow-lg flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      opacity: isVerifying || !password ? 0.7 : 1,
                    }}
                  >
                    {isVerifying ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        Clock In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode('pin');
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      ← Back to PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-medium opacity-60 hover:opacity-100"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SUCCESS TRANSITION CURTAIN ── */}
      <AnimatePresence>
        {isSuccessTransition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)'
                : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center shadow-2xl">
                <ShieldCheck className="w-10 h-10 text-emerald-400" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-1">
                  Access Granted • On Duty
                </p>
                <h2
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: isDark ? '#FFFFFF' : '#064E3B' }}
                >
                  Welcome, {selectedStaff?.name || 'Staff Member'}!
                </h2>
                <p className="text-sm opacity-70 mt-1">
                  {selectedStaff?.branch?.name || 'Azzay Pharmacy Pro NEXUS'}
                </p>
              </div>

              <div className="w-48 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.65, ease: 'easeInOut' }}
                  className="h-full bg-emerald-400 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Change Modal */}
      <AnimatePresence>
        {showPinChangeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPinChangeModal(false);
                setNewPin('');
                setConfirmPin('');
                setError(null);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <h3 className="text-lg font-bold mb-1">Set your new PIN</h3>
              <p className="text-xs opacity-70 mb-4 leading-relaxed">
                Your manager gave you a temporary PIN. Please choose a new 4-6 digit PIN now.
              </p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1.5 block">New PIN</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-6 digits"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border tracking-widest text-center"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1.5 block">Confirm PIN</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter PIN"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border tracking-widest text-center"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  />
                </div>
              </div>
              {error && (
                <div className="mb-4 p-2.5 rounded-xl text-xs font-semibold text-center bg-red-500/10 border border-red-500/30 text-red-500">
                  {error}
                </div>
              )}
              <button
                onClick={async () => {
                  setError(null);
                  if (!/^\d{4,6}$/.test(newPin)) {
                    setError('PIN must be 4 to 6 digits');
                    return;
                  }
                  if (newPin !== confirmPin) {
                    setError('PINs do not match');
                    return;
                  }
                  try {
                    await gql<{ setStaffPin: boolean }>(M_SET_STAFF_PIN, { userId: pinChangeUser?.id, pin: newPin, forceChange: false });
                    setIsSuccessTransition(true);
                    setTimeout(() => {
                      window.location.href = '/dashboard';
                    }, 700);
                  } catch (err: any) {
                    setError(err?.message || 'Failed to set PIN. Please try again.');
                  }
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm"
              >
                Save PIN & Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotPassword(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <h3 className="text-lg font-bold mb-2">Need help logging in?</h3>
              <p className="text-xs opacity-70 mb-4 leading-relaxed">
                Contact your store manager or administrator to reset your PIN or account credentials.
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
