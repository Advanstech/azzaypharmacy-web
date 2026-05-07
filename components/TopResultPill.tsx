import Link from 'next/link';
import { useStore } from '@/lib/store';

interface TopResultPillProps {
  product: any;
  onAddToCart?: (product: any) => void;
  onPreviewProduct?: (product: any) => void;
  onPreviewSupplier?: (supplierId: string) => void;
  isDark?: boolean;
}

export function TopResultPill({ product, isDark = false, onPreviewProduct, onPreviewSupplier }: TopResultPillProps) {
  const { suppliers } = useStore();
  const supplier = product.supplier || suppliers.find(s => s.id === product.supplierId);

  // We use the exact light green colors from the screenshot
  const bg = '#f0fdf4'; // green-50
  const border = '#bbf7d0'; // green-200
  const textDark = '#166534'; // green-800
  const textLight = '#15803d'; // green-700

  return (
    <div 
      className="flex items-center px-4 py-3 rounded-xl border mb-4 shadow-sm"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex-1 text-sm">
        {onPreviewProduct ? (
          <button onClick={() => onPreviewProduct(product)} className="font-bold hover:underline" style={{ color: textDark }}>
            {product.name}
          </button>
        ) : (
          <span className="font-bold" style={{ color: textDark }}>{product.name}</span>
        )}
        <span style={{ color: textLight }}>
          {`: In stock (${product.stockQuantity}/${product.maxStock || product.stockQuantity}). Supplier: `}
        </span>
        {product.supplierId ? (
          onPreviewSupplier ? (
            <button onClick={() => onPreviewSupplier(product.supplierId)} className="font-bold hover:underline" style={{ color: textDark }}>
              {supplier?.name || 'Unknown'}
            </button>
          ) : (
            <span className="font-bold" style={{ color: textDark }}>{supplier?.name || 'Unknown'}</span>
          )
        ) : (
          <span className="font-bold" style={{ color: textDark }}>{product.brand || 'Unknown'}</span>
        )}
        <span style={{ color: textDark }}>.</span>
      </div>
    </div>
  );
}
