import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full max-w-lg scale-100 gap-4 border border-orange-200 bg-white p-6 opacity-100 shadow-2xl shadow-orange-500/10 sm:rounded-2xl mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 text-stone-500 hover:text-orange-600 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span className="sr-only">Close</span>
        </button>
        
        {(title || description) && (
          <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
            {title && <h2 className="text-xl font-mono font-bold leading-none tracking-tight text-stone-900">{title}</h2>}
            {description && <p className="text-sm text-stone-600">{description}</p>}
          </div>
        )}
        
        {children}
      </div>
    </div>,
    document.body
  );
}
