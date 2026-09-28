'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { storeAsset } from '@/lib/utils';

interface ProductThumbProps {
  imageUrl?: string | null;
  hex?: string | null;
  className?: string;
}

/** Product image, or the color swatch when there's no image (or it fails to load). */
export default function ProductThumb({ imageUrl, hex, className = 'h-11 w-11' }: ProductThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = storeAsset(imageUrl);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-fill ${className}`}>
      {src && src !== failedSrc ? (
        <img src={src} alt="" className="h-full w-full object-contain" onError={() => setFailedSrc(src)} />
      ) : hex ? (
        <span className="h-1/2 w-1/2 rounded-full ring-1 ring-hairline" style={{ background: hex }} />
      ) : (
        <Package className="h-1/2 w-1/2 text-ink-3" strokeWidth={1.5} />
      )}
    </span>
  );
}
