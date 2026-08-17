"use client";
import { useState } from "react";
import { Menu, UserCircle, Sparkles, LogOut, User } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-200/80 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm shadow-orange-500/5">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: '8s' }} />
            AI TUTOR ACTIVE
          </span>
        </div>
      </div>

      <div className="relative">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-orange-200 hover:border-orange-400 bg-orange-50/50 hover:bg-orange-100/60 transition-all cursor-pointer shadow-sm"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-mono font-bold overflow-hidden shadow-sm">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
          </div>
          <span className="hidden sm:block text-sm font-mono font-bold text-stone-900">
            {session?.user?.name || 'User'}
          </span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-orange-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
              <p className="text-sm text-stone-900 font-mono font-bold">{session?.user?.name}</p>
              <p className="text-xs text-orange-700 font-mono truncate">{session?.user?.email}</p>
            </div>
            <div className="p-1">
              <Link 
                href="/profile" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-mono font-bold text-stone-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
              >
                <User className="w-4 h-4 text-orange-500" />
                My Profile
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/sign-in' })}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm font-mono font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
