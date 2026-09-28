'use client';

import { useId, useState } from 'react';
import type { Product, ProductColor } from '@/types';

export type DeviceKind =
  | 'phone' | 'tablet' | 'laptop' | 'watch' | 'earbuds'
  | 'headphones' | 'charger' | 'pencil' | 'keyboard' | 'generic';

/** Guess which illustration fits a product (the mock data has no category). */
export function deviceKindFor(product: Pick<Product, 'name' | 'category'>): DeviceKind {
  const name = product.name.toLowerCase();
  if (name.includes('iphone')) return 'phone';
  if (name.includes('ipad')) return 'tablet';
  if (name.includes('macbook') || name.includes('imac')) return 'laptop';
  if (name.includes('watch')) return 'watch';
  if (name.includes('airpods max')) return 'headphones';
  if (name.includes('airpods') || name.includes('beats')) return 'earbuds';
  if (name.includes('pencil')) return 'pencil';
  if (name.includes('magsafe') || name.includes('charger')) return 'charger';
  if (name.includes('keyboard')) return 'keyboard';
  if (product.category === 'phone') return 'phone';
  if (product.category === 'tablet') return 'tablet';
  return 'generic';
}

interface ProductVisualProps {
  product: Pick<Product, 'name' | 'category' | 'product_colors'>;
  color?: ProductColor;
  className?: string;
}

/** Product photo when one exists, otherwise a device illustration in the product's color. */
export default function ProductVisual({ product, color, className = '' }: ProductVisualProps) {
  const c = color ?? product.product_colors?.[0];
  return (
    <ProductImage src={c?.image_url} alt={product.name} kind={deviceKindFor(product)} tint={c?.hex}
      className={className} />
  );
}

interface ProductImageProps {
  src?: string | null;
  alt: string;
  kind: DeviceKind;
  tint?: string;
  className?: string;
}

/**
 * The photo at `src`, or the device illustration when there's no photo or it
 * fails to load — so an image_url whose file isn't in public/ yet still looks fine.
 */
export function ProductImage({ src, alt, kind, tint, className = '' }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    return <img src={src} alt={alt} className={`object-contain ${className}`} onError={() => setFailedSrc(src)} />;
  }
  return <DeviceArt kind={kind} tint={tint} className={className} />;
}

// ── Illustrations ──────────────────────────────────────────────

const OUTLINE = 'rgba(0,0,0,0.12)';

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [210, 210, 215];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function isLight(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.75;
}

const KEY_ROWS = [
  Array(14).fill(1),
  [1.5, ...Array(12).fill(1), 1.5],
  [1.8, ...Array(11).fill(1), 2.2],
  [2.4, ...Array(10).fill(1), 2.6],
  [1, 1, 1, 1.3, 6, 1.3, 1, 1, 1],
];

interface DeviceArtProps {
  kind: DeviceKind;
  tint?: string;
  className?: string;
}

export function DeviceArt({ kind, tint = '#d2d2d7', className = '' }: DeviceArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const frameId = `${uid}-frame`;
  const screenId = `${uid}-screen`;
  const frame = `url(#${frameId})`;
  const screen = `url(#${screenId})`;
  const dark = mix(tint, '#000000', 0.25);

  const defs = (
    <defs>
      <linearGradient id={frameId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={mix(tint, '#ffffff', 0.35)} />
        <stop offset="0.5" stopColor={tint} />
        <stop offset="1" stopColor={mix(tint, '#000000', 0.18)} />
      </linearGradient>
      <linearGradient id={screenId} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor={mix(tint, '#5e5ce6', 0.55)} />
        <stop offset="0.55" stopColor={mix(tint, '#1c1c3a', 0.78)} />
        <stop offset="1" stopColor={mix(tint, '#ff6b3d', 0.5)} />
      </linearGradient>
    </defs>
  );

  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
    className: `drop-shadow-[0_10px_16px_rgba(0,0,0,0.14)] ${className}`,
  };

  switch (kind) {
    case 'phone':
      return (
        <svg viewBox="-3 0 126 240" {...svgProps}>
          {defs}
          <rect x="-1.5" y="58" width="3" height="14" rx="1.5" fill={dark} />
          <rect x="-1.5" y="82" width="3" height="26" rx="1.5" fill={dark} />
          <rect x="-1.5" y="114" width="3" height="26" rx="1.5" fill={dark} />
          <rect x="118.5" y="92" width="3" height="38" rx="1.5" fill={dark} />
          <rect x="1" y="1" width="118" height="238" rx="25" fill={frame} stroke={OUTLINE} />
          <rect x="5" y="5" width="110" height="230" rx="21" fill="#050505" />
          <rect x="8" y="8" width="104" height="224" rx="18" fill={screen} />
          <rect x="44" y="15" width="32" height="10" rx="5" fill="#000" />
          <text x="60" y="66" textAnchor="middle" fontSize="28" fontWeight="600" fill="#fff" fillOpacity="0.92">9:41</text>
          <rect x="42" y="222" width="36" height="3" rx="1.5" fill="#fff" fillOpacity="0.7" />
        </svg>
      );

    case 'tablet':
      return (
        <svg viewBox="0 0 180 240" {...svgProps}>
          {defs}
          <rect x="1" y="1" width="178" height="238" rx="16" fill={frame} stroke={OUTLINE} />
          <rect x="5" y="5" width="170" height="230" rx="12" fill="#050505" />
          <rect x="9" y="9" width="162" height="222" rx="8.5" fill={screen} />
          <circle cx="90" cy="7" r="1.2" fill="#1a1a1a" />
          <text x="90" y="72" textAnchor="middle" fontSize="32" fontWeight="600" fill="#fff" fillOpacity="0.92">9:41</text>
          <rect x="70" y="224" width="40" height="3" rx="1.5" fill="#fff" fillOpacity="0.7" />
        </svg>
      );

    case 'laptop':
      return (
        <svg viewBox="0 0 260 158" {...svgProps}>
          {defs}
          <rect x="28" y="2" width="204" height="138" rx="10" fill={frame} stroke={OUTLINE} />
          <rect x="32" y="6" width="196" height="130" rx="7" fill="#050505" />
          <rect x="36" y="12" width="188" height="120" rx="3" fill={screen} />
          <rect x="118" y="6" width="24" height="6" rx="3" fill="#050505" />
          <path d="M2 140 H258 V144 Q258 150 250 152 L244 154 H16 L10 152 Q2 150 2 144 Z" fill={frame} stroke={OUTLINE} />
          <path d="M108 140 H152 Q152 145 147 145 H113 Q108 145 108 140 Z" fill={dark} fillOpacity="0.4" />
        </svg>
      );

    case 'watch': {
      const band = mix(tint, '#000000', 0.28);
      const rings = [
        { r: 18, color: '#fa114f', p: 0.78 },
        { r: 13, color: '#92e82a', p: 0.62 },
        { r: 8, color: '#1eeaef', p: 0.9 },
      ];
      return (
        <svg viewBox="0 0 140 230" {...svgProps}>
          {defs}
          <rect x="38" y="0" width="64" height="72" rx="10" fill={band} />
          <rect x="38" y="158" width="64" height="72" rx="10" fill={band} />
          <rect x="122" y="86" width="9" height="26" rx="3" fill={dark} />
          <rect x="123" y="120" width="6" height="22" rx="2" fill={dark} />
          <rect x="14" y="44" width="112" height="142" rx="32" fill={frame} stroke={OUTLINE} />
          <rect x="21" y="51" width="98" height="128" rx="26" fill="#000" />
          <text x="70" y="100" textAnchor="middle" fontSize="30" fontWeight="600" fill="#fff">10:09</text>
          {rings.map(({ r, color, p }) => {
            const c = 2 * Math.PI * r;
            return (
              <g key={r} transform="rotate(-90 70 140)">
                <circle cx="70" cy="140" r={r} fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="4" />
                <circle cx="70" cy="140" r={r} fill="none" stroke={color} strokeWidth="4"
                  strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
              </g>
            );
          })}
        </svg>
      );
    }

    case 'earbuds':
      return (
        <svg viewBox="0 0 200 160" {...svgProps}>
          {defs}
          <rect x="16" y="12" width="168" height="136" rx="52" fill={frame} stroke={OUTLINE} strokeWidth="1.2" />
          <path d="M17 58 H183" stroke="rgba(0,0,0,0.14)" strokeWidth="1.2" />
          <rect x="34" y="20" width="132" height="20" rx="10" fill="#fff" fillOpacity="0.3" />
          <circle cx="100" cy="96" r="3" fill="#30d158" />
        </svg>
      );

    case 'headphones':
      return (
        <svg viewBox="0 0 220 220" {...svgProps}>
          {defs}
          <path d="M40 118 V96 A70 70 0 0 1 180 96 V118" fill="none" stroke="#c7c7cc" strokeWidth="10" />
          <path d="M52 100 A58 58 0 0 1 168 100" fill="none" stroke={mix(tint, '#ffffff', 0.4)} strokeWidth="14" strokeLinecap="round" />
          <rect x="35" y="104" width="10" height="34" rx="5" fill="#b8b8bd" />
          <rect x="175" y="104" width="10" height="34" rx="5" fill="#b8b8bd" />
          <rect x="12" y="132" width="56" height="82" rx="22" fill={frame} stroke={OUTLINE} />
          <rect x="152" y="132" width="56" height="82" rx="22" fill={frame} stroke={OUTLINE} />
          <rect x="60" y="140" width="12" height="66" rx="6" fill={mix(tint, '#ffffff', 0.2)} stroke={OUTLINE} />
          <rect x="148" y="140" width="12" height="66" rx="6" fill={mix(tint, '#ffffff', 0.2)} stroke={OUTLINE} />
        </svg>
      );

    case 'charger':
      return (
        <svg viewBox="0 0 200 200" {...svgProps}>
          {defs}
          <path d="M100 150 C100 178 128 186 178 192" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="8" strokeLinecap="round" />
          <path d="M100 150 C100 178 128 186 178 192" fill="none" stroke="#f2f2f4" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="88" r="68" fill={frame} stroke={OUTLINE} />
          <circle cx="100" cy="88" r="48" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
          <circle cx="100" cy="88" r="30" fill="#fff" fillOpacity="0.25" />
        </svg>
      );

    case 'pencil':
      return (
        <svg viewBox="0 0 240 160" {...svgProps}>
          {defs}
          <g transform="rotate(-30 120 80)">
            <rect x="14" y="72" width="184" height="16" rx="3" fill={frame} stroke={OUTLINE} />
            <rect x="20" y="74" width="170" height="3" rx="1.5" fill="#fff" fillOpacity="0.5" />
            <path d="M198 72 L226 78.5 Q229 80 226 81.5 L198 88 Z" fill={mix(tint, '#000000', 0.06)} stroke={OUTLINE} />
            <path d="M221 79 L229 80 L221 81 Z" fill="#3a3a3c" />
          </g>
        </svg>
      );

    case 'keyboard': {
      const light = isLight(tint);
      const keyFill = light ? '#ffffff' : mix(tint, '#ffffff', 0.14);
      const gap = 3.5;
      return (
        <svg viewBox="0 0 260 110" {...svgProps}>
          <rect x="2" y="6" width="256" height="98" rx="10"
            fill={light ? mix(tint, '#000000', 0.1) : mix(tint, '#ffffff', 0.06)} stroke={OUTLINE} />
          {KEY_ROWS.map((row, r) => {
            const units = row.reduce((a, b) => a + b, 0);
            const unit = (240 - (row.length - 1) * gap) / units;
            let x = 10;
            return row.map((w, i) => {
              const width = w * unit;
              const key = (
                <rect key={`${r}-${i}`} x={x} y={15 + r * 16.5} width={width} height="13" rx="2.5"
                  fill={keyFill} stroke="rgba(0,0,0,0.1)" strokeWidth="0.6" />
              );
              x += width + gap;
              return key;
            });
          })}
        </svg>
      );
    }

    default:
      return (
        <svg viewBox="0 0 200 200" {...svgProps}>
          {defs}
          <rect x="30" y="30" width="140" height="140" rx="32" fill={frame} stroke={OUTLINE} />
          <rect x="70" y="70" width="60" height="60" rx="14" fill="#fff" fillOpacity="0.35" />
        </svg>
      );
  }
}
