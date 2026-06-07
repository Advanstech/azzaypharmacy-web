import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface TopResultPillProps {
  product: any;
  onAddToCart?: (product: any) => void;
  onPreviewProduct?: (product: any) => void;
  onPreviewSupplier?: (supplierId: string) => void;
  isDark?: boolean;
}

// Helper to get product image (same as in POS page)
const getProductImage = (product: any) => {
  if (product.imageUrl) return product.imageUrl;
  if (product.images?.[0]?.url) return product.images[0].url;
  if (product.image) return product.image;
  if (product.photoUrl) return product.photoUrl;
  return null;
};

export function TopResultPill({ product, onAddToCart, isDark = false, onPreviewProduct, onPreviewSupplier }: TopResultPillProps) {
  const { suppliers } = useStore();
  const supplier = product.supplier || suppliers.find(s => s.id === product.supplierId);
  const productImage = getProductImage(product);

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
      <div className="relative flex-shrink-0">
        {productImage ? (
          <img 
            src={productImage} 
            alt={product.name}
            className="w-16 h-16 rounded-lg object-cover border bg-white"
            style={{ borderColor: border }}
            onError={(e) => {
              const initials = product.name ? product.name.substring(0, 2).toUpperCase() : 'RX';
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#dcfce7"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="bold" font-size="36" fill="#15803d">${initials}</text></svg>`;
              e.currentTarget.src = `data:image/svg+xml;base64,${btoa(svg)}`;
            }}
          />
        ) : (
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center border"
            style={{ background: '#dcfce7', borderColor: border }}
          >
            <ImageIcon size={24} style={{ color: textLight }} />
          </div>
        )}
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
        <Link href={`/dashboard/inventory/${product.id}`} className="font-bold hover:underline block truncate" style={{ color: textDark }}>
          {product.name}
        </Link>
        <p className="text-xs truncate" style={{ color: textLight }}>
          {product.genericName || product.brand || 'No brand'} · In stock
          {product.supplierId && (
            <> · Supplier: {supplier?.name || 'Unknown'}</>
          )}
        </p>
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
