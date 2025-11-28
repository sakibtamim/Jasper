const { React, componentRegistry } = window;

const SampleWidget = () => {
    return React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6' },
        React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
            React.createElement('div', { className: 'p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
                React.createElement('i', { 'data-lucide': 'flask-conical', className: 'w-6 h-6' })
            ),
            React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-white' }, 'Sample Plugin Widget')
        ),
        React.createElement('p', { className: 'text-gray-600 dark:text-gray-300' },
            'This widget is dynamically loaded from the Sample Plugin!'
        )
    );
};

const SamplePage = () => {
    return React.createElement('div', { className: 'max-w-4xl mx-auto' },
        React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8' },
            React.createElement('div', { className: 'flex items-center gap-4 mb-6' },
                React.createElement('div', { className: 'p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
                    React.createElement('i', { 'data-lucide': 'flask-conical', className: 'w-8 h-8' })
                ),
                React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 dark:text-white' }, 'Sample Plugin Page')
            ),
            React.createElement('p', { className: 'text-lg text-gray-600 dark:text-gray-300 mb-6' },
                'Congratulations! You have successfully navigated to a page provided by a dynamically loaded plugin.'
            ),
            React.createElement('div', { className: 'p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700' },
                React.createElement('h4', { className: 'font-semibold text-gray-900 dark:text-white mb-2' }, 'Technical Details'),
                React.createElement('ul', { className: 'list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1' },
                    React.createElement('li', null, 'Loaded via /api/plugins/registry'),
                    React.createElement('li', null, 'Component registered in ComponentRegistry'),
                    React.createElement('li', null, 'Route dynamically added to React Router')
                )
            )
        )
    );
};

// Register components
if (componentRegistry) {
    componentRegistry.register('sample-plugin', 'SampleWidget', SampleWidget);
    componentRegistry.register('sample-plugin', 'SamplePage', SamplePage);
    console.log('[SamplePlugin] Registered components');
} else {
    console.error('[SamplePlugin] ComponentRegistry not found on window');
}
