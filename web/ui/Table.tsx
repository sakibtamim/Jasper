import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children: React.ReactNode;
}

export function Table({ children, className = '', ...props }: TableProps) {
    return (
        <div className="overflow-x-auto">
            <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`} {...props}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`} {...props}>{children}</thead>;
}

export function TableBody({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={`bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 ${className}`} {...props}>{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return <tr className={`${className}`} {...props}>{children}</tr>;
}

export function TableHeader({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
    return (
        <th
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
    return (
        <td
            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${className}`}
            {...props}
        >
            {children}
        </td>
    );
}
