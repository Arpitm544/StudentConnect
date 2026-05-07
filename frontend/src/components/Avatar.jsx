import React, { memo, useState } from 'react';

const SIZE_MAP = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-[12px]',
  lg: 'w-10 h-10 text-[14px]',
  xl: 'w-16 h-16 text-[22px]',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Avatar = memo(function Avatar({ name, photoUrl, size = 'md', className = '', tooltip = false }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);
  const showPhoto = photoUrl && !imgError;

  return (
    <div
      className={`relative group shrink-0 ${className}`}
      title={tooltip && name ? name : undefined}
    >
      <div
        className={`
          ${sizeClass}
          rounded-full overflow-hidden
          ring-1 ring-text-primary/10
          flex items-center justify-center select-none
          ${!showPhoto ? 'bg-accent-soft text-accent font-medium' : ''}
        `}
      >
        {showPhoto ? (
          <img
            src={photoUrl}
            alt={name || 'User'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <span aria-label={name}>{initials}</span>
        )}
      </div>

      {tooltip && name && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-bg-card text-text-primary border border-border-subtle text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-xl">
          {name}
        </div>
      )}
    </div>
  );
});

export default Avatar;
