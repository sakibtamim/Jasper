import type { ErrorInfo } from 'react';

import { Component, React, ReactNode } from '@jasper/elements';

interface Props {
    children: ReactNode;
    pluginId?: string;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class PluginErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `Plugin Error (${this.props.pluginId}:${this.props.componentName}):`,
            error,
            errorInfo,
        );
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                    <div className="font-semibold mb-1">Widget Crashed</div>
                    <div className="text-xs opacity-75">{this.state.error?.message}</div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-2 text-xs underline hover:no-underline"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
