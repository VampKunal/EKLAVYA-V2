import React, { ImgHTMLAttributes } from 'react';

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function Avatar({ className = '', fallback, src, alt, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);

  return (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-orange-200 shadow-sm ${className}`}>
      {src && !error ? (
        <img
          src={src}
          alt={alt || "Avatar"}
          className="aspect-square h-full w-full object-cover"
          onError={() => setError(true)}
          {...props}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono font-bold text-white uppercase text-sm">
          {fallback || alt?.charAt(0) || "?"}
        </div>
      )}
    </div>
  );
}
