import { React, ReactNode, useEffect, useState } from '@jasper/elements';
import { AuthContext, useAuth } from '@jasper/hooks';

import { useTheme } from '../hooks/useTheme';
import { apiClient, fetchAuthStatus } from '../services/client';

interface User {
    id: string;
    username: string;
    avatar?: string;
    discriminator: string;
}

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        // Don't fetch auth status if we're on the login page
        if (window.location.pathname.startsWith('/login')) {
            setLoading(false);
            return;
        }

        fetchAuthStatus()
            .then((data) => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch((err) => {
                // Ignore 401/403 errors as they just mean not logged in
                console.debug('Auth check failed:', err);
            })
            .finally(() => setLoading(false));
    }, []);

    const value = {
        user,
        setUser,
        loading,
        theme: { isDark, toggleTheme },
        api: apiClient,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth };

export function useAppContext() {
    // Legacy support or if we want to expose the raw context
    // But useAuth is preferred
    return useAuth();
}
