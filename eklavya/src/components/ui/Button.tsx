import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-mono font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer';
    
    const variants = {
      primary: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:-translate-y-0.5 shadow-md shadow-orange-500/25 border border-orange-400/30',
      orange: 'bg-orange-500 text-white hover:bg-orange-600 hover:-translate-y-0.5 shadow-md shadow-orange-500/30',
      outline: 'border-2 border-orange-200 bg-white hover:bg-orange-50 text-orange-600 hover:border-orange-400 hover:text-orange-700 shadow-sm',
      ghost: 'bg-transparent hover:bg-orange-50 text-stone-700 hover:text-orange-600',
      danger: 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 shadow-sm',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
