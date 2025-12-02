import { React, ReactNode } from '@jasper/elements';
import { useAuth } from '@jasper/hooks';
import { Loader } from './Loader';
import { Lock } from 'lucide-react';

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        if (fallback) return <>{fallback}</>;

        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Authentication Required</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                    Please log in to access this content.
                </p>
                <a
                    href="/api/auth/login"
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors"
                >
                    Log In with Discord
                </a>
            </div>
        );
    }

    return <>{children}</>;
};
