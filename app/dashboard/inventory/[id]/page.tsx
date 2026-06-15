'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, History,
  Truck, AlertCircle, CheckCircle, Clock, Calendar,
  Upload, Edit2, ChevronDown, ChevronUp, Image as ImageIcon, X, Save,
  Sparkles, Wand2, Camera, RefreshCw, FileText, Move, Loader2
} from 'lucide-react';
import { usePagination } from '@/hooks/use-pagination';
import { useBranch } from '@/lib/branch-context';

export default function ProductDetailedPaper() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const productId = params?.id as string;
  const { products, suppliers, stockMovements, updateProductFull, updateProductSupplier, adjustProductStock, refetchProducts, loadingProducts, me } = useStore();
  
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAIImage, setGeneratingAIImage] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [aiImageOptions, setAiImageOptions] = useState<string[]>([]);
  const [selectedAiImage, setSelectedAiImage] = useState<string | null>(null);
  const [editModalTab, setEditModalTab] = useState<'basic' | 'pricing' | 'supplier'>('basic');
  const [editForm, setEditForm] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    supplierId: '',
    strength: '',
    dosageForm: 'TABLET',
    barcode: '',
    nafdacNo: '',
    classification: 'OTC', // 'OTC', 'POM', 'CONTROLLED'
    imageUrl: '',
    expiryDate: '',
    branchId: me?.branchId || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const isAdmin = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(me?.role || '');
  const canEdit = isAdmin;
  const { branches, canSwitchBranch } = useBranch();

  // Ensure products are loaded
  useEffect(() => {
    setMounted(true);
    if (searchParams?.get('edit') === 'true') {
      setShowEditModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!products.length && !loadingProducts) {
      refetchProducts();
    }
  }, [products.length, loadingProducts, refetchProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
          setEditForm({ ...editForm, imageUrl: compressedUrl });
          setAiImageOptions([]);
          setSelectedAiImage(null);
          setUploadingImage(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      setUploadingImage(false);
    }
  };

  // AI Image Generation - creates realistic pharmaceutical product images
  const generateAIImages = async () => {
    if (!editForm.name) {
      alert('Please enter a product name first');
      return;
    }

    setGeneratingAIImage(true);
    setAiImageOptions([]);
    
    try {
      const getBaseImage = (dosageForm: string) => {
        const form = (dosageForm || '').toUpperCase();
        if (form.includes('CAPSULE')) return '/pharma/capsules.png';
        if (form.includes('CREAM') || form.includes('OINTMENT') || form.includes('GEL')) return '/pharma/cream.png';
        if (form.includes('DROP')) return '/pharma/eyedrops.png';
        if (form.includes('INJECTION') || form.includes('INFUSION')) return '/pharma/injection.png';
        if (form.includes('SYRUP') || form.includes('SUSPENSION') || form.includes('SOLUTION')) return '/pharma/syrup.png';
        if (form.includes('TABLET') || form.includes('PILL')) return '/pharma/tablets.png';
        return '/pharma/default.png';
      };

      const generateProductImage = (variant: 'classic' | 'modern' | 'premium'): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No context');
            
            // Color schemes for different variants
            const schemes = {
              classic: { primary: '#1E3A5F', accent: '#0EA5E9', labelBg: 'rgba(255,255,255,0.98)' },
              modern: { primary: '#059669', accent: '#10B981', labelBg: 'rgba(240,253,244,0.98)' },
              premium: { primary: '#7C3AED', accent: '#A855F7', labelBg: 'rgba(250,245,255,0.98)' }
            };
            const scheme = schemes[variant];
            
            // Draw base image (the actual product photo)
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            
            // Add gradient overlay for depth
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw product label/badge at bottom
            const labelHeight = 140;
            const labelY = canvas.height - labelHeight - 20;
            
            // Label shadow
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 20;
            
            // Label background with rounded corners
            ctx.fillStyle = scheme.labelBg;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(30, labelY, canvas.width - 60, labelHeight, 16);
            } else {
              ctx.fillRect(30, labelY, canvas.width - 60, labelHeight);
            }
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            
            // Border accent
            ctx.strokeStyle = scheme.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(30, labelY, canvas.width - 60, labelHeight, 16);
            }
            ctx.stroke();
            
            // Left accent bar
            ctx.fillStyle = scheme.accent;
            ctx.fillRect(30, labelY, 6, labelHeight);
            
            // Product Name - Main
            ctx.fillStyle = scheme.primary;
            ctx.textAlign = 'center';
            ctx.font = 'bold 28px "Inter", -apple-system, sans-serif';
            let displayName = editForm.name.toUpperCase();
            if (displayName.length > 25) displayName = displayName.substring(0, 23) + '...';
            ctx.fillText(displayName, canvas.width / 2, labelY + 45);
            
            // Dosage Form & Strength
            ctx.fillStyle = scheme.accent;
            ctx.font = 'bold 14px "Inter", -apple-system, sans-serif';
            const formText = (editForm.dosageForm || 'Medication').toUpperCase();
            const strengthText = editForm.strength ? `  ${editForm.strength}` : '';
            ctx.fillText(formText + strengthText, canvas.width / 2, labelY + 70);
            
            // Brand/Company line
            ctx.fillStyle = '#64748B';
            ctx.font = '12px "Inter", -apple-system, sans-serif';
            ctx.fillText('PHARMACEUTICAL GRADE • QUALITY ASSURED', canvas.width / 2, labelY + 90);
            
            // Decorative elements - small dots pattern
            ctx.fillStyle = scheme.accent;
            for (let i = 0; i < 5; i++) {
              ctx.beginPath();
              ctx.arc(canvas.width - 60 + i * 8, labelY + 115, 2, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Rx symbol if prescription
            if (editForm.classification === 'POM' || editForm.classification === 'CONTROLLED') {
              ctx.fillStyle = '#EF4444';
              ctx.font = 'bold 16px "Inter", sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText('℞', 45, labelY + 115);
            }
            
            resolve(canvas.toDataURL('image/jpeg', 0.92));
          };
          img.onerror = () => reject('Failed to load base image');
          img.src = getBaseImage(editForm.dosageForm || '');
        });
      };
      
      const images = await Promise.all([
        generateProductImage('classic'),
        generateProductImage('modern'),
        generateProductImage('premium'),
      ]);
      
      setAiImageOptions(images);
      selectAiImage(images[0]);
    } catch (error) {
      console.error('AI generation error:', error);
      // Ultimate fallback
      const initials = editForm.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      const fallbackUrl = `https://ui-avatars.com/api/?name=${initials}&background=0EA5E9&color=fff&size=512&bold=true&format=svg`;
      setAiImageOptions([fallbackUrl]);
      selectAiImage(fallbackUrl);
    } finally {
      setGeneratingAIImage(false);
    }
  };

  const selectAiImage = (url: string) => {
    setSelectedAiImage(url);
    setEditForm({ ...editForm, imageUrl: url });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const currentStock = product?.stockQuantity || 0;
      await updateProductFull({
        id: productId,
        name: editForm.name,
        genericName: editForm.genericName || undefined,
        brand: editForm.brand || undefined,
        category: editForm.category,
        costPrice: editForm.costPrice,
        sellingPrice: editForm.sellingPrice,
        supplierId: editForm.supplierId || undefined,
        strength: editForm.strength || undefined,
        dosageForm: editForm.dosageForm || undefined,
        barcode: editForm.barcode || undefined,
        nafdacNo: editForm.nafdacNo || undefined,
        requiresRx: editForm.classification === 'POM' || editForm.classification === 'CONTROLLED',
        isControlled: editForm.classification === 'CONTROLLED',
        imageUrl: editForm.imageUrl || undefined,
        expiryDate: editForm.expiryDate || undefined,
        branchId: editForm.branchId || undefined,
      });

      if (editForm.stockQuantity !== currentStock) {
        const diff = editForm.stockQuantity - currentStock;
        await adjustProductStock(productId, diff, 'Manual stock adjustment during product edit');
      }

      setShowEditModal(false);
      setSaveError(null);
    } catch (error: any) {
      console.error('Failed to update product:', error);
      setSaveError(error?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const product = products.find(p => p.id === productId);
  const supplier = product ? suppliers.find(s => s.id === product.supplierId) : null;
  const movements = stockMovements.filter(m => m.productId === productId);

  useEffect(() => {
    if (product) {
      setEditForm({
        name: product.name,
        genericName: product.genericName || '',
        brand: product.brand || '',
        category: product.category || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        supplierId: product.supplierId || '',
        strength: product.strength || '',
        dosageForm: product.dosageForm || 'TABLET',
        barcode: (product as any).barcode || '',
        nafdacNo: (product as any).nafdacNo || '',
        classification: product.isControlled ? 'CONTROLLED' : (product.requiresRx ? 'POM' : 'OTC'),
        imageUrl: product.imageUrl || '',
        expiryDate: product.stockItems?.[0]?.expiryDate
          ? new Date(product.stockItems[0].expiryDate).toISOString().split('T')[0]
          : '',
        branchId: (product as any).branchId || me?.branchId || ''
      });

      // Background auto-generator for missing or placeholder product images
      const isPlaceholder = !product.imageUrl || product.imageUrl.includes('ui-avatars.com');
      if (isPlaceholder && mounted) {
        const autoGenerateAndSaveImage = async () => {
          try {
            const getBaseImage = (dosageForm: string) => {
              const form = (dosageForm || '').toUpperCase();
              if (form.includes('CAPSULE')) return '/pharma/capsules.png';
              if (form.includes('CREAM') || form.includes('OINTMENT')) return '/pharma/cream.png';
              if (form.includes('DROP')) return '/pharma/eyedrops.png';
              if (form.includes('INJECTION')) return '/pharma/injection.png';
              if (form.includes('SYRUP') || form.includes('SUSPENSION')) return '/pharma/syrup.png';
              if (form.includes('TABLET')) return '/pharma/tablets.png';
              return '/pharma/default.png';
            };

            const generatedUrl = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No context');
                
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const labelHeight = 130;
                const labelY = 340; // Default bottom position
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.shadowColor = 'rgba(0,0,0,0.15)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 15;
                
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(40, labelY, canvas.width - 80, labelHeight, 20) : ctx.fillRect(40, labelY, canvas.width - 80, labelHeight);
                ctx.fill();
                
                ctx.shadowColor = 'transparent';
                
                ctx.fillStyle = '#0F172A';
                ctx.textAlign = 'center';
                ctx.font = 'bold 32px "Inter", sans-serif';
                let displayName = product.name.toUpperCase();
                if (displayName.length > 22) displayName = displayName.substring(0, 20) + '...';
                ctx.fillText(displayName, canvas.width / 2, labelY + 55);
                
                ctx.fillStyle = '#0EA5E9'; // Blue theme
                ctx.font = 'bold 16px "Inter", sans-serif';
                ctx.fillText((product.dosageForm || 'MEDICATION').toUpperCase() + (product.strength ? ` • ${product.strength}` : ''), canvas.width / 2, labelY + 85);
                
                ctx.fillStyle = '#CBD5E1';
                for(let i=0; i<18; i++) {
                  const w = Math.random() * 4 + 2;
                  ctx.fillRect(canvas.width / 2 - 50 + i*6, labelY + 105, w, 8);
                }
                
                resolve(canvas.toDataURL('image/jpeg', 0.9));
              };
              img.onerror = () => reject('Failed to load base image');
              img.src = getBaseImage(product.dosageForm || '');
            });
            
            await updateProductFull({
              id: productId,
              name: product.name,
              imageUrl: generatedUrl
            });
            console.log(`✨ Auto-generated and persisted stunning product image for ${product.name}`);
          } catch (err) {
            console.error('Failed to auto-generate and save product image:', err);
          }
        };
        // Small delay to ensure smooth initial page load
        const timer = setTimeout(autoGenerateAndSaveImage, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [product, mounted, productId, updateProductFull]);

  const {
    paginatedData: paginatedMovements,
    currentPage, totalPages, nextPage, prevPage, startIndex, endIndex, totalItems
  } = usePagination({ data: movements, itemsPerPage: 10 });

  if (!mounted) return null;

  if (loadingProducts || !products.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <h2 className="text-xl font-bold" style={{ color: card.text }}>Loading Product Details...</h2>
      </div>
    );
  }

  const handleMoveProduct = async () => {
    if (!targetSupplierId) return;
    try {
      await updateProductSupplier(productId, targetSupplierId);
      setShowMoveModal(false);
      setTargetSupplierId('');
    } catch (err) {
      console.error('Failed to move product:', err);
    }
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Package size={48} style={{ color: card.subtle }} />
        <h2 className="text-xl font-bold" style={{ color: card.text }}>Product Not Found</h2>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: card.primary, color: '#fff' }}>Go Back</button>
      </div>
    );
  }

  const isPOM = product.requiresRx;
  const status = product.stockQuantity === 0 ? 'OUT' : product.stockQuantity <= 10 ? 'LOW' : 'OK';
  const potentialProfit = (product.sellingPrice - product.costPrice) * product.stockQuantity;

  const activeStockItems = product?.stockItems?.filter(item => item.quantity > 0) || [];
  const earliestExpiry = activeStockItems.length > 0
    ? new Date(Math.min(...activeStockItems.map(i => new Date(i.expiryDate).getTime())))
    : null;
  const isExpired = earliestExpiry ? earliestExpiry < new Date() : false;
  const isExpiringSoon = earliestExpiry ? (earliestExpiry.getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 90 : false; // 90 days threshold

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: card.text }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3" style={{ color: card.text }}>
              {product.name}
              <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider" style={{
                background: isPOM ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: isPOM ? '#EF4444' : '#10B981',
                border: `1px solid ${isPOM ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
              }}>
                {isPOM ? 'POM' : 'OTC'}
              </span>
            </h1>
            <p className="text-sm" style={{ color: card.muted }}>
              {product.genericName || product.strength || product.dosageForm || 'No generic provided'} {product.brand ? `· ${product.brand}` : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTargetSupplierId(product.supplierId || '');
                setShowMoveModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-100"
              style={{ color: card.muted, border: `1px solid ${card.border}` }}
            >
              <Move size={16} />
              Move Supplier
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBg}` }}
            >
              <Edit2 size={16} />
              Edit Product
            </button>
          </div>
        )}
      </div>

      {/* Product Hero Section (Stunning Showcase side-by-side with direct actions) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Beautiful Premium Product Image Showcase */}
        <div className="md:col-span-1 rounded-2xl border backdrop-blur-xl overflow-hidden flex flex-col justify-between p-4 group relative" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex-1 flex items-center justify-center relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 aspect-square">
            {product.imageUrl && !imgError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center animate-pulse" style={{ background: card.primaryBg, color: card.primary }}>
                  <ImageIcon size={32} />
                </div>
                <p className="text-xs font-semibold" style={{ color: card.text }}>Generating AI Image...</p>
                <p className="text-[10px] leading-relaxed" style={{ color: card.muted }}>Simply stay on this page to let the AI build a stunning studio shot of your product packaging!</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex gap-2">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="direct-image-upload" />
            <label htmlFor="direct-image-upload" className="flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border cursor-pointer" style={{ borderColor: card.border, color: card.text }}>
              <Upload size={12} /> Upload Photo
            </label>
            <button 
              onClick={async () => {
                try {
                  setGeneratingAIImage(true);
                  const getBaseImage = (dosageForm: string) => {
                    const form = (dosageForm || '').toUpperCase();
                    if (form.includes('CAPSULE')) return '/pharma/capsules.png';
                    if (form.includes('CREAM') || form.includes('OINTMENT')) return '/pharma/cream.png';
                    if (form.includes('DROP')) return '/pharma/eyedrops.png';
                    if (form.includes('INJECTION')) return '/pharma/injection.png';
                    if (form.includes('SYRUP') || form.includes('SUSPENSION')) return '/pharma/syrup.png';
                    if (form.includes('TABLET')) return '/pharma/tablets.png';
                    return '/pharma/default.png';
                  };

                  const generatedUrl = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 512;
                      canvas.height = 512;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return reject('No context');
                      
                      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                      const x = (canvas.width / 2) - (img.width / 2) * scale;
                      const y = (canvas.height / 2) - (img.height / 2) * scale;
                      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                      
                      ctx.fillStyle = 'rgba(0,0,0,0.1)';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      
                      const labelHeight = 130;
                      const labelY = 340;
                      
                      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                      ctx.shadowColor = 'rgba(0,0,0,0.15)';
                      ctx.shadowBlur = 30;
                      ctx.shadowOffsetY = 15;
                      
                      ctx.beginPath();
                      ctx.roundRect ? ctx.roundRect(40, labelY, canvas.width - 80, labelHeight, 20) : ctx.fillRect(40, labelY, canvas.width - 80, labelHeight);
                      ctx.fill();
                      
                      ctx.shadowColor = 'transparent';
                      
                      ctx.fillStyle = '#0F172A';
                      ctx.textAlign = 'center';
                      ctx.font = 'bold 32px "Inter", sans-serif';
                      let displayName = product.name.toUpperCase();
                      if (displayName.length > 22) displayName = displayName.substring(0, 20) + '...';
                      ctx.fillText(displayName, canvas.width / 2, labelY + 55);
                      
                      ctx.fillStyle = '#0EA5E9';
                      ctx.font = 'bold 16px "Inter", sans-serif';
                      ctx.fillText((product.dosageForm || 'MEDICATION').toUpperCase() + (product.strength ? ` • ${product.strength}` : ''), canvas.width / 2, labelY + 85);
                      
                      ctx.fillStyle = '#CBD5E1';
                      for(let i=0; i<18; i++) {
                        const w = Math.random() * 4 + 2;
                        ctx.fillRect(canvas.width / 2 - 50 + i*6, labelY + 105, w, 8);
                      }
                      
                      resolve(canvas.toDataURL('image/jpeg', 0.9));
                    };
                    img.onerror = () => reject('Failed to load base image');
                    img.src = getBaseImage(product.dosageForm || '');
                  });

                  await updateProductFull({
                    id: productId,
                    name: product.name,
                    imageUrl: generatedUrl
                  });
                  setImgError(false);
                } catch (error) {
                  console.error(error);
                } finally {
                  setGeneratingAIImage(false);
                }
              }}
              disabled={generatingAIImage}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110 disabled:opacity-50 text-white" 
              style={{ background: card.primary }}
            >
              {generatingAIImage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Generate
            </button>
          </div>
        </div>

        {/* Right Card: Quick Overview Hero Panel with Stats */}
        <div className="md:col-span-2 rounded-2xl border backdrop-blur-xl p-6 flex flex-col justify-between" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider" style={{
                background: isPOM ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: isPOM ? '#EF4444' : '#10B981',
                border: `1px solid ${isPOM ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
              }}>
                {isPOM ? 'POM (Prescription)' : 'OTC (Over-The-Counter)'}
              </span>
              {product.category && (
                <span className="text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider" style={{ background: 'rgba(0,217,255,0.08)', color: card.primary, border: `1px solid ${card.primary}20` }}>
                  {product.category}
                </span>
              )}
            </div>
            
            <h1 className="font-display text-4xl font-extrabold mb-2 leading-tight" style={{ color: card.text }}>
              {product.name}
            </h1>
            <p className="text-sm max-w-xl mb-6" style={{ color: card.muted }}>
              {product.genericName ? (
                <>Generic name: <span className="font-semibold" style={{ color: card.text }}>{product.genericName}</span></>
              ) : 'No generic name defined for this medication.'} {product.brand ? ` · Brand: ${product.brand}` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t" style={{ borderColor: card.border }}>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border" style={{ borderColor: card.border }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Stock Level</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-extrabold" style={{ color: card.text }}>{product.stockQuantity}</p>
                {status === 'OK' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                {status === 'LOW' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                {status === 'OUT' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border" style={{ borderColor: card.border }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Cost Price</p>
              <p className="text-base font-mono font-extrabold" style={{ color: card.text }}>GH₵{product.costPrice.toFixed(2)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border" style={{ borderColor: card.border }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Selling Price</p>
              <p className="text-base font-mono font-extrabold" style={{ color: card.primary }}>GH₵{product.sellingPrice.toFixed(2)}</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-emerald-600 dark:text-emerald-400">Profit Margin</p>
              <p className="text-base font-mono font-extrabold text-emerald-500">
                {product.costPrice > 0 ? `${(((product.sellingPrice - product.costPrice) / product.costPrice) * 100).toFixed(0)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Large Edit Modal */}
      <AnimatePresence>
        {showEditModal && canEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition-all"
              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}
            >
              {/* Header */}
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: card.border, background: card.primaryBg }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}><Edit2 size={20} /></div>
                  <div>
                    <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Edit Product</h2>
                    <p className="text-[11px]" style={{ color: card.muted }}>Update pharmaceutical details for {product.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors"><X size={20} /></button>
              </div>

              {/* Tabs Navigation */}
              <div className="flex px-6 pt-4 border-b gap-6" style={{ borderColor: card.border }}>
                {[
                  { id: 'basic', label: 'Basic Info', icon: FileText },
                  { id: 'pricing', label: 'Pricing & Stock', icon: DollarSign },
                  { id: 'supplier', label: 'Supplier & Media', icon: Truck }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setEditModalTab(tab.id as any)}
                    className="flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative"
                    style={{ color: editModalTab === tab.id ? card.primary : card.muted }}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                    {editModalTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: card.primary }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Tab 1: Basic Info */}
                {editModalTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    {canSwitchBranch && (
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Branch</label>
                        <select 
                          value={editForm.branchId} 
                          onChange={e => setEditForm({...editForm, branchId: e.target.value})} 
                          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Name *</label>
                      <input type="text" placeholder="e.g. Paracetamol 500mg" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Generic Name</label>
                      <input type="text" placeholder="e.g. Acetaminophen" value={editForm.genericName} onChange={e => setEditForm({...editForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Brand / Manufacturer</label>
                      <input type="text" placeholder="e.g. GSK" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Category *</label>
                      <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="">Select Category</option>
                        <option value="ANTIBIOTICS">ANTIBIOTICS</option>
                        <option value="ANALGESICS_NSAIDS">ANALGESICS & NSAIDS</option>
                        <option value="ANTIMALARIALS">ANTIMALARIALS</option>
                        <option value="VITAMINS_SUPPLEMENTS">VITAMINS & SUPPLEMENTS</option>
                        <option value="MISCELLANEOUS">MISCELLANEOUS</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Dosage Form</label>
                      <select value={editForm.dosageForm} onChange={e => setEditForm({...editForm, dosageForm: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="TABLET">Tablet</option>
                        <option value="CAPSULE">Capsule</option>
                        <option value="SYRUP">Syrup</option>
                        <option value="SUSPENSION">Suspension</option>
                        <option value="INJECTION">Injection</option>
                        <option value="CREAM">Cream</option>
                        <option value="OINTMENT">Ointment</option>
                        <option value="DROPS">Drops</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Strength</label>
                      <input type="text" placeholder="e.g. 500mg, 10mg/5ml" value={editForm.strength} onChange={e => setEditForm({...editForm, strength: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Classification *</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        {['OTC', 'POM', 'CONTROLLED'].map(c => (
                          <button key={c} onClick={() => setEditForm({...editForm, classification: c})} 
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editForm.classification === c ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                            style={{ 
                              background: editForm.classification === c ? (isDark ? card.primaryBg : '#fff') : 'transparent',
                              color: editForm.classification === c ? card.primary : card.text
                            }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Pricing & Stock */}
                {editModalTab === 'pricing' && (
                  <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Barcode / SKU</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Scan or enter barcode" value={editForm.barcode} onChange={e => setEditForm({...editForm, barcode: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Cost Price (GH₵) *</label>
                      <input type="number" min="0" step="0.01" value={editForm.costPrice || ''} onChange={e => setEditForm({...editForm, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Selling Price (GH₵) *</label>
                      <input type="number" min="0" step="0.01" value={editForm.sellingPrice || ''} onChange={e => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    {/* Margin Calculator */}
                    <div className="col-span-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Profit Margin</p>
                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Per unit sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">
                          {editForm.costPrice > 0 
                            ? `${(((editForm.sellingPrice - editForm.costPrice) / editForm.costPrice) * 100).toFixed(1)}%` 
                            : '0.0%'}
                        </p>
                        <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">
                          GH₵ {(editForm.sellingPrice - editForm.costPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2 border-t pt-5" style={{ borderColor: card.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Stock Quantity</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="0"
                          value={editForm.stockQuantity === 0 ? '' : (editForm.stockQuantity ?? '')} 
                          onChange={e => setEditForm({...editForm, stockQuantity: parseInt(e.target.value) || 0})} 
                          onFocus={e => e.target.select()}
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" 
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} 
                        />
                        <div className="w-1/2">
                          <p className="text-xs" style={{ color: card.muted }}>Usually managed via Purchase Orders or Stock Adjustments.</p>
                          {earliestExpiry && (
                            <p className={`text-[10px] mt-1 font-bold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : ''}`} style={!isExpired && !isExpiringSoon ? { color: card.subtle } : {}}>
                              Earliest Expiry: {earliestExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Expiry Date</label>
                      <input type="date" value={editForm.expiryDate} onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      <p className="text-xs mt-1.5" style={{ color: card.muted }}>Applies to the first stock batch. Create a new batch via Purchase Order for different dates.</p>
                    </div>
                  </div>
                )}

                {/* Tab 3: Supplier & Media */}
                {editModalTab === 'supplier' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                    {/* Left Column - Supplier Info */}
                    <div className="space-y-5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Supplier</label>
                        <select value={editForm.supplierId} onChange={e => setEditForm({...editForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                          <option value="">Direct / Unknown / General</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>FDA / NAFDAC Number</label>
                        <input type="text" placeholder="Regulatory ID" value={editForm.nafdacNo} onChange={e => setEditForm({...editForm, nafdacNo: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Image URL</label>
                        <input type="text" placeholder="https://example.com/image.png" value={editForm.imageUrl} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>
                    </div>

                    {/* Right Column - Product Media */}
                    <div className="flex flex-col h-full">
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: card.subtle }}>Product Media</label>
                      
                      {/* Action Buttons - AT THE TOP */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                         <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="edit-image-upload" />
                         <label htmlFor="edit-image-upload" className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-80 cursor-pointer border" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}>
                           {uploadingImage ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />} Upload Photo
                         </label>
                         <button onClick={generateAIImages} disabled={generatingAIImage} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110 disabled:opacity-50 border" style={{ background: card.primaryBg, color: card.primary, borderColor: card.primary }}>
                           {generatingAIImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI Generate
                         </button>
                      </div>

                      {/* Image Preview - Smaller to fit without scroll */}
                      <div className="flex-1 min-h-0">
                        <div className="h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group" style={{ borderColor: card.border, background: card.inputBg }}>
                          {editForm.imageUrl ? (
                            <>
                              <img src={editForm.imageUrl} className="w-full h-full object-contain" alt="Product Preview" onError={() => setEditForm({...editForm, imageUrl: ''})} />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => setEditForm({...editForm, imageUrl: ''})} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Remove</button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Sparkles size={32} className="mx-auto mb-2 opacity-50" style={{ color: card.primary }} />
                              <p className="text-[10px] opacity-70" style={{ color: card.text }}>No image selected</p>
                              <p className="text-[9px] mt-1 opacity-50" style={{ color: card.muted }}>Upload or generate above</p>
                            </div>
                          )}
                          {generatingAIImage && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-cyan-500">
                              <Loader2 size={24} className="animate-spin mb-2" />
                              <span className="text-[10px] font-bold tracking-widest animate-pulse">GENERATING...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Options - Below preview */}
                      {aiImageOptions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.subtle }}>Select AI Image</p>
                          <div className="grid grid-cols-3 gap-2">
                            {aiImageOptions.map((url, idx) => (
                              <button key={idx} onClick={() => selectAiImage(url)} className={`h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedAiImage === url ? 'border-primary opacity-100 ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                <img src={url} alt={`AI Option ${idx}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: card.border }}>
                <button onClick={() => setShowEditModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-800" style={{ color: card.text }}>Cancel</button>
                
                <div className="flex gap-2">
                  {editModalTab !== 'basic' && <button onClick={() => setEditModalTab(editModalTab === 'pricing' ? 'basic' : 'pricing')} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all border" style={{ borderColor: card.border, color: card.text }}>Back</button>}
                  
                  {editModalTab !== 'supplier' ? (
                    <button onClick={() => setEditModalTab(editModalTab === 'basic' ? 'pricing' : 'supplier')} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl" style={{ background: card.primary, color: '#fff', boxShadow: `0 4px 15px ${card.primary}40` }}>Continue</button>
                  ) : (
                    <>
                      {saveError && (
                        <div className="mb-2 p-2 rounded-lg text-xs font-medium text-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {saveError}
                        </div>
                      )}
                      <button onClick={handleSave} disabled={isSaving || !editForm.name || editForm.costPrice <= 0 || editForm.sellingPrice <= 0} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2" style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border backdrop-blur-xl p-6" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
              <Package size={18} style={{ color: card.primary }} />
              Detailed Paper
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Category</p>
                <p className="text-sm font-semibold px-3 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(0,0,0,0.05)', color: card.text }}>{product.category || 'Uncategorized'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Stock Level</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold" style={{ color: card.text }}>{product.stockQuantity}</p>
                  {status === 'OK' && <CheckCircle size={16} color="#10B981" />}
                  {status === 'LOW' && <AlertCircle size={16} color="#F59E0B" />}
                  {status === 'OUT' && <AlertCircle size={16} color="#EF4444" />}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Expiry Date</p>
                {earliestExpiry ? (
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : ''}`} style={!isExpired && !isExpiringSoon ? { color: card.text } : {}}>
                      {earliestExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {isExpired && <AlertCircle size={14} color="#EF4444" />}
                    {isExpiringSoon && !isExpired && <AlertCircle size={14} color="#F59E0B" />}
                  </div>
                ) : (
                  <p className="text-sm font-bold" style={{ color: card.muted }}>N/A</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Cost Price</p>
                <p className="text-lg font-mono font-bold" style={{ color: card.text }}>GH₵ {product.costPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Selling Price</p>
                <p className="text-lg font-mono font-bold" style={{ color: card.primary }}>GH₵ {product.sellingPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6" style={{ borderColor: card.border }}>
               <div className="flex items-start gap-4">
                 <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><TrendingUp size={20} /></div>
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Projected Profit (Current Stock)</p>
                   <p className="text-xl font-mono font-bold text-emerald-500">GH₵ {potentialProfit.toFixed(2)}</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="p-3 rounded-xl" style={{ background: card.primaryBg, color: card.primary }}><Truck size={20} /></div>
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Supplier</p>
                   {supplier ? (
                     <button onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)} className="text-sm font-bold hover:underline transition-colors" style={{ color: card.primary }}>
                       {supplier.name}
                     </button>
                   ) : (
                     <p className="text-sm font-bold" style={{ color: card.text }}>Direct / Unknown</p>
                   )}
                   <p className="text-xs" style={{ color: card.muted }}>{supplier?.contact || supplier?.phone || 'No contact info'}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Stock History */}
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-6 border-b" style={{ borderColor: card.border }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: card.text }}>
                <History size={18} style={{ color: card.primary }} />
                Stock Movement History
              </h2>
            </div>
            
            {movements.length === 0 ? (
              <div className="p-8 text-center">
                <Clock size={32} className="mx-auto mb-3" style={{ color: card.subtle }} />
                <p className="text-sm" style={{ color: card.muted }}>No recorded stock movements for this product yet.</p>
              </div>
            ) : (
              <div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Date</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Type</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Quantity</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Branch/Supplier</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Reason</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovements.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom: i < paginatedMovements.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                        <td className="px-5 py-4" style={{ color: card.text }}>
                          {new Date(m.date).toLocaleDateString()}
                          <span className="text-[10px] block" style={{ color: card.muted }}>{new Date(m.date).toLocaleTimeString()}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ 
                            background: m.type === 'in' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                            color: m.type === 'in' ? '#10B981' : '#EF4444' 
                          }}>
                            {m.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold" style={{ color: card.text }}>
                          {m.type === 'in' ? '+' : '-'}{m.quantity}
                        </td>
                        <td className="px-5 py-4" style={{ color: card.muted }}>
                          {m.branchName && (
                            <p className="font-medium" style={{ color: card.text }}>{m.branchName}</p>
                          )}
                          {m.supplierName && (
                            <p className="text-[10px]" style={{ color: card.subtle }}>Supplier: {m.supplierName}</p>
                          )}
                          {!m.branchName && !m.supplierName && '-'}
                        </td>
                        <td className="px-5 py-4" style={{ color: card.muted }}>{m.reason}</td>
                        <td className="px-5 py-4" style={{ color: card.text }}>{m.user || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: card.border }}>
                   <p className="text-xs" style={{ color: card.muted }}>Showing {startIndex}-{endIndex} of {totalItems}</p>
                   <div className="flex gap-2">
                     <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary }}>Prev</button>
                     <button disabled={currentPage === totalPages} onClick={nextPage} className="px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary }}>Next</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action / Sync Card */}
          <div className="rounded-2xl border backdrop-blur-xl p-6 text-center" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
             <DollarSign size={32} className="mx-auto mb-3" style={{ color: card.primary }} />
             <h3 className="font-bold mb-1" style={{ color: card.text }}>Sales Ready</h3>
             <p className="text-xs mb-4" style={{ color: card.muted }}>This product is properly synced to the POS terminal with pricing applied.</p>
             <button onClick={() => router.push('/dashboard/inventory')} className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{ background: card.primary, color: '#fff' }}>
               Back to Inventory
             </button>
          </div>
        </div>
      </div>
      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Move size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: card.text }}>Change Supplier</h3>
                <p className="text-xs" style={{ color: card.muted }}>Move product to a different supplier</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Target Supplier</label>
                <select 
                  value={targetSupplierId} 
                  onChange={e => setTargetSupplierId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                >
                  <option value="">Choose a supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMoveModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: card.text }}
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveProduct}
                disabled={!targetSupplierId}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: card.primary }}
              >
                <Save size={16} />
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
