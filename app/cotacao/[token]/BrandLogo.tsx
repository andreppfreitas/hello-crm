"use client";

import { useState } from "react";
import { brandInitials, brandHue, findBrand } from "@/lib/brand-registry";

/**
 * Logo da escola ou da seguradora.
 *
 * Tenta o logo real; se não houver, desenha um monograma com cor estável
 * derivada do nome. Nunca mostra imagem quebrada — numa cotação, um ícone
 * falhando passa a impressão de documento improvisado.
 */
export function BrandLogo({ name, logoUrl, size = 40 }: {
  name: string;
  logoUrl?: string;
  size?: number;
}) {
  const [falhou, setFalhou] = useState(false);
  // Marca com arquivo nosso não precisa de busca externa
  const local = findBrand(name)?.localLogo;
  const src = logoUrl
    ? `/api/brand-logo?url=${encodeURIComponent(logoUrl)}`
    : local ?? `/api/brand-logo?name=${encodeURIComponent(name)}`;

  if (falhou) {
    const hue = brandHue(name);
    return (
      <span
        className="q-logo q-logo-mono"
        style={{
          width: size, height: size,
          background: `hsl(${hue} 42% 94%)`,
          color: `hsl(${hue} 55% 32%)`,
          borderColor: `hsl(${hue} 35% 84%)`,
          fontSize: size * 0.36,
        }}
        aria-hidden="true"
      >
        {brandInitials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFalhou(true)}
      className="q-logo"
      style={{ width: size, height: size }}
    />
  );
}
