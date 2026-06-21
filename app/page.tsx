'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, OrbitControls, Sphere, Trail, MeshDistortMaterial, Stars, Torus } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useCustomAuth } from '@/lib/custom-auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import * as THREE from 'three';
import { gql, Q_LOGIN_STAFF, M_CHANGE_PASSWORD, M_FORGOT_PASSWORD, M_UPDATE_DUTY_STATUS } from '@/lib/gql';
import { saveToCache, getFromCache } from '@/lib/offline';
import { StaffMember } from '@/lib/store';

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

// ── Staff Selector Modal ───────────────────────────────────────────────────
function StaffSelectorModal({ 
  show, 
  onClose, 
  onSelect, 
  staff, 
  isDark 
}: { 
  show: boolean; 
  onClose: () => void; 
  onSelect: (email: string) => void; 
  staff: any[];
  isDark: boolean;
}) {
  const [search, setSearch] = useState('');
  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'MANAGER': return isDark ? '#FBBF24' : '#F59E0B'; // Amber
      case 'PHARMACIST': return isDark ? '#10B981' : '#059669'; // Emerald
      case 'HEAD_PHARMACIST': return isDark ? '#00D9FF' : '#0EA5E9'; // Cyan
      case 'OWNER': return isDark ? '#F472B6' : '#EC4899'; // Pink
      default: return isDark ? '#94A3B8' : '#64748B'; // Slate
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg rounded-[32px] overflow-hidden border"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Select Your Profile</h2>
                  <p className="text-sm opacity-60" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Tap to quickly fill your email</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }} />
                </button>
              </div>

              <div className="relative mb-6">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search name or role..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none border transition-all"
                  style={{
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: isDark ? '#F8FAFC' : '#0F172A'
                  }}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {filteredStaff.length === 0 ? (
                  <div className="py-10 text-center opacity-40">No profiles found</div>
                ) : filteredStaff.map((person, idx) => (
                  <motion.div
                    key={person.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onSelect(person.email)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="group cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: isDark ? '#00D9FF' : '#0EA5E9' }}>
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg" style={{ background: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)', color: isDark ? '#00D9FF' : '#0EA5E9' }}>
                          {person.name[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-sm" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>{person.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" 
                          style={{ background: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)', color: isDark ? '#00D9FF' : '#0EA5E9' }}>
                          {person.branch?.name || 'Branch not assigned'}
                        </span>
                        <span className="text-[11px] opacity-40" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{person.email}</span>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Particle Field ─────────────────────────────────────────────────────────
function ParticleField({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const count = 800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  useFrame((s: any) => {
    elapsed.current += s.delta;
    if (ref.current) ref.current.rotation.y = elapsed.current * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={isDark ? '#00D9FF' : '#0EA5E9'} transparent opacity={isDark ? 0.6 : 0.4} sizeAttenuation />
    </points>
  );
}

// ── DNA Double Helix ────────────────────────────────────────────────────────
function DNAHelix({ isDark, pos, scale = 1 }: { isDark: boolean, pos: [number, number, number], scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const N = 60;
  const R = 1.2;
  const H = 10;

  useFrame((s: any) => {
    elapsed.current += s.delta;
    if (group.current) {
      group.current.rotation.y = elapsed.current * 0.15;
      group.current.position.y = pos[1] + Math.sin(elapsed.current * 0.3) * 0.5;
    }
  });

  const nodes: React.ReactElement[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 5;
    const y = (i / N) * H - H / 2;
    const x1 = Math.cos(t) * R, z1 = Math.sin(t) * R;
    const x2 = Math.cos(t + Math.PI) * R, z2 = Math.sin(t + Math.PI) * R;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.5);

    nodes.push(
      <Sphere key={`a${i}`} position={[x1, y, z1]} args={[0.09, 12, 12]}>
        <meshStandardMaterial color={isDark ? '#00D9FF' : '#0284C7'} emissive={isDark ? '#00D9FF' : '#0284C7'} emissiveIntensity={isDark ? 0.6 : 0.2} metalness={0.9} roughness={0.1} />
      </Sphere>,
      <Sphere key={`b${i}`} position={[x2, y, z2]} args={[0.09, 12, 12]}>
        <meshStandardMaterial color={isDark ? '#A78BFA' : '#7C3AED'} emissive={isDark ? '#A78BFA' : '#7C3AED'} emissiveIntensity={isDark ? 0.6 : 0.2} metalness={0.9} roughness={0.1} />
      </Sphere>
    );
    if (i % 4 === 0) {
      nodes.push(
        <mesh key={`r${i}`} position={[(x1+x2)/2, y, (z1+z2)/2]} rotation={[0, t, 0]}>
          <cylinderGeometry args={[0.025, 0.025, R * 2, 6]} />
          <meshStandardMaterial color={isDark ? '#10B981' : '#059669'} emissive={isDark ? '#10B981' : '#059669'} emissiveIntensity={isDark ? 0.5 : 0.15} transparent opacity={0.85} />
        </mesh>
      );
    }
  }
  return <group ref={group} position={pos} scale={scale}>{nodes}</group>;
}

// ── Orbiting Molecules ──────────────────────────────────────────────────────
function Molecule({ pos, color, speed, distort }: { pos: [number,number,number]; color: string; speed: number; distort: number }) {
  return (
    <Float speed={speed} rotationIntensity={0.6} floatIntensity={0.5}>
      <Sphere position={pos} args={[0.28, 32, 32]}>
        <MeshDistortMaterial color={color} speed={speed * 1.5} distort={distort} metalness={0.4} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
      </Sphere>
    </Float>
  );
}

// ── Rotating Torus (pill shape) ─────────────────────────────────────────────
function PillRing({ isDark, pos, scale = 1 }: { isDark: boolean, pos: [number, number, number], scale?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  useFrame((s: any) => {
    elapsed.current += s.delta;
    if (ref.current) {
      ref.current.rotation.x = elapsed.current * 0.25;
      ref.current.rotation.z = elapsed.current * 0.15;
    }
  });
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={ref} position={pos} scale={scale}>
        <torusGeometry args={[1.1, 0.12, 16, 60]} />
        <meshStandardMaterial color={isDark ? '#F472B6' : '#EC4899'} emissive={isDark ? '#F472B6' : '#EC4899'} emissiveIntensity={isDark ? 0.5 : 0.4} metalness={isDark ? 0.7 : 0.3} roughness={isDark ? 0.2 : 0.4} wireframe />
      </mesh>
    </Float>
  );
}

// ── Cross / Plus (medical symbol) ──────────────────────────────────────────
function MedicalCross({ isDark, pos, scale = 1, rotationSpeed = 1 }: { isDark: boolean, pos: [number, number, number], scale?: number, rotationSpeed?: number }) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((s: any) => {
    elapsed.current += s.delta;
    if (ref.current) {
      ref.current.rotation.z = elapsed.current * 0.2 * rotationSpeed;
      ref.current.rotation.x = elapsed.current * 0.1 * rotationSpeed;
    }
  });
  const mat = <meshStandardMaterial color={isDark ? '#34D399' : '#059669'} emissive={isDark ? '#34D399' : '#059669'} emissiveIntensity={isDark ? 0.7 : 0.4} metalness={isDark ? 0.6 : 0.3} roughness={isDark ? 0.2 : 0.4} />;
  return (
    <Float speed={1.2 * rotationSpeed} rotationIntensity={0.3} floatIntensity={1.5}>
      <group ref={ref} position={pos} scale={scale}>
        <mesh><boxGeometry args={[0.18, 1.2, 0.18]} />{mat}</mesh>
        <mesh><boxGeometry args={[1.2, 0.18, 0.18]} />{mat}</mesh>
      </group>
    </Float>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────
function Capsule3D({ pos, color1, color2, speed, isDark, scale = 1, rotation = [0,0,0] }: { pos: [number,number,number]; color1: string; color2: string; speed: number; isDark: boolean, scale?: number, rotation?: [number,number,number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s: any) => {
    if (ref.current) {
      ref.current.rotation.x += s.delta * 0.2 * speed;
      ref.current.rotation.y += s.delta * 0.3 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.8} floatIntensity={1}>
      <group ref={ref} position={pos} scale={scale} rotation={rotation}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.7, 16]} />
          <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={isDark ? 0.5 : 0.2} metalness={isDark ? 0.4 : 0.2} roughness={isDark ? 0.3 : 0.4} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={isDark ? 0.5 : 0.2} metalness={isDark ? 0.4 : 0.2} roughness={isDark ? 0.3 : 0.4} />
        </mesh>
        
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.7, 16]} />
          <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={isDark ? 0.5 : 0.2} metalness={isDark ? 0.4 : 0.2} roughness={isDark ? 0.3 : 0.4} />
        </mesh>
        <mesh position={[0, -0.7, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={isDark ? 0.5 : 0.2} metalness={isDark ? 0.4 : 0.2} roughness={isDark ? 0.3 : 0.4} />
        </mesh>
      </group>
    </Float>
  );
}

// ── Tablet ──────────────────────────────────────────────────────────────────
function Tablet3D({ pos, color, speed, isDark, scale = 1, rotation = [0,0,0] }: { pos: [number,number,number]; color: string; speed: number; isDark: boolean, scale?: number, rotation?: [number,number,number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s: any) => {
    if (ref.current) {
      ref.current.rotation.x += s.delta * 0.4 * speed;
      ref.current.rotation.z += s.delta * 0.2 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={ref} position={pos} scale={scale} rotation={rotation}>
        <cylinderGeometry args={[0.4, 0.4, 0.15, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDark ? 0.4 : 0.2} metalness={isDark ? 0.2 : 0.1} roughness={isDark ? 0.3 : 0.4} />
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
           <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
           <meshStandardMaterial color={isDark ? "#000" : "#fff"} opacity={0.15} transparent />
        </mesh>
      </mesh>
    </Float>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────
function Scene({ isDark }: { isDark: boolean }) {
  return (
    <>
      <color attach="background" args={[isDark ? '#060B14' : '#EFF6FF']} />
      <fog attach="fog" args={[isDark ? '#060B14' : '#EFF6FF', 8, 28]} />

      <ambientLight intensity={isDark ? 0.25 : 1.2} />
      <pointLight position={[8, 8, 8]}   intensity={isDark ? 3 : 2.5}   color={isDark ? '#00D9FF' : '#0EA5E9'} />
      <pointLight position={[-8,-6,-4]}  intensity={isDark ? 2 : 1.8} color={isDark ? '#A78BFA' : '#8B5CF6'} />
      <pointLight position={[0, 12, 0]}  intensity={isDark ? 2.5 : 2} color={isDark ? '#10B981' : '#059669'} />
      <pointLight position={[-5, 0, 5]}  intensity={isDark ? 1.5 : 1.5} color={isDark ? '#F472B6' : '#EC4899'} />

      <ParticleField isDark={isDark} />
      
      {/* Spread DNA Helix to the left so it's not hidden */}
      <DNAHelix isDark={isDark} pos={[-7, 0, -5]} scale={0.8} />
      
      {/* Pills and Medical Crosses placed around the outer edges */}
      <PillRing isDark={isDark} pos={[-5.5, 3.5, -2]} scale={0.7} />
      <PillRing isDark={isDark} pos={[6, -2, -3]} scale={0.9} />
      
      <MedicalCross isDark={isDark} pos={[5, 2.5, -1]} scale={0.6} />
      <MedicalCross isDark={isDark} pos={[-6, -3, 1]} scale={0.5} rotationSpeed={1.5} />

      {/* New Capsules */}
      <Capsule3D isDark={isDark} pos={[-5, 0.5, 2]} color1={isDark ? '#00D9FF' : '#0EA5E9'} color2="#ffffff" speed={1.2} scale={0.8} />
      <Capsule3D isDark={isDark} pos={[4.5, -1.5, 3]} color1={isDark ? '#A78BFA' : '#8B5CF6'} color2={isDark ? '#F472B6' : '#EC4899'} speed={1.5} scale={0.6} rotation={[Math.PI/4, 0, 0]} />
      <Capsule3D isDark={isDark} pos={[6.5, 4, -4]} color1={isDark ? '#34D399' : '#10B981'} color2="#ffffff" speed={1.8} scale={0.5} />

      {/* New Tablets */}
      <Tablet3D isDark={isDark} pos={[-4, 4, -1]} color={isDark ? '#FBBF24' : '#F59E0B'} speed={1.1} scale={0.8} />
      <Tablet3D isDark={isDark} pos={[5.5, 0.5, 2]} color={isDark ? '#60A5FA' : '#3B82F6'} speed={1.4} scale={0.7} rotation={[0, Math.PI/3, 0]} />
      <Tablet3D isDark={isDark} pos={[-4.5, -2.5, -1]} color={isDark ? '#F472B6' : '#EC4899'} speed={1.7} scale={0.6} />

      {/* Scattered Molecules */}
      <Molecule pos={[6, 1.5, 0]}   color={isDark ? '#F472B6' : '#EC4899'} speed={1.8} distort={0.35} />
      <Molecule pos={[-5,-1.5, 3]}  color={isDark ? '#FBBF24' : '#F59E0B'} speed={1.4} distort={0.4}  />
      <Molecule pos={[4.5,-3.5,-2]} color={isDark ? '#34D399' : '#10B981'} speed={2.1} distort={0.3}  />
      <Molecule pos={[-5, 2.5, -3]} color={isDark ? '#60A5FA' : '#3B82F6'} speed={1.6} distort={0.45} />

      {isDark && <Stars radius={80} depth={40} count={3000} factor={3} saturation={0} fade speed={0.8} />}

      <EffectComposer>
        <Bloom luminanceThreshold={isDark ? 0.15 : 0.7} intensity={isDark ? 2.2 : 0.6} levels={8} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={isDark ? 0.65 : 0.2} />
      </EffectComposer>
    </>
  );
}

import { Search, X, ChevronRight, Eye, EyeOff, Lock, AlertTriangle, Sparkles, KeyRound } from 'lucide-react';

// ── Password Change Modal ─────────────────────────────────────────────────────
function PasswordChangeModal({ 
  show, 
  onClose, 
  email, 
  currentPassword, 
  isFirstTime, 
  onSuccess, 
  isDark 
}: {
  show: boolean;
  onClose: () => void;
  email: string;
  currentPassword: string;
  isFirstTime: boolean;
  onSuccess: () => void;
  isDark: boolean;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await gql<{ changePassword?: boolean }>(M_CHANGE_PASSWORD, {
        currentPassword,
        newPassword
      });

      if (result?.changePassword) {
        onSuccess();
      } else {
        setError('Failed to change password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden border"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {isFirstTime ? 'Set Your Password' : 'Change Password'}
                  </h2>
                  <p className="text-sm opacity-60" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    {isFirstTime ? 'Choose a secure password for your account' : 'Update your account password'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }} />
                </button>
              </div>

              {isFirstTime && (
                <div className="mb-4 p-3 rounded-lg flex items-start gap-3" 
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: '#F59E0B' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>First-time Login</p>
                    <p className="text-xs" style={{ color: isDark ? '#FCD34D' : '#D97706' }}>
                      You're using a temporary password. Please set a new password to continue.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm" 
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>New Password</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        border: '1px solid'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        border: '1px solid'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                    color: isDark ? '#0A0E1A' : '#fff',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Forgot Password Modal ───────────────────────────────────────────────────────
function ForgotPasswordModal({ 
  show, 
  onClose, 
  isDark 
}: {
  show: boolean;
  onClose: () => void;
  isDark: boolean;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await gql<{ forgotPassword?: boolean }>(M_FORGOT_PASSWORD, { email });
      
      if (result?.forgotPassword) {
        setMessage({
          type: 'success',
          text: 'Password reset link sent! Check your email inbox.'
        });
        setTimeout(() => onClose(), 3000);
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to send reset link. Please try again.'
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden border"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    Forgot Password
                  </h2>
                  <p className="text-sm opacity-60" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Enter your email to receive a reset link
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }} />
                </button>
              </div>

              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Email Address</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      border: '1px solid'
                    }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                    color: isDark ? '#0A0E1A' : '#fff',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Login Page ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken]       = useState('');
  const [loginMode, setLoginMode] = useState<'token' | 'password'>('password');
  const [tokenStepVisible, setTokenStepVisible] = useState(false);
  const [passwordStepVisible, setPasswordStepVisible] = useState(false);
  const [tokenSent, setTokenSent] = useState(false);
  const [tokenSending, setTokenSending] = useState(false);
  const [tokenCooldown, setTokenCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const [staff, setStaff]       = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(false);
  const [isSuccessTransition, setIsSuccessTransition] = useState(false);
  
  const { signIn, requestLoginToken, verifyLoginToken, signOut } = useCustomAuth();
  const router                  = useRouter();
  const { resolvedTheme }       = useTheme();
  const passwordRef             = useRef<HTMLInputElement>(null);
  const tokenRef                = useRef<HTMLInputElement>(null);
  const isFetchingRef           = useRef(false);

  useEffect(() => {
    setMounted(true);
    fetchStaff();
  }, []);

  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (loginMode === 'token') {
      setPasswordStepVisible(false);
      if (!cleanEmail) {
        setTokenStepVisible(false);
        setTokenSent(false);
        setToken('');
      } else {
        setTokenStepVisible(true);
        // Auto-send OTP when email is valid and no cooldown active
        if (tokenCooldown <= 0 && !tokenSent && !tokenSending) {
          handleSendToken(cleanEmail, true);
        }
      }
    } else {
      setTokenStepVisible(false);
      setTokenSent(false);
      setToken('');
      if (!cleanEmail) {
        setPasswordStepVisible(false);
      } else {
        setPasswordStepVisible(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, loginMode]);

  useEffect(() => {
    if (tokenCooldown <= 0) return;
    const timer = setInterval(() => {
      setTokenCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tokenCooldown]);

  useEffect(() => {
    if (loginMode === 'token' && tokenStepVisible) {
      setTimeout(() => tokenRef.current?.focus(), 180);
    }
  }, [loginMode, tokenStepVisible]);

  const fetchStaff = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const cached = await getFromCache('staff_cache');
      if (cached?.length) setStaff(cached);

      const data = await gql<{ loginStaff?: StaffMember[] }>(Q_LOGIN_STAFF);
      if (data?.loginStaff) {
        setStaff(data.loginStaff);
        await saveToCache('staff_cache', data.loginStaff);
      }
    } catch (e) {
      console.error("Failed to fetch staff list", e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const isDark = !mounted || resolvedTheme === 'dark';
  const selectedStaff = staff.find((member: any) => member.email?.toLowerCase() === email.trim().toLowerCase());
  const selectedPhone = selectedStaff?.phone?.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (loginMode === 'token') {
      const cleanToken = token.trim();
      if (DEBUG_AUTH) {
        console.log('[AUTH][UI] Verify attempt', {
          email,
          hasPhone: !!selectedPhone,
          tokenLength: cleanToken.length,
        });
      }
      if (!/^\d{6}$/.test(cleanToken)) {
        setError('Enter the 6-digit login token sent to you.');
        setLoading(false);
        return;
      }

      const { data, error: err } = await verifyLoginToken({
        email,
        token: cleanToken,
        phone: selectedPhone,
      });

      if (err) {
        if (DEBUG_AUTH) {
          console.error('[AUTH][UI] Verify failed', { error: err });
        }
        setError(err);
        setLoading(false);
      } else {
        if (DEBUG_AUTH) {
          console.log('[AUTH][UI] Verify succeeded');
        }
        
        if (data?.user?.id) {
          try {
            await gql(M_UPDATE_DUTY_STATUS, { userId: data.user.id, isOnDuty: true });
          } catch (e) {
            console.error('[AUTH] Failed to auto-clock in', e);
          }
        }

        setIsSuccessTransition(true);
        setTimeout(() => {
          router.replace('/dashboard');
        }, 900);
      }
    } else {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      const { data, error: err } = await signIn(cleanEmail, cleanPassword);
      if (err) {
        if (err.includes('Invalid login credentials') || err.includes('Invalid email or password')) {
          setError('Invalid credentials. If you are a new staff member, please ask your manager to set up your account.');
        } else if (err.includes('refresh token') || err.includes('session')) {
          setError('Session expired. Please refresh the page and try again.');
        } else if (err.includes('Service temporarily') || err.includes('unavailable')) {
          setError('The system is temporarily unavailable. Please try again in a moment.');
        } else {
          setError('Login failed. Please check your credentials or use token login.');
        }
        setLoading(false);
      } else {
        // Check if this is a temporary password (starts with "Azzay@")
        if (cleanPassword.startsWith('Azzay@')) {
          setIsFirstTimeLogin(true);
          setShowPasswordChangeModal(true);
          setLoading(false);
        } else {
          if (data?.user?.id) {
            try {
              await gql(M_UPDATE_DUTY_STATUS, { userId: data.user.id, isOnDuty: true });
            } catch (e) {
              console.error('[AUTH] Failed to auto-clock in', e);
            }
          }

          setIsSuccessTransition(true);
          setTimeout(() => {
            router.replace('/dashboard');
          }, 900);
        }
      }
    }
  };

  const handleSendToken = async (emailOverride?: string, silent = false) => {
    if (!silent) setError(null);
    const targetEmail = (emailOverride ?? email).trim();

    if (!targetEmail) {
      setError('Please select or enter your email first.');
      return;
    }

    if (tokenCooldown > 0) {
      setError(`Please wait ${tokenCooldown}s before requesting another code.`);
      return;
    }

    if (DEBUG_AUTH) {
      console.log('[AUTH][UI] Request token', {
        email: targetEmail,
        hasPhone: !!selectedPhone,
        silent,
      });
    }

    setTokenSending(true);
    const { error: err } = await requestLoginToken({
      email: targetEmail,
      phone: selectedPhone,
    });
    setTokenSending(false);

    if (err) {
      if (DEBUG_AUTH) {
        console.error('[AUTH][UI] Request token failed', { error: err });
      }
      if (err.toLowerCase().includes('rate limit')) {
        setTokenCooldown(60);
        setError('Email rate limit exceeded. Please wait about 60 seconds, then resend. You can use password login immediately.');
        return;
      }
      setError(err);
      return;
    }

    if (DEBUG_AUTH) {
      console.log('[AUTH][UI] Request token succeeded');
    }
    setTokenSent(true);
    setTokenCooldown(60);
    // Auto-focus token input after send
    setTimeout(() => tokenRef.current?.focus(), 120);
  };

  const handleStaffSelect = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setShowStaffModal(false);
    if (loginMode === 'password') {
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  };

  const inputStyle = (field: string) => ({
    background: isDark ? 'rgba(6,11,20,0.6)' : 'rgba(255,255,255,0.9)',
    border: `1.5px solid ${focused === field ? (isDark ? '#00D9FF' : '#0EA5E9') : isDark ? 'rgba(148,163,184,0.15)' : 'rgba(203,213,225,0.6)'}`,
    color: isDark ? '#F8FAFC' : '#0F172A',
    boxShadow: focused === field ? `0 0 0 3px ${isDark ? 'rgba(0,217,255,0.12)' : 'rgba(14,165,233,0.12)'}` : 'none',
    transition: 'all 0.2s ease',
  });

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">

      {/* Staff Selector Modal */}
      <StaffSelectorModal 
        show={showStaffModal} 
        onClose={() => setShowStaffModal(false)}
        onSelect={handleStaffSelect}
        staff={staff}
        isDark={isDark}
      />

      {/* ── 3D CANVAS ── */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 13], fov: 52 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <Scene isDark={isDark} />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.25} maxPolarAngle={Math.PI * 0.55} minPolarAngle={Math.PI * 0.45} />
        </Canvas>
      </div>

      {/* ── AMBIENT GLOW ORBS ── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(0,217,255,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: isDark ? 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* ── LOGIN CARD ── */}
      <motion.div
        className="relative z-10 w-full max-w-[420px] mx-4"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card glow */}
        <div className="absolute -inset-1 rounded-[28px] opacity-40 blur-2xl pointer-events-none"
          style={{ background: isDark ? 'linear-gradient(135deg, rgba(0,217,255,0.3), rgba(167,139,250,0.3))' : 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(139,92,246,0.2))' }} />

        <div className="relative rounded-[24px] border overflow-hidden"
          style={{
            background: isDark ? 'rgba(6,11,20,0.82)' : 'rgba(255,255,255,0.88)',
            borderColor: isDark ? 'rgba(0,217,255,0.18)' : 'rgba(14,165,233,0.25)',
            backdropFilter: 'blur(32px) saturate(180%)',
            boxShadow: isDark
              ? '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 32px 64px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}>

          {/* Top accent line */}
          <div className="h-[2px] w-full"
            style={{ background: isDark ? 'linear-gradient(90deg, transparent, #00D9FF, #A78BFA, transparent)' : 'linear-gradient(90deg, transparent, #0EA5E9, #8B5CF6, transparent)' }} />

          <div className="p-6 md:p-8">
            {/* Logo */}
            <motion.div className="flex flex-col items-center mb-8"
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                  style={{ background: isDark ? 'radial-gradient(circle, #00D9FF, #A78BFA)' : 'radial-gradient(circle, #0EA5E9, #8B5CF6)' }} />
                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    background: isDark ? 'linear-gradient(135deg, rgba(0,217,255,0.12), rgba(167,139,250,0.12))' : 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(139,92,246,0.1))',
                    border: `2px solid ${isDark ? 'rgba(0,217,255,0.35)' : 'rgba(14,165,233,0.35)'}`,
                    boxShadow: isDark ? '0 0 30px rgba(0,217,255,0.25)' : '0 0 20px rgba(14,165,233,0.2)',
                  }}>
                  <img src="/azzay-logo.png" alt="Azzay" className="w-14 h-14 object-contain" />
                </div>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight mb-1"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A', textShadow: isDark ? '0 0 30px rgba(0,217,255,0.2)' : 'none' }}>
                Azzay Pharmacy
              </h1>
              <p className="text-sm font-medium mb-3" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                AI-Powered Pharmaceutical Intelligence
              </p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.08)', color: isDark ? '#34D399' : '#059669', border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : 'rgba(5,150,105,0.2)'}` }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: isDark ? '#34D399' : '#059669' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: isDark ? '#34D399' : '#059669' }} />
                </span>
                NEXUS v2.0 · Online
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div className="mb-5 p-3.5 rounded-xl text-sm font-medium text-center"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form onSubmit={handleSubmit} className="space-y-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Email Address</label>
                <div className="relative group">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="staff@azzay.app"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none cursor-pointer"
                    style={inputStyle('email')}
                    onFocus={() => { setFocused('email'); setShowStaffModal(true); }} 
                    onClick={() => setShowStaffModal(true)}
                    onBlur={() => setFocused(null)} />
                  
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity bg-white/5 border border-white/10"
                    onClick={() => setShowStaffModal(true)}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
              {loginMode === 'token' ? (
                <AnimatePresence initial={false}>
                  {tokenStepVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider"
                          style={{ color: isDark ? '#94A3B8' : '#64748B' }}>6-Digit Login Token</label>
                        <button
                          type="button"
                          onClick={() => handleSendToken()}
                          disabled={tokenSending || tokenCooldown > 0}
                          className="text-[11px] font-semibold"
                          style={{ color: tokenSending || tokenCooldown > 0 ? (isDark ? '#64748B' : '#94A3B8') : (isDark ? '#00D9FF' : '#0EA5E9') }}
                        >
                          {tokenSending ? 'Sending...' : tokenCooldown > 0 ? `Resend in ${tokenCooldown}s` : tokenSent ? 'Resend code' : 'Send code'}
                        </button>
                      </div>
                      <p className="text-[11px] mb-2" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                        {tokenSent
                          ? <span style={{ color: isDark ? '#34D399' : '#059669' }}>✓ Code sent to your email{selectedPhone ? ' & SMS' : ''}. Enter it below.</span>
                          : tokenSending
                            ? 'Sending your login code…'
                            : 'We send your code to email and SMS (if your phone is on file).'}
                      </p>
                      <input
                        ref={tokenRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required={tokenStepVisible}
                        placeholder="000000"
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium tracking-[0.35em] text-center focus:outline-none"
                        style={inputStyle('token')}
                        onFocus={() => setFocused('token')}
                        onBlur={() => setFocused(null)}
                      />

                      <div className="pt-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setLoginMode('password');
                          }}
                          className="text-xs font-medium inline-flex items-center gap-1.5"
                          style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
                        >
                          <KeyRound size={12} />
                          Prefer password? Click here
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <AnimatePresence initial={false}>
                  {passwordStepVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mb-2">
                        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                          style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Password</label>
                        <div className="relative group">
                          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                            style={inputStyle('password')}
                            onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />

                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setLoginMode('token');
                          }}
                          className="text-xs font-medium inline-flex items-center gap-1.5"
                          style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
                        >
                          <KeyRound size={12} />
                          Prefer token login? Click here
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              <motion.button suppressHydrationWarning type="submit"
                disabled={!mounted || loading || tokenSending
                  || (loginMode === 'token' && (!tokenStepVisible || !tokenSent || token.length !== 6))
                  || (loginMode === 'password' && !passwordStepVisible)}
                className="w-full py-3.5 rounded-xl font-bold text-sm relative overflow-hidden"
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                style={{
                  backgroundImage: isDark ? 'linear-gradient(135deg, #00D9FF 0%, #0099BB 50%, #00D9FF 100%)' : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 50%, #0EA5E9 100%)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  color: isDark ? '#060B14' : '#FFFFFF',
                  boxShadow: isDark ? '0 8px 32px rgba(0,217,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 8px 32px rgba(14,165,233,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {loginMode === 'token' ? 'Verifying Token...' : 'Authenticating...'}
                  </span>
                ) : tokenSending ? (
                  'Preparing token...'
                ) : (loginMode === 'token' ? 'Verify & Access NEXUS' : 'Access NEXUS Terminal')}
              </motion.button>
            </motion.form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t text-center"
              style={{ borderColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(203,213,225,0.3)' }}>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
              >
                Forgot your password?
              </button>
              <p className="text-[11px] font-medium mt-3" style={{ color: isDark ? '#334155' : '#CBD5E1' }}>
                Secured by Supabase Auth · Powered by Gemini AI · Ghana 🇬🇭
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChangeModal && (
          <PasswordChangeModal 
            show={showPasswordChangeModal}
            onClose={() => {
              setShowPasswordChangeModal(false);
              setIsFirstTimeLogin(false);
              // Sign out user if they cancel password change
              if (isFirstTimeLogin) {
                signOut();
              }
            }}
            email={email}
            currentPassword={password}
            isFirstTime={isFirstTimeLogin}
            onSuccess={() => router.push('/dashboard')}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <ForgotPasswordModal 
            show={showForgotPassword}
            onClose={() => setShowForgotPassword(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* ── SUCCESS TRANSITION CURTAIN ── */}
      <AnimatePresence>
        {isSuccessTransition && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] flex items-center justify-center shadow-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, #0A0E1A 0%, #00D9FF 100%)'
                : 'linear-gradient(180deg, #F8FAFC 0%, #0EA5E9 100%)'
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col items-center gap-6"
              style={{ color: isDark ? '#fff' : '#0F172A' }}
            >
              <div className="p-5 rounded-3xl" style={{ background: isDark ? 'rgba(0,217,255,0.2)' : 'rgba(14,165,233,0.1)' }}>
                <Sparkles className="w-12 h-12" style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium uppercase tracking-widest mb-1 opacity-60">
                  {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
                  {staff.find(s => s.email === email)?.name
                    ? `Welcome, ${staff.find(s => s.email === email)!.name.split(' ')[0]}!`
                    : 'Welcome to NEXUS'}
                </h2>
                <p className="text-sm opacity-50 mt-2">
                  {staff.find(s => s.email === email)?.branch?.name || 'Branch not assigned'}
                </p>
              </div>
              <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="h-full rounded-full"
                  style={{ background: isDark ? '#00D9FF' : '#0EA5E9' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
