import { React, createContext, useContext, useState, useEffect, ReactNode } from '@jasper/elements';

// Define types locally since we can't easily import from apps/web
// In a real scenario, these might be in a shared types package
interface User {
    id: string;
    username: string;
    avatar?: string;
    discriminator: string;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    theme: {
        isDark: boolean;
        toggleTheme: () => void;
    };
    // api client type would be here, simplified for now
    api: any;
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
