import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  lines?: number;
}

export function Skeleton({ className = '', width, height, rounded = 'md', lines }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? '1rem',
    borderRadius: rounded === 'sm' ? '4px' : rounded === 'lg' ? '12px' : rounded === 'full' ? '9999px' : '8px',
  };

  if (lines && lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-pulse bg-orange-100/70"
            style={{ ...style, width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return <div className={`skeleton-pulse bg-orange-100/70 ${className}`} style={style} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4 border-orange-200 bg-white">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={14} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton height={12} lines={3} />
      <Skeleton height={36} rounded="lg" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 space-y-3 border-orange-200 bg-white">
      <div className="flex justify-between items-start">
        <Skeleton width={40} height={40} rounded="lg" />
        <Skeleton width={50} height={20} rounded="full" />
      </div>
      <Skeleton height={32} width="50%" />
      <Skeleton height={12} width="70%" />
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 items-start">
      <Skeleton width={32} height={32} rounded="full" />
      <div className="flex-1 space-y-2 max-w-md">
        <Skeleton height={14} />
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="60%" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 items-center py-3 border-b border-orange-100">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === 0 ? '30%' : '20%'} />
      ))}
    </div>
  );
}
