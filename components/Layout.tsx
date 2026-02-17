import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Moon, Sun } from 'lucide-react';

const Layout: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-black dark:bg-white p-2 rounded-lg group-hover:bg-neutral-800 dark:group-hover:bg-neutral-200 transition-colors shadow-sm">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white tracking-tight">FranchiseScreen<span className="text-neutral-400 dark:text-neutral-500">Pro</span></span>
          </Link>
          
          <nav className="flex items-center gap-4">
             <button
               onClick={() => setIsDark(!isDark)}
               className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
               title="Toggle Theme"
             >
               {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-6 mt-auto transition-colors duration-200">
         <div className="max-w-5xl mx-auto px-4 text-center text-neutral-400 dark:text-neutral-600 text-sm font-medium">
           © {new Date().getFullYear()} FranchiseScreen Pro. Secure Local Storage.
         </div>
      </footer>
    </div>
  );
};

export default Layout;
