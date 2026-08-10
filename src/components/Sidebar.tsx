"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Book, Settings, LogOut, Menu, LayoutDashboard, BookOpen, MessageSquare, Brain, UploadCloud, BarChart } from "lucide-react";
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
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Eklavya AI</span>
            <button className="md:hidden" onClick={() => setIsOpen(false)}>
              <Menu className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
