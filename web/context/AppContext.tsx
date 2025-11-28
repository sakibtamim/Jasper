import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAuthStatus, apiClient } from '../api/client';
import { useTheme } from '../hooks/useTheme';

interface User {
    id: string;
    username: string;
    avatar?: string;
    discriminator: string;
}

interface AppContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    theme: {
        isDark: boolean;
        toggleTheme: () => void;
    };
    api: typeof apiClient;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        fetchAuthStatus()
            .then(data => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch(err => console.error("Failed to fetch auth status", err))
            .finally(() => setLoading(false));
    }, []);

    const value = {
        user,
        setUser,
        loading,
        theme: { isDark, toggleTheme },
        api: apiClient
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AppProvider');
    }
    return {
        user: context.user,
        setUser: context.setUser,
        loading: context.loading,
        isAuthenticated: !!context.user,
        theme: context.theme
    };
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
