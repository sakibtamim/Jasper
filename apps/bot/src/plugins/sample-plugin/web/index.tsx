import React from 'react';

// We don't need to import componentRegistry, we just export components.
// The loader will handle registration.

export const SampleWidget = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <i data-lucide="flask-conical" className="w-6 h-6"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sample Plugin Widget</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
                This widget is dynamically loaded from the Sample Plugin! (Compiled from TSX)
            </p>
        </div>
    );
};

export const SamplePage = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <i data-lucide="flask-conical" className="w-8 h-8"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sample Plugin Page</h1>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    Congratulations! You have successfully navigated to a page provided by a dynamically loaded plugin.
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Technical Details</h4>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                        <li>Loaded via /api/plugins/registry</li>
                        <li>Component registered in ComponentRegistry</li>
                        <li>Route dynamically added to React Router</li>
                        <li>Compiled from TSX via Vite</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
