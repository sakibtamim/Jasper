import { React, createContext, useContext, useState, useEffect, ReactNode } from '@jasper/elements';

// Define types locally since we can't easily import from apps/web
// In a real scenario, these might be in a shared types package
export interface User {
    id: string;
    username: string;
    avatar?: string;
    discriminator: string;
}

// Type for the API client - matches the shape of apiClient from apps/web/services/client.ts
interface ApiClient {
    fetchWorkers: () => Promise<any>;
    fetchQueues: (page?: number, limit?: number) => Promise<any>;
    fetchStats: (limit?: number) => Promise<any>;
    fetchCacheStats: () => Promise<any>;
    fetchLogs: () => Promise<any>;
    fetchAuthStatus: () => Promise<any>;
    logout: () => Promise<void>;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    theme: {
        isDark: boolean;
        toggleTheme: () => void;
    };
    api: ApiClient;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return {
        user: context.user,
        setUser: context.setUser,
        loading: context.loading,
        isAuthenticated: !!context.user,
        theme: context.theme
    };
}
