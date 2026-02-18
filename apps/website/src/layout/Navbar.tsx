import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { Cat, Github, Menu, X } from 'lucide-react';

export const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { path: '/plugins', label: 'Plugins' },
        { path: '/developers', label: 'Developers' },
        { path: '/architecture', label: 'Architecture' },
        { path: '/showcase', label: 'Showcase' },
        { path: '/changelog', label: 'Changelog' },
        { path: '/about', label: 'About' },
        { path: '/community', label: 'Community' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? 'bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 py-4' : 'bg-transparent py-6'}`}
        >
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <Link
                    to="/"
                    className="flex items-center gap-2 font-bold text-2xl tracking-tighter"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-pink-500 blur-md opacity-50"></div>
                        <Cat className="relative z-10 text-white" size={32} />
                    </div>
                    <span className="text-white">JASPER</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden xl:flex gap-6 text-sm font-medium text-slate-400">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `transition-colors ${isActive ? 'text-[#ff6ad5]' : 'hover:text-[#00e5ff]'}`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </div>

                <div className="hidden md:flex gap-4">
                    <button
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 transition-colors text-sm text-slate-300"
                        onClick={() =>
                            window.open('https://github.com/sakibtamim/Jasper', '_blank')
                        }
                    >
                        <Github size={16} /> Star
                    </button>
                    <button className="bg-gradient-to-r from-[#ff6ad5] to-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:shadow-[0_0_20px_rgba(255,106,213,0.4)] transition-shadow">
                        Add to Discord
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="xl:hidden text-slate-300"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <div className="xl:hidden absolute top-full left-0 right-0 bg-[#0f172a] border-b border-slate-800 p-6 flex flex-col gap-4 shadow-2xl">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `text-lg font-medium ${isActive ? 'text-[#ff6ad5]' : 'text-slate-400'}`
                            }
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                    <div className="h-px bg-slate-800 my-2"></div>
                    <button
                        className="flex items-center gap-2 text-slate-300"
                        onClick={() =>
                            window.open('https://github.com/sakibtamim/Jasper', '_blank')
                        }
                    >
                        <Github size={16} /> Star on GitHub
                    </button>
                </div>
            )}
        </nav>
    );
};
