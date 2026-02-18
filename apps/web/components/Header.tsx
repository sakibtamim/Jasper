import { useEffect, useState } from "@jasper/elements";
import { Link, useLocation } from "react-router-dom";
import { logout } from "../services/client";
import { NavItem } from "../services/pluginRegistry";
import { usePluginContext } from "../context/PluginContext";
import { useAuth } from "../context/AppContext";

export default function Header() {
  const {
    user,
    theme: { isDark, toggleTheme },
  } = useAuth();
  const { plugins } = usePluginContext();
  const [pluginNavItems, setPluginNavItems] = useState<NavItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Removed local user fetching effect since it's in AppContext

  useEffect(() => {
    const items: NavItem[] = [];
    for (const plugin of plugins) {
      if (plugin.web?.navItems) {
        items.push(...plugin.web.navItems);
      }
    }
    setPluginNavItems(items);
  }, [plugins]);

  // Initialize Lucide icons after mount
  useEffect(() => {
    if (typeof (window as any).lucide !== "undefined") {
      (window as any).lucide.createIcons();
    }
  }, [user, isDark, pluginNavItems]);

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50 h-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo Container */}
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/logo.webp"
                            alt="Jasper Logo"
                            className="h-12 w-12 object-contain rounded-full border-2 border-brand-primary glow-primary"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Jasper <span className="text-brand-primary">Dashboard</span>
                        </span>
                    </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-1">
            <NavLink to="/workers" icon="users">
              Workers
            </NavLink>
            <NavLink to="/queues" icon="list-music">
              Queues
            </NavLink>
            <NavLink to="/stats" icon="bar-chart-2">
              Stats
            </NavLink>
            <NavLink to="/cache" icon="database">
              Cache
            </NavLink>
            <NavLink to="/logs" icon="terminal">
              Logs
            </NavLink>

            {/* Plugin Nav Items */}
            {pluginNavItems.map((item) => (
              <NavLink key={item.id} to={item.href} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}

            {/* Auth Button */}
            <div className="ml-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                        alt={user.username}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <i
                          data-lucide="user"
                          className="w-4 h-4 text-gray-500"
                        ></i>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">
                      {user.username}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Logout"
                  >
                    <i data-lucide="log-out" className="w-4 h-4"></i>
                  </button>
                </div>
              ) : (
                <a
                  href="/api/auth/login"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex items-center gap-2"
                >
                  <i data-lucide="log-in" className="w-4 h-4"></i>
                  Login
                </a>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              className="ml-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2.5 transition-colors"
            >
              {isDark ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607l-.707-.707a1 1 0 010-1.414 1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414zM4.95 15.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zM1.414 6.364l.707.707a1 1 0 010 1.414 1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden ml-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {isMobileMenuOpen ? (
              <i data-lucide="x" className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <i
                data-lucide="menu"
                className="block h-6 w-6"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <MobileNavLink
              to="/workers"
              icon="users"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Workers
            </MobileNavLink>
            <MobileNavLink
              to="/queues"
              icon="list-music"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Queues
            </MobileNavLink>
            <MobileNavLink
              to="/stats"
              icon="bar-chart-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Stats
            </MobileNavLink>
            <MobileNavLink
              to="/cache"
              icon="database"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Cache
            </MobileNavLink>
            <MobileNavLink
              to="/logs"
              icon="terminal"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Logs
            </MobileNavLink>

            {pluginNavItems.map((item) => (
              <MobileNavLink
                key={item.id}
                to={item.href}
                icon={item.icon}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </MobileNavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNavLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
        isActive
          ? "bg-brand-primary/10 text-brand-primary"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-brand-primary"
      }`}
    >
      <i data-lucide={icon} className="w-5 h-5"></i>
      {children}
    </Link>
  );
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
        isActive
          ? "bg-brand-primary/10 text-brand-primary"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-brand-primary"
      }`}
    >
      <i data-lucide={icon} className="w-4 h-4"></i>
      {children}
    </Link>
  );
}
