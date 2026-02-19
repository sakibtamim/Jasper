import { Outlet } from 'react-router-dom';

import { ScrollToTop } from '../components/ScrollToTop';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export const Layout = () => {
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-[#ff6ad5] selection:text-white overflow-x-hidden flex flex-col">
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow pt-20">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};
