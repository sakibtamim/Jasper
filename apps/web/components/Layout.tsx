import { Outlet } from "@jasper/elements";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 mt-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; 2025 Jasper Music Bot. All rights reserved. |{" "}
            <a
              href="/devtools"
              className="hover:text-brand-primary transition-colors"
            >
              DevTools
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
