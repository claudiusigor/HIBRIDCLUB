import React, { useEffect, useState } from 'react';
import { AVATAR_FRAME_VALUES } from '../../domain/profile';

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function ProfileAvatar({
  src = '',
  name = 'Atleta',
  frame = 'minimal',
  size = 44,
  decorative = true,
  eager = false,
  className = '',
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const frameStyle = AVATAR_FRAME_VALUES.includes(frame) ? frame : 'minimal';
  const showFallback = !src || imageFailed;

  useEffect(() => setImageFailed(false), [src]);

  return (
    <span
      className={`hc-profile-photo hc-profile-photo--${frameStyle} ${className}`.trim()}
      style={{ '--hc-avatar-size': `${size}px` }}
      aria-hidden={decorative || undefined}
      role={!decorative && showFallback ? 'img' : undefined}
      aria-label={!decorative && showFallback ? `Iniciais de ${name}` : undefined}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={decorative ? '' : `Foto de ${name}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="hc-profile-photo__fallback">{getInitials(name)}</span>
      )}
    </span>
  );
}
