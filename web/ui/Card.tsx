import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
    return (
        <div
            className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
