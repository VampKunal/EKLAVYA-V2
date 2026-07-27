import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30',
    secondary: 'border-transparent bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
    destructive: 'border-transparent bg-red-500/20 text-red-400 hover:bg-red-500/30',
    success: 'border-transparent bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
    outline: 'text-zinc-300 border-zinc-700',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
