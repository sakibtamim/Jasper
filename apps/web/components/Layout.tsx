import { Outlet } from '@jasper/elements';
import Header from './Header';
import { Github, MessageCircle, Globe, Wrench, Music } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 mt-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-12 mt-auto">
        <div className="container mx-auto px-4 space-y-8">
          {/* Branding Section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Music className="text-brand-primary" size={24} />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Jasper
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The Purrfect Discord Music Bot 🐈‍⬛
            </p>
          </div>

          {/* Links Section */}
          <div className="flex justify-center gap-6 flex-wrap">
            <a href="https://sakibtamim.github.io/Jasper/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors group" target="_blank" rel="noopener noreferrer">
              <Globe size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm">Website</span>
            </a>
            <a href="https://github.com/sakibtamim/Jasper" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors group" target="_blank" rel="noopener noreferrer">
              <Github size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm">GitHub</span>
            </a>
            <a href="https://discord.gg/3B8fPPETKY" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors group" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm">Discord</span>
            </a>
            <a href="/devtools" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors group">
              <Wrench size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm">DevTools</span>
            </a>
          </div>

          {/* Info Section */}
          <div className="text-center space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Built by</span> Nazmus Sakib Tamim & Purrfect Software Limited
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              &copy; 2025 Jasper Music Bot. All rights reserved. | CSP-IP Certified
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
