"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Menu, LayoutDashboard, BookOpen, MessageSquare, Brain, UploadCloud, BarChart, Flame } from "lucide-react";
import { signOut } from "next-auth/react";

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/chat", label: "Tutor Chat", icon: MessageSquare },
    { href: "/quiz", label: "Quizzes", icon: Brain },
    { href: "/analytics", label: "Analytics", icon: BarChart },
    { href: "/upload", label: "Upload Notes", icon: UploadCloud },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-orange-200/80 z-50 transition-transform duration-300 ease-in-out shadow-lg shadow-orange-500/5 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-orange-100">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30">
                <Flame className="w-5 h-5 fill-orange-200 text-orange-100 animate-pulse" />
              </div>
              <span className="text-xl font-mono font-black tracking-tight text-stone-900">
                EKLAVYA<span className="text-orange-500">.AI</span>
              </span>
            </Link>
            <button className="md:hidden p-1 rounded-lg text-stone-500 hover:bg-orange-50" onClick={() => setIsOpen(false)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all font-mono font-bold text-sm ${
                    isActive 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 border border-orange-400/30' 
                      : 'text-stone-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-orange-100 bg-orange-50/40">
            <button 
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-mono font-bold text-sm text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
