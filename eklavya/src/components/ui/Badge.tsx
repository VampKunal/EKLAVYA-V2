import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'orange';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200',
    orange: 'border-orange-300 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20',
    secondary: 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200',
    destructive: 'border-red-200 bg-red-100 text-red-700 hover:bg-red-200',
    success: 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    outline: 'text-orange-600 border-orange-300 bg-white hover:bg-orange-50',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
