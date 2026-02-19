import { useEffect, useState } from '@jasper/elements';

export function useTheme() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return (
            saved === 'dark' ||
            (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
        );
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    return { isDark, toggleTheme };
}
