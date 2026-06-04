'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Package, AlertCircle, TrendingUp, DollarSign, Upload,
  History, Receipt, Truck, X, BarChart3, Sparkles, Phone, Mail, Building,
  Edit2, Trash2, ChevronRight, RefreshCw, Save, Loader2, FileText,
  MoreHorizontal, Move, Check, ChevronDown, CheckCircle, Scan, CreditCard
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { usePagination } from '@/hooks/use-pagination';
import { gql, M_RECEIVE_INVOICE } from '@/lib/gql';
import { useToast } from '@/components/pharma-toast';

const STATUS_CONFIG = {
  OK: { label: 'In Stock', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  LOW: { label: 'Low Stock', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  OUT: { label: 'Out of Stock', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  EXPIRED: { label: 'Expired', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
};

export default function InventoryPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { 
    products: storeProducts, 
    suppliers,
    purchases,
    invoices,
    stockMovements,
    loadingProducts, 
    refetchProducts, 
    updateProductPrices,
    updateProductFull,
    bulkUpdateProductSupplier,
    createProduct,
    createSupplier,
    deleteProduct,
    adjustProductStock,
    me,
    error: storeError
  } = useStore();
  const { signOut } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'DEVELOPER'].includes(me?.role || '');
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'orders' | 'valuation' | 'suppliers'>('products');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'basic' | 'pricing' | 'supplier'>('basic');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: 'ANTIBIOTICS',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    supplierId: '',
    strength: '',
    dosageForm: 'TABLET',
    barcode: '',
    nafdacNo: '',
    classification: 'OTC', // 'OTC', 'POM', 'CONTROLLED'
    imageUrl: ''
  });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [addModalFromInvoice, setAddModalFromInvoice] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editModalTab, setEditModalTab] = useState<'basic' | 'pricing' | 'supplier'>('basic');
  const [editForm, setEditForm] = useState<any>({
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
    classification: 'OTC',
    imageUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Stock Adjustment Modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [stockAdjust, setStockAdjust] = useState(0);
  const [stockReason, setStockReason] = useState('');

  // Delete Confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState('');

  const isAdmin = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(me?.role || '');

  // Upload Invoice / Receiving Wizard
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [invoiceStep, setInvoiceStep] = useState<'type' | 'upload' | 'verify' | 'terms'>('type');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [invoiceSupplier, setInvoiceSupplier] = useState<string>('');
  const [invoiceSupplierDraft, setInvoiceSupplierDraft] = useState<string>('');
  const [createSupplierOnConfirm, setCreateSupplierOnConfirm] = useState<boolean>(false);
  const [isCreatingInvoiceSupplier, setIsCreatingInvoiceSupplier] = useState<boolean>(false);
  const [creatingInvoiceProductId, setCreatingInvoiceProductId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [invoiceDuplicateStatus, setInvoiceDuplicateStatus] = useState<'idle' | 'checking' | 'duplicate' | 'ok'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live duplicate invoice number check
  useEffect(() => {
    const trimmed = invoiceNumber.trim();
    if (!trimmed) { setInvoiceDuplicateStatus('idle'); return; }
    setInvoiceDuplicateStatus('checking');
    const timer = setTimeout(() => {
      const exists = invoices.some(
        inv => inv.invoiceNo?.toLowerCase() === trimmed.toLowerCase()
      );
      setInvoiceDuplicateStatus(exists ? 'duplicate' : 'ok');
    }, 400);
    return () => clearTimeout(timer);
  }, [invoiceNumber, invoices]);

  const isDark = mounted && theme === 'dark';

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    rowHover: isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const invoiceSubtotal = invoiceItems.reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.unitCost) || 0)), 0);
  const newInvoiceItems = invoiceItems.filter(i => !i.exists || !i.productId);
  const hasResolvableSupplier = Boolean(invoiceSupplier || (createSupplierOnConfirm && invoiceSupplierDraft.trim()));

  const products = storeProducts.map((p: any) => {
    const isPOM = ['ANTIBIOTICS', 'CARDIOVASCULAR', 'ANTIMALARIALS'].includes(p.category);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      medClass: isPOM ? 'POM' : 'OTC',
      generic: p.strength || p.dosageForm || '',
      cat: p.category || 'OTC',
      stock: p.stockQuantity,
      price: p.sellingPrice,
      sellingPrice: p.sellingPrice,
      costPrice: p.costPrice,
      cost: p.costPrice,
      status: p.stockQuantity === 0 ? 'OUT' : p.stockQuantity <= 10 ? 'LOW' : 'OK',
      expiry: 'N/A',
      barcode: 'N/A',
      supplierId: p.supplierId,
    };
  });

  const categories = ['All', ...Array.from(new Set(products.map((p: any) => p.cat)))].sort();
  const filteredProducts = products.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.generic.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.cat === catFilter;
    return matchSearch && matchCat;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProducts,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredProducts,
    itemsPerPage: 5,
  });

  useEffect(() => {
    goToPage(1);
  }, [search, catFilter, goToPage]);

  const totalValue = products.reduce((acc: number, p: any) => acc + p.stock * p.cost, 0);
  const retailValue = products.reduce((acc: number, p: any) => acc + p.stock * p.price, 0);
  const lowCount = products.filter((p: any) => p.status === 'LOW').length;
  const outCount = products.filter((p: any) => p.status === 'OUT').length;
  const potentialProfit = retailValue - totalValue;

  const handleGenerateImage = async () => {
    if (!newProduct.name) return;
    setIsGeneratingImage(true);
    try {
      const prompt = `Professional pharmaceutical product photo of ${newProduct.name} ${newProduct.dosageForm || 'medication'} white background studio lighting high quality medical packaging clean composition`;
      const seed = Date.now();
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=512&height=512&nologo=true&enhance=true`;
      
      // Validate the generated image loads
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Generated image failed to load'));
        img.src = generatedUrl;
        setTimeout(() => reject(new Error('Image load timeout')), 10000);
      });
      
      setNewProduct((prev: any) => ({ ...prev, imageUrl: generatedUrl }));
    } catch (error) {
      console.error('Failed to generate image, using fallback:', error);
      // Fallback to initials placeholder
      const initials = newProduct.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      const fallbackUrl = `https://ui-avatars.com/api/?name=${initials}&background=0EA5E9&color=fff&size=512&bold=true&format=svg`;
      setNewProduct((prev: any) => ({ ...prev, imageUrl: fallbackUrl }));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateImageEdit = async () => {
    if (!editForm.name) return;
    setIsGeneratingImage(true);
    try {
      const prompt = `Professional pharmaceutical product photo of ${editForm.name} ${editForm.dosageForm || 'medication'} white background studio lighting high quality medical packaging clean composition`;
      const seed = Date.now();
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=512&height=512&nologo=true&enhance=true`;
      
      // Validate the generated image loads
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Generated image failed to load'));
        img.src = generatedUrl;
        setTimeout(() => reject(new Error('Image load timeout')), 10000);
      });
      
      setEditForm((prev: any) => ({ ...prev, imageUrl: generatedUrl }));
    } catch (error) {
      console.error('Failed to generate image, using fallback:', error);
      // Fallback to initials placeholder
      const initials = editForm.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      const fallbackUrl = `https://ui-avatars.com/api/?name=${initials}&background=0EA5E9&color=fff&size=512&bold=true&format=svg`;
      setEditForm((prev: any) => ({ ...prev, imageUrl: fallbackUrl }));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCreateInvoiceProductNow = async (itemId: string) => {
    const target = invoiceItems.find(i => i.id === itemId);
    if (!target) return;

    const productName = (target.name || '').trim();
    if (!productName) {
      addToast({
        type: 'warning',
        title: 'Product Name Required',
        message: 'Enter a product name before creating it.',
        duration: 4000,
      });
      return;
    }

    if (target.exists && target.productId) {
      addToast({
        type: 'info',
        title: 'Already Linked',
        message: `${productName} is already mapped to catalog.`,
        duration: 3500,
      });
      return;
    }

    setCreatingInvoiceProductId(itemId);
    try {
      let resolvedSupplierId = invoiceSupplier;
      if (!resolvedSupplierId && invoiceSupplierDraft.trim()) {
        const existing = getSupplierMatchByName(invoiceSupplierDraft);
        if (existing) {
          resolvedSupplierId = existing.id;
          setInvoiceSupplier(existing.id);
          setCreateSupplierOnConfirm(false);
        } else if (createSupplierOnConfirm) {
          const createdSupplier = await createSupplier({
            name: invoiceSupplierDraft.trim(),
            categories: ['GENERAL'],
          });
          resolvedSupplierId = createdSupplier.id;
          setInvoiceSupplier(createdSupplier.id);
          setCreateSupplierOnConfirm(false);
        }
      }

      if (!resolvedSupplierId) {
        addToast({
          type: 'warning',
          title: 'Supplier Needed',
          message: 'Select or create a supplier first before creating new products.',
          duration: 5000,
        });
        return;
      }

      const createdProduct = await createProduct({
        name: productName,
        category: 'MISCELLANEOUS',
        costPrice: Math.max(0, Number(target.unitCost) || 0),
        sellingPrice: Math.max(0, Number(target.unitCost) || 0) * 1.3,
        stockQuantity: 0,
        supplierId: resolvedSupplierId,
        dosageForm: 'OTHER',
      });

      setInvoiceItems(prev => prev.map(item => item.id === itemId
        ? { ...item, productId: createdProduct.id, exists: true, name: productName }
        : item));

      addToast({
        type: 'success',
        title: 'Product Created',
        message: `${productName} has been added to catalog and linked.`,
        duration: 4500,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Product Creation Failed',
        message: error?.message || 'Could not create product right now.',
        duration: 6000,
      });
    } finally {
      setCreatingInvoiceProductId(null);
    }
  };

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';
  const invoiceAnalyzeEndpoints = [
    `${apiBaseUrl}/api/invoice/analyze`,
    'http://127.0.0.1:4000/api/invoice/analyze',
    'http://localhost:4000/api/invoice/analyze',
  ];

  const getSupplierMatchByName = (supplierName: string) => {
    const normalized = supplierName.trim().toLowerCase();
    if (!normalized) return undefined;
    return suppliers.find(s => {
      const n = s.name.toLowerCase();
      return n.includes(normalized) || normalized.includes(n);
    });
  };

  const toIsoDateOrFallback = (dateText?: string) => {
    if (!dateText) return new Date().toISOString();
    const dt = new Date(dateText);
    return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
  };

  const handleAddProduct = async () => {
    setIsCreatingProduct(true);
    try {
      const created = await createProduct({
        name: newProduct.name,
        genericName: newProduct.genericName || undefined,
        brand: newProduct.brand || undefined,
        category: newProduct.category,
        costPrice: newProduct.costPrice,
        sellingPrice: newProduct.sellingPrice,
        stockQuantity: newProduct.stockQuantity,
        supplierId: newProduct.supplierId || undefined,
        strength: newProduct.strength || undefined,
        dosageForm: newProduct.dosageForm || undefined,
        barcode: newProduct.barcode || undefined,
        nafdacNo: newProduct.nafdacNo || undefined,
        requiresRx: newProduct.classification === 'POM' || newProduct.classification === 'CONTROLLED',
        isControlled: newProduct.classification === 'CONTROLLED',
        imageUrl: newProduct.imageUrl || undefined,
      });
      if (addModalFromInvoice && created?.id) {
        setInvoiceItems(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          productId: created.id,
          name: created.name,
          quantity: newProduct.stockQuantity || 1,
          unitCost: newProduct.costPrice || 0,
          batchNo: '',
          expiryDate: '',
          exists: true,
        }]);
        addToast({
          type: 'success',
          title: 'Product Created & Added',
          message: `${created.name} has been created and added to the invoice.`,
          duration: 4500,
        });
      }
      setShowAddModal(false);
      setAddModalFromInvoice(false);
      setAddModalTab('basic');
      setNewProduct({ name: '', genericName: '', brand: '', category: 'ANTIBIOTICS', costPrice: 0, sellingPrice: 0, stockQuantity: 0, supplierId: '', strength: '', dosageForm: 'TABLET', barcode: '', nafdacNo: '', classification: 'OTC', imageUrl: '' });
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleEditProduct = async () => {
    setIsSaving(true);
    try {
      // Only send fields that have meaningful values — all are optional on update
      await updateProductFull({
        id: editingProduct.id,
        name: editForm.name || undefined,
        genericName: editForm.genericName || undefined,
        brand: editForm.brand || undefined,
        category: editForm.category || undefined,
        costPrice: editForm.costPrice > 0 ? editForm.costPrice : undefined,
        sellingPrice: editForm.sellingPrice > 0 ? editForm.sellingPrice : undefined,
        supplierId: editForm.supplierId || undefined,
        strength: editForm.strength || undefined,
        dosageForm: editForm.dosageForm || undefined,
        barcode: editForm.barcode || undefined,
        nafdacNo: editForm.nafdacNo || undefined,
        requiresRx: editForm.classification === 'POM' || editForm.classification === 'CONTROLLED',
        isControlled: editForm.classification === 'CONTROLLED',
        imageUrl: editForm.imageUrl || undefined,
      });

      if (editForm.stockQuantity !== undefined && editForm.stockQuantity !== editingProduct.stockQuantity) {
        const diff = editForm.stockQuantity - (editingProduct.stockQuantity || 0);
        await adjustProductStock(editingProduct.id, diff, 'Manual stock adjustment during product edit');
      }

      setShowEditModal(false);
      setEditingProduct(null);
      setEditModalTab('basic');
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (product: any) => {
    // Pull the raw product from the store for full field data
    const raw = storeProducts.find((p: any) => p.id === product.id) || product;
    const cls = raw.isControlled ? 'CONTROLLED' : (raw.requiresRx ? 'POM' : 'OTC');
    setEditingProduct(raw);
    setEditForm({
      name: raw.name || '',
      genericName: raw.genericName || '',
      brand: raw.brand || '',
      category: raw.category || '',
      costPrice: raw.costPrice || 0,
      sellingPrice: raw.sellingPrice || 0,
      stockQuantity: raw.stockQuantity || 0,
      supplierId: raw.supplierId || '',
      strength: raw.strength || '',
      dosageForm: raw.dosageForm || 'TABLET',
      barcode: raw.barcode || '',
      nafdacNo: raw.nafdacNo || '',
      classification: cls,
      imageUrl: raw.imageUrl || ''
    });
    setEditModalTab('basic');
    setShowEditModal(true);
  };


  const handleBulkMove = async () => {
    if (!targetSupplierId || selectedIds.length === 0) return;
    setIsSaving(true);
    try {
      await bulkUpdateProductSupplier(selectedIds, targetSupplierId);
      setSelectedIds([]);
      setShowMoveModal(false);
      setTargetSupplierId('');
    } catch (error) {
      console.error('Failed to bulk move products:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiScanWithFile = async (file: File) => {
    setIsScanning(true);
    console.log('🚀 [AI_SCAN] Starting Invoice Analysis...', {
      file: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      let data: any = null;
      let lastFetchError: unknown = null;

      for (const endpoint of invoiceAnalyzeEndpoints) {
        try {
          console.log('📡 [AI_SCAN] Dispatching to backend:', endpoint);
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [AI_SCAN] API Error:', { endpoint, status: response.status, text: errorText });
            lastFetchError = new Error(`OCR failed (${response.status})`);
            continue;
          }

          data = await response.json();
          break;
        } catch (error) {
          lastFetchError = error;
        }
      }

      if (!data) {
        throw lastFetchError || new Error('OCR_FAILED');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ [AI_SCAN] Analysis Complete. Data received:', data);

      if (data && data.items && data.items.length > 0) {
        console.log(`📦 [AI_SCAN] Mapping ${data.items.length} items to verification table...`);
        setInvoiceItems(data.items.map((i: any) => {
          const iName = (i.name || '').toLowerCase().trim();
          // Find matching product (bidirectional includes)
          const matchedProduct = products.find(p => {
            const pName = p.name.toLowerCase();
            return pName === iName || pName.includes(iName) || iName.includes(pName);
          });
          
          return {
            id: Math.random().toString(36).substring(7),
            productId: matchedProduct?.id,
            name: (i.name || 'Unnamed Item').trim(),
            quantity: Math.max(1, Number(i.quantity) || 1),
            unitCost: Math.max(0, Number(i.unitCost) || 0),
            sellingPrice: matchedProduct?.sellingPrice
              ? Number(matchedProduct.sellingPrice)
              : Math.max(0, Number(i.unitCost) || 0) * 1.3,
            batchNo: i.batchNo || '',
            expiryDate: i.expiryDate || '',
            exists: !!matchedProduct
          };
        }));
        
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.invoiceDate) setInvoiceDate(data.invoiceDate);
        
        if (data.supplierName) {
           const extractedSupplierName = String(data.supplierName).trim();
           setInvoiceSupplierDraft(extractedSupplierName);
           const match = getSupplierMatchByName(extractedSupplierName);
           console.log(`🔍 [AI_SCAN] Supplier Match: "${data.supplierName}" -> ${match ? match.name : 'NO_MATCH'}`);
           if (match) {
             setInvoiceSupplier(match.id);
             setCreateSupplierOnConfirm(false);
           } else {
             setCreateSupplierOnConfirm(true);
           }
        }
        
        setInvoiceStep('verify');
      } else {
        console.warn('⚠️ [AI_SCAN] No items found in invoice.');
        setInvoiceStep('verify');
        addToast({
          type: 'warning',
          title: 'No Items Detected',
          message: 'The AI could not find line items. Please continue with manual item entry.',
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('❌ [AI_SCAN] Processing Failed:', error);
      setInvoiceStep('verify');
      addToast({
        type: 'error',
        title: 'AI Scan Failed',
        message: error?.message?.includes('file too large') 
          ? 'Invoice file is too large. Maximum size is 25MB.'
          : 'You can still complete this invoice manually in the verification step.',
        duration: 8000,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAiScan = async () => {
    if (!invoiceFile) return;
    await handleAiScanWithFile(invoiceFile);
  };

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📂 [UI] File selected for upload:', file.name);
      setInvoiceFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
      setIsAiMode(true);
      setInvoiceStep('upload');
      // Pass file directly to avoid React async state race condition
      console.log('⚡ [UI] Triggering AI Neural Scan...');
      handleAiScanWithFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log('📂 [UI] File dropped:', file.name);
      setInvoiceFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
      setIsAiMode(true);
      setInvoiceStep('upload');
      console.log('⚡ [UI] Triggering AI Neural Scan from drop event...');
      handleAiScanWithFile(file);
    }
  };

  const addProductToInvoice = (product: any) => {
    const newItem = {
      id: Math.random().toString(36).substring(7),
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitCost: product.costPrice || 0,
      sellingPrice: product.sellingPrice || 0,
      batchNo: '',
      expiryDate: '',
      exists: true
    };
    setInvoiceItems([...invoiceItems, newItem]);
    setInvoiceSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleCreateInvoiceSupplierNow = async () => {
    const draftName = invoiceSupplierDraft.trim();
    if (!draftName) {
      addToast({
        type: 'warning',
        title: 'Supplier Name Required',
        message: 'Type a supplier name first before creating it.',
        duration: 4000,
      });
      return;
    }

    setIsCreatingInvoiceSupplier(true);
    try {
      const existing = getSupplierMatchByName(draftName);
      if (existing) {
        setInvoiceSupplier(existing.id);
        setCreateSupplierOnConfirm(false);
        addToast({
          type: 'info',
          title: 'Supplier Matched',
          message: `Using existing supplier: ${existing.name}`,
          duration: 4000,
        });
        return;
      }

      const createdSupplier = await createSupplier({
        name: draftName,
        categories: ['GENERAL'],
      });
      setInvoiceSupplier(createdSupplier.id);
      setCreateSupplierOnConfirm(false);
      addToast({
        type: 'success',
        title: 'Supplier Created',
        message: `${createdSupplier.name} is now selected for this invoice.`,
        duration: 5000,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Supplier Creation Failed',
        message: error?.message || 'Could not create supplier right now. Try again.',
        duration: 6000,
      });
    } finally {
      setIsCreatingInvoiceSupplier(false);
    }
  };

  const handleReceiveInvoice = async () => {
    const branchId = me?.branchId || '';
    if (!branchId) {
      addToast({
        type: 'error',
        title: 'Branch Missing',
        message: 'No branch is assigned to your account. Please re-login or contact admin.',
        duration: 6000,
      });
      return;
    }
    if (!hasResolvableSupplier || !invoiceNumber.trim() || invoiceItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Missing Required Invoice Details',
        message: 'Please select/create supplier, provide invoice number, and add at least one item.',
        duration: 5000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const { gql: runGql, M_CREATE_PRODUCT } = await import('@/lib/gql');
      let resolvedSupplierId = invoiceSupplier;

      if (!resolvedSupplierId && createSupplierOnConfirm && invoiceSupplierDraft.trim()) {
        const createdSupplier = await createSupplier({
          name: invoiceSupplierDraft.trim(),
          categories: ['GENERAL'],
        });
        resolvedSupplierId = createdSupplier.id;
      }

      if (!resolvedSupplierId) {
        throw new Error('Supplier could not be resolved. Please select or create a supplier.');
      }

      const resolvedItems = [];
      
      for (const item of invoiceItems) {
        const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
        const unitCost = Math.max(0, Number(item.unitCost) || 0);
        const name = (item.name || '').trim() || 'Unnamed Item';

        if (!item.exists || !item.productId) {
          console.log(`📦 [AI_SYNC] Auto-creating missing product: ${name}`);
          const newProductResponse = await runGql<{ createProduct: { id: string } }>(M_CREATE_PRODUCT, {
            name,
            category: 'MISCELLANEOUS',
            costPrice: unitCost,
            sellingPrice: unitCost * 1.3,
            stockQuantity: 0,
            supplierId: resolvedSupplierId,
            dosageForm: 'OTHER',
          });
          resolvedItems.push({
            ...item,
            name,
            quantity,
            unitCost,
            productId: newProductResponse.createProduct.id,
            exists: true,
          });
        } else {
          resolvedItems.push({
            ...item,
            name,
            quantity,
            unitCost,
          });
        }
      }

      const payload = {
        branchId,
        supplierId: resolvedSupplierId,
        invoiceNo: invoiceNumber.trim(),
        invoiceDate: toIsoDateOrFallback(invoiceDate),
        dueDate: invoiceDueDate ? toIsoDateOrFallback(invoiceDueDate) : undefined,
        items: resolvedItems.map(item => ({
          productId: item.productId,
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
          unitCost: Math.max(0, Number(item.unitCost) || 0),
          sellingPrice: Math.max(0, Number(item.sellingPrice) || 0),
          batchNo: item.batchNo || `BATCH-${Date.now()}`,
          expiryDate: item.expiryDate ? toIsoDateOrFallback(item.expiryDate) : new Date(Date.now() + 365 * 86400000).toISOString(),
        })),
        tax: 0,
        notes: invoiceNotes
      };

      await gql(M_RECEIVE_INVOICE, payload);
      
      setShowUploadModal(false);
      setInvoiceStep('type');
      setInvoiceItems([]);
      setInvoiceSupplier('');
      setInvoiceSupplierDraft('');
      setCreateSupplierOnConfirm(false);
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setInvoiceDueDate('');
      setInvoiceNotes('');
      setInvoiceFile(null);
      setFilePreview(null);
      
      // Refresh inventory data
      await refetchProducts();
      addToast({
        type: 'success',
        title: 'Invoice Received',
        message: 'Inventory and Accounts Payable updated successfully.',
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Failed to receive invoice:', error);
      addToast({
        type: 'error',
        title: 'Invoice Processing Failed',
        message: error?.message || 'Unable to process invoice. Please try again.',
        duration: 6000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleStockAdjust = async () => {
    if (!stockProduct || stockAdjust === 0) return;
    try {
      await adjustProductStock(stockProduct.id, stockAdjust, stockReason || 'Manual adjustment');
      setShowStockModal(false);
      setStockProduct(null);
      setStockAdjust(0);
      setStockReason('');
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Inventory & Stock Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Real-time tracking, purchase orders, and financial valuation</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Upload size={16} />
              Upload Invoice
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff', boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)' }}>
              <Plus size={18} />
              Add Product
            </button>
          </div>
        )}
      </div>

      {storeError && (
        <div className="p-4 rounded-xl border flex items-center justify-between gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{storeError}</p>
          </div>
          <button
            onClick={signOut}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border shrink-0"
            style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)' }}
          >
            Sign Out
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products.length, sub: `${lowCount + outCount} need attention`, icon: Package, color: '#0EA5E9' },
          { label: 'Stock Value (Cost)', value: `GH₵ ${(totalValue/1000).toFixed(1)}k`, sub: 'Inventory investment', icon: DollarSign, color: '#10B981' },
          { label: 'Retail Value', value: `GH₵ ${(retailValue/1000).toFixed(1)}k`, sub: `Profit: GH₵ ${(potentialProfit/1000).toFixed(1)}k`, icon: TrendingUp, color: '#8B5CF6' },
          { label: 'Pending Orders', value: (purchases || []).filter(o => o.status !== 'received').length, sub: 'Awaiting delivery', icon: Truck, color: '#F59E0B' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${s.color}18`, color: s.color }}><Icon size={18} /></div>
                <div>
                  <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
                  <p className="font-display text-lg font-bold" style={{ color: card.text }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'products', label: 'Products', icon: Package, count: products.length },
          { id: 'suppliers', label: 'Supplier Directory', icon: Truck, count: suppliers.length },
          { id: 'movements', label: 'Stock Movements', icon: History, count: (stockMovements || []).length },
          { id: 'orders', label: 'Purchase Orders', icon: Receipt, count: (purchases || []).length },
          { id: 'valuation', label: 'Financial Valuation', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(148,163,184,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.muted }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'products' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#fff', border: `1px solid ${card.border}`, color: card.text }} />
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                    catFilter === cat 
                      ? 'shadow-md shadow-primary/20 scale-105' 
                      : 'hover:border-primary/30'
                  }`}
                  style={{ 
                    background: catFilter === cat ? card.primary : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
                    borderColor: catFilter === cat ? card.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    color: catFilter === cat ? '#fff' : card.muted 
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  {isAdmin && (
                    <th className="px-5 py-3.5 w-10">
                      <button onClick={toggleSelectAll} className="w-5 h-5 rounded border flex items-center justify-center transition-colors" style={{ borderColor: card.border, background: selectedIds.length === paginatedProducts.length ? card.primary : 'transparent' }}>
                        {selectedIds.length === paginatedProducts.length && <Check size={12} className="text-white" />}
                      </button>
                    </th>
                  )}
                  {['Product', 'Class', 'Cat', 'Supplier', 'Stock', 'Price', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(p => (
                  <tr key={p.id} 
                    className={`transition-colors group cursor-pointer ${selectedIds.includes(p.id) ? (isDark ? 'bg-primary/5' : 'bg-primary/5') : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                    style={{ borderBottom: `1px solid ${card.border}` }}
                    onClick={() => router.push(`/dashboard/inventory/${p.id}`)}
                  >
                    {isAdmin && (
                      <td className="px-5 py-4" onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}>
                        <div className="w-5 h-5 rounded border flex items-center justify-center transition-colors" style={{ borderColor: selectedIds.includes(p.id) ? card.primary : card.border, background: selectedIds.includes(p.id) ? card.primary : 'transparent' }}>
                          {selectedIds.includes(p.id) && <Check size={12} className="text-white" />}
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold" style={{ color: card.text }}>{p.name}</p>
                      {p.generic && <p className="text-[11px]" style={{ color: card.subtle }}>{p.generic}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ 
                        background: p.medClass === 'OTC' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                        color: p.medClass === 'OTC' ? '#10B981' : '#F59E0B' 
                      }}>
                        {p.medClass}
                      </span>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)', color: card.muted }}>{p.cat}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={12} style={{ color: card.subtle }} />
                        {suppliers.find(s => s.id === p.supplierId) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/suppliers/${p.supplierId}`);
                            }}
                            className="text-[10px] font-medium max-w-[120px] truncate hover:underline transition-colors"
                            style={{ color: card.primary }}
                          >
                            {suppliers.find(s => s.id === p.supplierId)?.name}
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium max-w-[120px] truncate" style={{ color: card.muted }}>
                            Direct / Unknown
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-bold" style={{ color: card.text }}>{p.stock}</td>
                    <td className="px-5 py-4 font-mono text-sm font-bold" style={{ color: card.primary }}>GH₵ {p.price.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].bg, color: STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].color }}>
                        {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold text-slate-800" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold text-slate-800" style={{ color: card.text }}>{totalItems}</span> products
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={prevPage}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={nextPage}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: card.primary, color: '#fff' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-2xl border-2 border-dashed" style={{ borderColor: card.border }}>
              <Truck size={48} className="mx-auto mb-4 opacity-20" style={{ color: card.muted }} />
              <p className="text-lg font-bold" style={{ color: card.muted }}>No Suppliers Found</p>
              <p className="text-sm" style={{ color: card.subtle }}>Register your first pharmaceutical supplier</p>
            </div>
          ) : (
            suppliers.map(s => (
              <div key={s.id} className="rounded-2xl border p-5 backdrop-blur-xl group hover:scale-[1.02] transition-all cursor-pointer"
                style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}
                onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                    {s.name[0]}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: '#10B98118', color: '#10B981' }}>
                      Active
                    </span>
                    <p className="text-[10px] mt-1" style={{ color: card.subtle }}>Score: {s.aiScore || 0}/100</p>
                  </div>
                </div>
                <h3 className="font-display font-bold text-base mb-1" style={{ color: card.text }}>{s.name}</h3>
                <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: card.border }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Phone size={12} /> {s.phone || 'No phone'}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Mail size={12} /> {s.email || 'No email'}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                    <Building size={12} /> {s.address || 'No address'}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] font-bold" style={{ color: card.primary }}>{products.filter(p => p.supplierId === s.id).length} Products</p>
                  <ChevronRight size={16} style={{ color: card.subtle }} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-6xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition-all" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: card.border, background: card.primaryBg }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}><Package size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Add New Product</h2>
                  <p className="text-[11px]" style={{ color: card.muted }}>Register a new pharmaceutical item with AI-native tools</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors"><X size={20} /></button>
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
                  onClick={() => setAddModalTab(tab.id as any)}
                  className="flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative"
                  style={{ color: addModalTab === tab.id ? card.primary : card.muted }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {addModalTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: card.primary }} />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Tab 1: Basic Info */}
              {addModalTab === 'basic' && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Name *</label>
                    <input type="text" placeholder="e.g. Paracetamol 500mg" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Generic Name</label>
                    <input type="text" placeholder="e.g. Acetaminophen" value={newProduct.genericName} onChange={e => setNewProduct({...newProduct, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Brand / Manufacturer</label>
                    <input type="text" placeholder="e.g. GSK" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Category *</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Dosage Form</label>
                    <select value={newProduct.dosageForm} onChange={e => setNewProduct({...newProduct, dosageForm: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
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
                    <input type="text" placeholder="e.g. 500mg, 10mg/5ml" value={newProduct.strength} onChange={e => setNewProduct({...newProduct, strength: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Classification *</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      {['OTC', 'POM', 'CONTROLLED'].map(c => (
                        <button key={c} onClick={() => setNewProduct({...newProduct, classification: c})} 
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newProduct.classification === c ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                          style={{ 
                            background: newProduct.classification === c ? (isDark ? card.primaryBg : '#fff') : 'transparent',
                            color: newProduct.classification === c ? card.primary : card.text
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Pricing & Stock */}
              {addModalTab === 'pricing' && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Barcode / SKU</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Scan or enter barcode" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Cost Price (GH₵) *</label>
                    <input type="number" min="0" step="0.01" value={newProduct.costPrice || ''} onChange={e => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Selling Price (GH₵) *</label>
                    <input type="number" min="0" step="0.01" value={newProduct.sellingPrice || ''} onChange={e => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>

                  {/* Margin Calculator */}
                  <div className="col-span-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Profit Margin</p>
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Per unit sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">
                        {newProduct.costPrice > 0 
                          ? `${(((newProduct.sellingPrice - newProduct.costPrice) / newProduct.costPrice) * 100).toFixed(1)}%` 
                          : '0.0%'}
                      </p>
                      <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">
                        GH₵ {(newProduct.sellingPrice - newProduct.costPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-5" style={{ borderColor: card.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Initial Stock Quantity</label>
                    <div className="flex items-center gap-4">
                      <input type="number" min="0" value={newProduct.stockQuantity === undefined ? '' : newProduct.stockQuantity} onChange={e => setNewProduct({...newProduct, stockQuantity: parseInt(e.target.value) || 0})} className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      <p className="text-xs w-1/2" style={{ color: card.muted }}>If you leave this at 0, you can receive stock later via Purchase Orders.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Supplier & Media */}
              {addModalTab === 'supplier' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Supplier</label>
                      <select value={newProduct.supplierId} onChange={e => setNewProduct({...newProduct, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="">Direct / Unknown / General</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>FDA / NAFDAC Number</label>
                      <input type="text" placeholder="Regulatory ID" value={newProduct.nafdacNo} onChange={e => setNewProduct({...newProduct, nafdacNo: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Image URL (Optional)</label>
                      <input type="text" placeholder="https://example.com/image.png" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Media</label>
                    <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group" style={{ borderColor: card.border, background: card.inputBg }}>
                      {newProduct.imageUrl ? (
                        <>
                          <img src={newProduct.imageUrl} className="w-full h-full object-cover" alt="Product Preview" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => setNewProduct({...newProduct, imageUrl: ''})} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Remove</button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <Sparkles size={32} className="mx-auto mb-2 opacity-50" style={{ color: card.primary }} />
                          <p className="text-[10px] opacity-70" style={{ color: card.text }}>No image selected</p>
                        </div>
                      )}
                      {isGeneratingImage && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-cyan-500 text-[10px] font-bold tracking-widest animate-pulse">GENERATING...</div>}
                    </div>
                    <button onClick={handleGenerateImage} disabled={!newProduct.name || isGeneratingImage} className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                      {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                      {isGeneratingImage ? 'AI is working...' : 'Auto-Generate via AI'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-5 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: card.border }}>
              <button 
                onClick={() => {
                  if (addModalTab === 'pricing') setAddModalTab('basic');
                  else if (addModalTab === 'supplier') setAddModalTab('pricing');
                  else setShowAddModal(false);
                }} 
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-800" 
                style={{ color: card.text }}
              >
                {addModalTab === 'basic' ? 'Cancel' : 'Back'}
              </button>
              
              <div className="flex gap-3">
                {addModalTab !== 'supplier' ? (
                  <button
                    onClick={() => {
                      if (addModalTab === 'basic') setAddModalTab('pricing');
                      else setAddModalTab('supplier');
                    }}
                    className="px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                    style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
                  >
                    Continue
                  </button>
                ) : (
                  <button onClick={handleAddProduct} disabled={isCreatingProduct || !newProduct.name || newProduct.costPrice <= 0 || newProduct.sellingPrice <= 0} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2" style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                    {isCreatingProduct ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isCreatingProduct ? 'Saving...' : 'Save Product'}
                  </button>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
      
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-6 backdrop-blur-xl"
            style={{ background: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', borderColor: card.border }}
          >
            <div className="flex items-center gap-3 pr-6 border-r" style={{ borderColor: card.border }}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {selectedIds.length}
              </div>
              <p className="text-sm font-medium" style={{ color: card.text }}>Items Selected</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowMoveModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 transition-all"
              >
                <Move size={16} /> Move to Supplier
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                style={{ color: card.muted }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Move size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: card.text }}>Move to Supplier</h3>
                <p className="text-xs" style={{ color: card.muted }}>Reassigning {selectedIds.length} products</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Select Target Supplier</label>
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
                onClick={handleBulkMove}
                disabled={isSaving || !targetSupplierId}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: card.primary }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Product Wizard Modal ─────────────────────────────────── */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-6xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: card.border, background: card.primaryBg }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}><Package size={20} /></div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Edit Product</h2>
                  <p className="text-[11px]" style={{ color: card.muted }}>All fields are optional — only changed values will be saved</p>
                </div>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingProduct(null); }} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors"><X size={20} /></button>
            </div>

            {/* Tabs */}
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

            {/* Tab Body */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">

              {/* Tab 1: Basic Info */}
              {editModalTab === 'basic' && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Product Name</label>
                    <input type="text" placeholder="Leave blank to keep current" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Generic Name</label>
                    <input type="text" placeholder="e.g. Acetaminophen" value={editForm.genericName} onChange={e => setEditForm({...editForm, genericName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Brand / Manufacturer</label>
                    <input type="text" placeholder="e.g. GSK" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Category</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Dosage Form</label>
                    <select value={editForm.dosageForm} onChange={e => setEditForm({...editForm, dosageForm: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                      {['TABLET','CAPSULE','SYRUP','SUSPENSION','INJECTION','CREAM','OINTMENT','DROPS','POWDER','SACHET','OTHER'].map(d => <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Strength</label>
                    <input type="text" placeholder="e.g. 500mg" value={editForm.strength} onChange={e => setEditForm({...editForm, strength: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Classification</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      {['OTC', 'POM', 'CONTROLLED'].map(c => (
                        <button key={c} onClick={() => setEditForm({...editForm, classification: c})}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editForm.classification === c ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                          style={{ background: editForm.classification === c ? (isDark ? card.primaryBg : '#fff') : 'transparent', color: editForm.classification === c ? card.primary : card.text }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Pricing */}
              {editModalTab === 'pricing' && (
                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Barcode / SKU</label>
                    <input type="text" placeholder="Scan or type barcode" value={editForm.barcode} onChange={e => setEditForm({...editForm, barcode: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Cost Price (GH₵)</label>
                    <input type="number" min="0" step="0.01" value={editForm.costPrice || ''} onChange={e => setEditForm({...editForm, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Selling Price (GH₵)</label>
                    <input type="number" min="0" step="0.01" value={editForm.sellingPrice || ''} onChange={e => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                  </div>
                  {editForm.costPrice > 0 && editForm.sellingPrice > 0 && (
                    <div className="col-span-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Profit Margin</p>
                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Per unit sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">
                          {(((editForm.sellingPrice - editForm.costPrice) / editForm.costPrice) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs font-bold text-emerald-600/80">GH₵ {(editForm.sellingPrice - editForm.costPrice).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 border-t pt-5 mt-2" style={{ borderColor: card.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Current Stock Quantity</label>
                    <div className="flex items-center gap-4">
                      <input type="number" min="0" value={editForm.stockQuantity === undefined ? '' : editForm.stockQuantity} onChange={e => setEditForm({...editForm, stockQuantity: parseInt(e.target.value) || 0})} className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      <p className="text-xs w-1/2" style={{ color: card.muted }}>Update the stock count manually if needed. 0 is allowed for out-of-stock items.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Supplier & Media */}
              {editModalTab === 'supplier' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Supplier</label>
                      <select value={editForm.supplierId} onChange={e => setEditForm({...editForm, supplierId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                        <option value="">Direct / Unknown</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>FDA / NAFDAC Number</label>
                      <input type="text" placeholder="Regulatory ID" value={editForm.nafdacNo} onChange={e => setEditForm({...editForm, nafdacNo: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: card.subtle }}>Image URL (Optional)</label>
                      <input type="text" placeholder="https://..." value={editForm.imageUrl} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none font-mono" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: card.subtle }}>Product Preview</label>
                    <div className="relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden" style={{ borderColor: card.border, background: card.inputBg }}>
                      {editForm.imageUrl ? (
                        <img src={editForm.imageUrl} className="w-full h-full object-cover" alt="Preview" onError={() => setEditForm({...editForm, imageUrl: ''})} />
                      ) : (
                        <div className="text-center p-4 opacity-40">
                          <Sparkles size={32} className="mx-auto mb-2" style={{ color: card.primary }} />
                          <p className="text-[10px]" style={{ color: card.text }}>No image set</p>
                        </div>
                      )}
                      {isGeneratingImage && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-cyan-500 text-[10px] font-bold tracking-widest animate-pulse">GENERATING...</div>}
                    </div>
                    <button onClick={handleGenerateImageEdit} disabled={!editForm.name || isGeneratingImage} className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                      {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                      {isGeneratingImage ? 'AI is working...' : 'Auto-Generate via AI'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: card.border }}>
              <button onClick={() => { setShowEditModal(false); setEditingProduct(null); }} className="px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all" style={{ color: card.text }}>Cancel</button>
              <div className="flex gap-2">
                {editModalTab !== 'basic' && <button onClick={() => setEditModalTab(editModalTab === 'pricing' ? 'basic' : 'pricing')} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all border" style={{ borderColor: card.border, color: card.text }}>Back</button>}
                {editModalTab !== 'supplier' ? (
                  <button onClick={() => setEditModalTab(editModalTab === 'basic' ? 'pricing' : 'supplier')} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: card.primary, color: '#fff' }}>Continue</button>
                ) : (
                  <button onClick={handleEditProduct} disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: '#10B981', color: '#fff' }}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-[94vw] xl:max-w-[1500px] rounded-[40px] border shadow-2xl flex flex-col max-h-[94vh] overflow-hidden" 
            style={{ background: isDark ? '#0A0E1A' : '#fff', borderColor: card.border }}
          >
            {/* Header */}
            <div className="p-8 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
                  <Upload size={28} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-black tracking-tight" style={{ color: card.text }}>Smart Inventory Ingestion</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">AI-Powered OCR Active</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/10 text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-12 py-6 border-b" style={{ borderColor: card.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              {[
                { step: 'type', label: 'Method' },
                { step: isAiMode ? 'upload' : 'verify', label: isAiMode ? 'Scan' : 'Add Items' },
                { step: 'terms', label: 'Financials' }
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${invoiceStep === s.step ? 'scale-125' : 'opacity-40'}`} 
                    style={{ background: invoiceStep === s.step ? card.primary : card.muted, color: '#fff', boxShadow: invoiceStep === s.step ? `0 0 20px ${card.primary}60` : 'none' }}>
                    {i + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${invoiceStep === s.step ? '' : 'opacity-30'}`} style={{ color: card.text }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {/* STEP 1: Choice & Initial Details */}
              {invoiceStep === 'type' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="grid grid-cols-2 gap-8 py-4">
                    <button 
                      onClick={() => { setIsAiMode(true); setInvoiceStep('upload'); }}
                      className="group p-8 rounded-[32px] border-2 border-dashed transition-all hover:border-primary hover:bg-primary/5 text-center flex flex-col items-center gap-6"
                      style={{ borderColor: card.border }}
                    >
                      <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles size={40} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: card.text }}>AI Vision Scan</h3>
                        <p className="text-[10px] font-black leading-relaxed opacity-40 uppercase tracking-widest" style={{ color: card.text }}>Extract from PDF / PNG / JPEG</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => { setIsAiMode(false); setInvoiceStep('verify'); }}
                      className="group p-8 rounded-[32px] border-2 border-dashed transition-all hover:border-emerald-500 hover:bg-emerald-500/5 text-center flex flex-col items-center gap-6"
                      style={{ borderColor: card.border }}
                    >
                      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Edit2 size={40} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: card.text }}>Manual Ledger</h3>
                        <p className="text-[10px] font-black leading-relaxed opacity-40 uppercase tracking-widest" style={{ color: card.text }}>Draft manual receiving report</p>
                      </div>
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 2 (AI): Upload */}
              {invoiceStep === 'upload' && (
                <div className="flex flex-col items-center justify-center py-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
                   <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative w-[450px] h-[350px] rounded-[40px] border-4 border-dashed flex flex-col items-center justify-center transition-all ${isScanning ? 'border-primary shadow-2xl scale-105' : isDragging ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' : 'hover:border-primary/50'}`} 
                      style={{ borderColor: isDragging ? card.primary : card.border }}
                    >
                      {isScanning ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden rounded-[36px] bg-slate-900/10 backdrop-blur-md">
                           {filePreview ? (
                             <img src={filePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                           ) : (
                             <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <FileText size={200} />
                             </div>
                           )}
                           <motion.div 
                             animate={{ y: [-150, 150, -150] }}
                             transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                             className="absolute top-0 left-0 right-0 h-1.5 z-10"
                             style={{ 
                               background: `linear-gradient(to right, transparent, ${card.primary}, transparent)`,
                               boxShadow: `0 0 30px ${card.primary}` 
                             }}
                           />
                           <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center animate-bounce z-20">
                              <Sparkles size={40} className="text-primary" />
                           </div>
                           <div className="text-center z-20">
                             <p className="text-base font-black tracking-widest text-primary">AI NEURAL SCANNING...</p>
                             <p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-tighter" style={{ color: card.text }}>Processing High-Res Image/PDF Metadata</p>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center p-12">
                           <div className="w-24 h-24 rounded-[32px] bg-slate-500/5 flex items-center justify-center mx-auto mb-8 border border-dashed border-slate-500/20">
                              <Upload size={40} className="opacity-20" style={{ color: card.text }} />
                           </div>
                           <h3 className="text-lg font-black mb-2" style={{ color: card.text }}>
                             {isDragging ? 'Drop Invoice Here' : 'Ready for Intelligent Ingestion'}
                           </h3>
                           <p className="text-xs font-bold opacity-40 mb-8 max-w-[280px] mx-auto uppercase tracking-wider" style={{ color: card.text }}>Supports PDF, PNG, JPG, JPEG & Batch Scans</p>
                           
                           <label className="cursor-pointer group/btn relative overflow-hidden">
                             <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                             <div 
                               className="px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 animate-pulse"
                               style={{ backgroundColor: card.primary, boxShadow: `0 20px 40px -10px ${card.primary}40` }}
                             >
                               <Sparkles size={16} /> 
                               Upload Supplier Invoice
                             </div>
                           </label>
                           
                           <div className="mt-8 flex items-center justify-center gap-6 opacity-30">
                              <div className="flex flex-col items-center gap-1">
                                 <FileText size={20} />
                                 <span className="text-[8px] font-black">PDF</span>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                 <div className="w-5 h-5 rounded bg-current" />
                                 <span className="text-[8px] font-black">IMAGE</span>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              )}

              {/* STEP 2 (Universal): Verification / Add Items */}
              {invoiceStep === 'verify' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-2 gap-8 p-6 rounded-[24px] border mb-6" style={{ background: card.inputBg, borderColor: card.border }}>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">Primary Supplier</label>
                       <select 
                        value={invoiceSupplier}
                        onChange={(e) => {
                          const value = e.target.value;
                          setInvoiceSupplier(value);
                          if (value) setCreateSupplierOnConfirm(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold focus:outline-none" 
                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${card.border}`, color: card.text }}
                      >
                        <option value="">Select Manufacturer...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {!invoiceSupplier && (
                        <div className="mt-3 space-y-3">
                          <input
                            type="text"
                            value={invoiceSupplierDraft}
                            onChange={(e) => setInvoiceSupplierDraft(e.target.value)}
                            placeholder="Type new supplier name from invoice"
                            className="w-full px-4 py-3 rounded-xl text-sm font-bold focus:outline-none"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${card.border}`, color: card.text }}
                          />
                          <label className="flex items-center gap-2 text-xs font-bold" style={{ color: card.muted }}>
                            <input
                              type="checkbox"
                              checked={createSupplierOnConfirm}
                              onChange={(e) => setCreateSupplierOnConfirm(e.target.checked)}
                            />
                            Create this supplier automatically on final confirmation
                          </label>
                          <button
                            type="button"
                            onClick={handleCreateInvoiceSupplierNow}
                            disabled={isCreatingInvoiceSupplier || !invoiceSupplierDraft.trim()}
                            className="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}
                          >
                            {isCreatingInvoiceSupplier ? 'Creating Supplier...' : 'Create Supplier Now'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">Invoice Number</label>
                       <div className="relative">
                         <input 
                           type="text" 
                           value={invoiceNumber} 
                           onChange={e => setInvoiceNumber(e.target.value)} 
                           placeholder="e.g. INV-2026-102"
                           className="w-full px-4 py-3 rounded-xl text-sm font-bold font-mono focus:outline-none" 
                           style={{ 
                             background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', 
                             border: `1px solid ${
                               invoiceDuplicateStatus === 'duplicate' ? '#ef4444' 
                               : invoiceDuplicateStatus === 'ok' ? '#10b981' 
                               : card.border
                             }`, 
                             color: card.text 
                           }}
                         />
                         {invoiceDuplicateStatus === 'checking' && (
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50" style={{ color: card.muted }}>Checking…</span>
                         )}
                         {invoiceDuplicateStatus === 'ok' && (
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">✓ Available</span>
                         )}
                       </div>
                       {invoiceDuplicateStatus === 'duplicate' && (
                         <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 mt-1">
                           <span className="text-red-500 text-lg leading-none">⚠</span>
                           <div>
                             <p className="text-xs font-black text-red-500">Invoice already uploaded!</p>
                             <p className="text-[10px]" style={{ color: card.muted }}>Invoice <span className="font-bold font-mono">{invoiceNumber}</span> already exists in the system. Please verify your invoice number.</p>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: card.primary }}>Line Item Verification</h3>
                     <div className="relative w-[460px]">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: card.text }} />
                        <input 
                          type="text" 
                          placeholder="Search product name, brand, or category..." 
                          className="w-full pl-12 pr-4 py-3 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                          value={invoiceSearchQuery}
                          onFocus={() => setShowSearchDropdown(true)}
                          onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                        />
                        
                        {/* Intelligent Search Dropdown */}
                        <AnimatePresence>
                          {showSearchDropdown && invoiceSearchQuery.length > 1 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 right-0 mt-3 rounded-[24px] border shadow-2xl z-50 overflow-hidden"
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}
                            >
                               <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                                  {products.filter(p => p.name.toLowerCase().includes(invoiceSearchQuery.toLowerCase())).length > 0 ? (
                                    products.filter(p => p.name.toLowerCase().includes(invoiceSearchQuery.toLowerCase())).map(p => (
                                      <button 
                                        key={p.id}
                                        onClick={() => addProductToInvoice(p)}
                                        className="w-full text-left p-4 rounded-xl hover:bg-primary/5 flex items-center justify-between group transition-colors"
                                      >
                                        <div>
                                          <p className="text-xs font-black" style={{ color: card.text }}>{p.name}</p>
                                          <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{p.cat} • {p.brand}</p>
                                        </div>
                                        <Plus size={14} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                      </button>
                                    ))
                                  ) : (
                                    <div className="p-8 text-center">
                                      <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Product "{invoiceSearchQuery}" not found</p>
                                      <button 
                                        onClick={() => {
                                          setNewProduct((prev: any) => ({ ...prev, name: invoiceSearchQuery.trim(), supplierId: invoiceSupplier || '' }));
                                          setAddModalFromInvoice(true);
                                          setShowAddModal(true);
                                          setShowSearchDropdown(false);
                                        }}
                                        className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20"
                                        style={{ backgroundColor: card.success }}
                                      >
                                        Create New & Add
                                      </button>
                                    </div>
                                  )}
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>

                  <div className="rounded-3xl border overflow-hidden" style={{ borderColor: card.border }}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[900px]">
                        <thead style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                          <tr>
                            {['Product Name', 'Batch No', 'Expiry', 'Qty', 'Unit Cost (GH₵)', 'Sell Price (GH₵)', 'Total', ''].map(h => (
                              <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: card.text }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: card.border }}>
                          {invoiceItems.map((item, idx) => (
                            <tr key={item.id} className="group hover:bg-primary/5 transition-colors">
                              <td className="px-6 py-4 min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${item.exists ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {item.exists ? <Check size={14} /> : <Plus size={14} />}
                                  </div>
                                  <div>
                                    <input 
                                      className="bg-transparent font-bold text-sm focus:outline-none w-full" 
                                      style={{ color: card.text }}
                                      value={item.name}
                                      onChange={(e) => {
                                        const newItems = [...invoiceItems];
                                        newItems[idx].name = e.target.value;
                                        setInvoiceItems(newItems);
                                      }}
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: item.exists ? '#10B981' : '#EF4444' }}>
                                        {item.exists ? 'Found in Catalog' : 'New Product'}
                                      </p>
                                      {!item.exists && (
                                        <button
                                          type="button"
                                          onClick={() => handleCreateInvoiceProductNow(item.id)}
                                          disabled={creatingInvoiceProductId === item.id}
                                          className="px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                          style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}
                                        >
                                          {creatingInvoiceProductId === item.id ? 'Creating...' : 'Create Now'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                 <input 
                                   type="text" 
                                   placeholder="Batch #"
                                   className="w-24 bg-transparent font-mono text-xs font-bold focus:outline-none p-1 rounded hover:bg-slate-500/10" 
                                   style={{ color: card.text }}
                                   value={item.batchNo || ''}
                                   onChange={(e) => {
                                     const newItems = [...invoiceItems];
                                     newItems[idx].batchNo = e.target.value;
                                     setInvoiceItems(newItems);
                                   }}
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <input 
                                   type="date" 
                                   className="bg-transparent font-mono text-[10px] font-bold focus:outline-none p-1 rounded hover:bg-slate-500/10" 
                                   style={{ color: card.text }}
                                   value={item.expiryDate || ''}
                                   onChange={(e) => {
                                     const newItems = [...invoiceItems];
                                     newItems[idx].expiryDate = e.target.value;
                                     setInvoiceItems(newItems);
                                   }}
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <input 
                                   type="number" 
                                   className="w-16 bg-transparent font-mono text-sm font-bold focus:outline-none" 
                                   style={{ color: card.text }}
                                   value={item.quantity}
                                   onChange={(e) => {
                                     const newItems = [...invoiceItems];
                                     newItems[idx].quantity = parseInt(e.target.value) || 0;
                                     setInvoiceItems(newItems);
                                   }}
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <input 
                                   type="number" 
                                   className="w-24 bg-transparent font-mono text-sm font-bold focus:outline-none" 
                                   style={{ color: card.text }}
                                   value={item.unitCost}
                                   onChange={(e) => {
                                     const newItems = [...invoiceItems];
                                     newItems[idx].unitCost = parseFloat(e.target.value) || 0;
                                     setInvoiceItems(newItems);
                                   }}
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <input 
                                   type="number" 
                                   className="w-24 bg-transparent font-mono text-sm font-bold focus:outline-none" 
                                   style={{ color: card.success }}
                                   placeholder="Sell Price"
                                   value={item.sellingPrice || ''}
                                   onChange={(e) => {
                                     const newItems = [...invoiceItems];
                                     newItems[idx].sellingPrice = parseFloat(e.target.value) || 0;
                                     setInvoiceItems(newItems);
                                   }}
                                 />
                              </td>
                              <td className="px-6 py-4 font-mono text-sm font-bold" style={{ color: card.text }}>
                                 GH₵ {(item.quantity * item.unitCost).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button 
                                   onClick={() => setInvoiceItems(invoiceItems.filter(i => i.id !== item.id))}
                                   className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                              </td>
                            </tr>
                          ))}
                          {invoiceItems.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-24 text-center">
                                 <div className="w-16 h-16 rounded-full bg-slate-500/5 flex items-center justify-center mx-auto mb-4">
                                    <Package size={32} className="opacity-10" />
                                 </div>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30" style={{ color: card.text }}>Start by searching for products above</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-primary/5 rounded-[24px] p-6 border border-primary/20">
                     <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl text-white" style={{ backgroundColor: card.primary }}>
                           <CreditCard size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: card.text }}>Subtotal Payable</p>
                           <p className="text-3xl font-display font-black" style={{ color: card.primary }}>
                             GH₵ {invoiceItems.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowAddModal(true)}
                       className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                       style={{ backgroundColor: card.success, boxShadow: `0 10px 30px -5px ${card.success}40` }}
                     >
                       <Plus size={16} /> Bulk Add New
                     </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Terms & Logistics */}
              {invoiceStep === 'terms' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: card.subtle }}>Invoice Date</label>
                        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl text-sm font-bold" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: card.subtle }}>Payment Due Date</label>
                        <div className="relative">
                          <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl text-sm font-bold" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: card.subtle }}>Receiving Notes (Narration)</label>
                      <textarea rows={4} value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} className="w-full px-5 py-4 rounded-2xl text-sm font-bold" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} placeholder="e.g. Paid 500 GHS in cash, balance 200 via Momo. Handled by Kwame." />
                    </div>

                    <div className="p-6 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center" style={{ borderColor: card.border, background: card.inputBg }}>
                       <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <CheckCircle size={24} />
                       </div>
                       <p className="text-xs font-bold leading-relaxed" style={{ color: card.muted }}>Confirming this invoice will instantly sync stock levels and log the liability in the accounts payable ledger.</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-6 rounded-[24px] border" style={{ borderColor: card.border, background: card.inputBg }}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: card.primary }}>Final Review</h4>
                    <div className="space-y-2 text-xs font-bold" style={{ color: card.text }}>
                      <p>Supplier: {invoiceSupplier ? (suppliers.find(s => s.id === invoiceSupplier)?.name || 'Selected supplier') : (invoiceSupplierDraft || 'Not set')}</p>
                      <p>Invoice No: {invoiceNumber || 'Not set'}</p>
                      <p>Line Items: {invoiceItems.length}</p>
                      <p>New Products to Create: {newInvoiceItems.length}</p>
                      <p className="text-base" style={{ color: card.primary }}>Subtotal: GH₵ {invoiceSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    {newInvoiceItems.length > 0 && (
                      <div className="rounded-2xl border p-3 max-h-40 overflow-y-auto" style={{ borderColor: card.border }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: card.warning }}>New product queue</p>
                        <div className="space-y-1">
                          {newInvoiceItems.slice(0, 8).map((item, idx) => (
                            <p key={`${item.id}-${idx}`} className="text-[11px] font-bold" style={{ color: card.muted }}>
                              • {item.name || 'Unnamed Item'}
                            </p>
                          ))}
                          {newInvoiceItems.length > 8 && (
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>
                              +{newInvoiceItems.length - 8} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {!hasResolvableSupplier && (
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: card.danger }}>
                        Supplier required: select existing or type new supplier and enable auto-create.
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-8 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/40" style={{ borderColor: card.border }}>
               <button 
                 onClick={() => {
                   if (invoiceStep === 'upload') setInvoiceStep('type');
                   else if (invoiceStep === 'verify') setInvoiceStep('type');
                   else if (invoiceStep === 'terms') setInvoiceStep('verify');
                   else setShowUploadModal(false);
                 }}
                 className="px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                 style={{ color: card.text }}
               >
                 {invoiceStep === 'type' ? 'Cancel' : 'Back'}
               </button>

               <div className="flex gap-4">
                 {invoiceStep !== 'terms' ? (
                   <button 
                     onClick={() => {
                        if (invoiceStep === 'type') setInvoiceStep(isAiMode ? 'upload' : 'verify');
                        else setInvoiceStep('terms');
                     }}
                     disabled={
                       (invoiceStep === 'verify' && invoiceItems.length === 0) ||
                       (invoiceStep === 'upload' && (isScanning || !invoiceFile))
                     }
                     className="px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
                   >
                     {invoiceStep === 'upload' && isScanning ? 'Scanning...' : 'Continue'}
                   </button>
                 ) : (
                   <button 
                     onClick={handleReceiveInvoice}
                     disabled={isSaving || !hasResolvableSupplier || !invoiceNumber || invoiceDuplicateStatus === 'duplicate'}
                     className="px-12 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                     style={{ background: card.success, color: '#fff' }}
                   >
                     {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Confirm & Sync Stock'}
                   </button>
                 )}
               </div>
            </div>
          </motion.div>
        </div>
      )}



      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: card.text }}>Delete Product?</h3>
            <p className="text-sm mb-6" style={{ color: card.muted }}>This action is permanent and will remove this product from all inventory records.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>Cancel</button>
              <button onClick={async () => { if (confirmDelete) { await deleteProduct(confirmDelete); setConfirmDelete(null); } }} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
