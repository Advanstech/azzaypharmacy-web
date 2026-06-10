import React, { useEffect, useState } from 'react';

// In-memory cache of generated data URLs to ensure instant rendering and no flickering
const imageCache = new Map<string, string>();

interface PharmaProductImageProps {
  name: string;
  dosageForm?: string;
  strength?: string;
  imageUrl?: string;
  className?: string;
}

export function PharmaProductImage({
  name,
  dosageForm = 'TABLET',
  strength = '',
  imageUrl,
  className = "w-full h-full object-cover"
}: PharmaProductImageProps) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    // If a valid custom image is provided (not ui-avatars fallback), use it directly
    if (imageUrl && !imageUrl.includes('ui-avatars.com') && imageUrl.startsWith('data:')) {
      setSrc(imageUrl);
      return;
    } else if (imageUrl && !imageUrl.includes('ui-avatars.com') && imageUrl.startsWith('http')) {
      setSrc(imageUrl);
      return;
    }

    const form = (dosageForm || 'TABLET').toUpperCase();
    const cleanStrength = strength || '';
    const cacheKey = `${name}_${form}_${cleanStrength}`;

    if (imageCache.has(cacheKey)) {
      setSrc(imageCache.get(cacheKey)!);
      return;
    }

    const getBaseImage = (df: string) => {
      const f = (df || '').toUpperCase();
      if (f.includes('CAPSULE')) return '/pharma/capsules.png';
      if (f.includes('CREAM') || f.includes('OINTMENT') || f.includes('GEL') || f.includes('LOTION')) return '/pharma/cream.png';
      if (f.includes('DROP')) return '/pharma/eyedrops.png';
      if (f.includes('INJECTION') || f.includes('INFUSION')) return '/pharma/injection.png';
      if (f.includes('SYRUP') || f.includes('SUSPENSION')) return '/pharma/syrup.png';
      if (f.includes('TABLET')) return '/pharma/tablets.png';
      return '/pharma/default.png';
    };

    const baseSrc = getBaseImage(form);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setSrc(baseSrc);
          return;
        }

        // Draw base image scaled to cover
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Draw a subtle darkening overlay for better contrast
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw premium white laboratory label card
        const labelHeight = 130;
        const labelY = 340; // Default bottom position

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(40, labelY, canvas.width - 80, labelHeight, 20);
        } else {
          ctx.rect(40, labelY, canvas.width - 80, labelHeight);
        }
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Draw decorative subtle tech accent border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Product Name (Clean, Bold, Pharmacy-NEXUS Style)
        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.font = 'bold 30px "Inter", -apple-system, sans-serif';
        let displayName = name.toUpperCase();
        if (displayName.length > 22) displayName = displayName.substring(0, 20) + '...';
        ctx.fillText(displayName, canvas.width / 2, labelY + 54);

        // Dosage / Category (Premium Cyan-Blue Accent)
        ctx.fillStyle = '#0EA5E9';
        ctx.font = 'bold 15px "Inter", -apple-system, sans-serif';
        ctx.fillText(form + (cleanStrength ? ` • ${cleanStrength}` : ''), canvas.width / 2, labelY + 84);

        // Decorative barcode lines to make it look like real packaging
        ctx.fillStyle = '#CBD5E1';
        for (let i = 0; i < 18; i++) {
          const w = (i % 3 === 0) ? 4 : (i % 2 === 0 ? 2 : 1);
          ctx.fillRect(canvas.width / 2 - 50 + i * 6, labelY + 104, w, 8);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        imageCache.set(cacheKey, dataUrl);
        setSrc(dataUrl);
      } catch (err) {
        console.error('Error drawing composite canvas:', err);
        setSrc(baseSrc);
      }
    };

    img.onerror = () => {
      setSrc(baseSrc);
    };

    img.src = baseSrc;
  }, [name, dosageForm, strength, imageUrl]);

  if (!src) {
    return (
      <div className={`bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-[10px] font-bold text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={className}
      loading="lazy"
    />
  );
}
