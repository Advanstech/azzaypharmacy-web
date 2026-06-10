import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { PharmaProductImage } from './PharmaProductImage';

interface TopResultPillProps {
  product: any;
  onAddToCart?: (product: any) => void;
  onPreviewProduct?: (product: any) => void;
  onPreviewSupplier?: (supplierId: string) => void;
  isDark?: boolean;
}

export function TopResultPill({ product, onAddToCart, isDark = false, onPreviewProduct, onPreviewSupplier }: TopResultPillProps) {
  const { suppliers } = useStore();
  const supplier = product.supplier || suppliers.find(s => s.id === product.supplierId);

  // We use the exact light green colors from the screenshot
  const bg = '#f0fdf4'; // green-50
  const border = '#bbf7d0'; // green-200
  const textDark = '#166534'; // green-800
  const textLight = '#15803d'; // green-700

  return (
    <div 
      className="flex items-center gap-4 px-4 py-3 rounded-xl border mb-4 shadow-sm"
      style={{ background: bg, borderColor: border }}
    >
      {/* Product Image */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border bg-white" style={{ borderColor: border }}>
        <PharmaProductImage
          name={product.name}
          dosageForm={product.dosageForm}
          strength={product.strength}
          imageUrl={product.imageUrl}
          className="w-full h-full object-cover"
        />
        {/* Stock indicator */}
        <div 
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2"
          style={{ 
            background: product.stockQuantity > 10 ? '#22c55e' : product.stockQuantity > 0 ? '#f59e0b' : '#ef4444',
            borderColor: '#f0fdf4',
            color: '#fff'
          }}
        >
          {product.stockQuantity}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreviewProduct?.(product); }}
          className="font-bold hover:underline block truncate cursor-pointer" 
          style={{ color: textDark }}
        >
          {product.name}
        </span>
        <div className="text-xs truncate flex items-center gap-1 flex-wrap mt-0.5" style={{ color: textLight }}>
          <span>{product.genericName || product.brand || 'No brand'}</span>
          <span>·</span>
          <span>In stock</span>
          {product.supplierId && (
            <>
              <span>·</span>
              <span>Supplier: <Link href={`/dashboard/suppliers/${product.supplierId}`} className="hover:underline ml-0.5" onClick={e => e.stopPropagation()}>{supplier?.name || 'Unknown'}</Link></span>
            </>
          )}
          <span>·</span>
          <Link href={`/dashboard/inventory/${product.id}`} className="hover:underline font-semibold ml-0.5" onClick={e => e.stopPropagation()}>
            View Details
          </Link>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-sm" style={{ color: textDark }}>
            GH¢{product.sellingPrice || product.price || 0}
          </span>
          {product.costPrice && (
            <span className="text-xs line-through" style={{ color: textLight }}>
              GH¢{product.costPrice}
            </span>
          )}
        </div>
      </div>

      {/* Top right tag */}
      <div className="absolute top-3 right-4">
        <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${product.requiresRx ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
          {product.requiresRx ? 'POM' : 'OTC'}
        </span>
      </div>

      {/* Add to Cart Button */}
      {onAddToCart && (
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex-shrink-0 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
            style={{ background: '#22c55e', color: '#fff' }}
            title="Add to cart"
          >
            <Plus size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
