import { React, ReactDOMClient } from '@jasper/elements';
import * as Elements from '@jasper/elements';
import * as JasperHooks from '@jasper/hooks';
import * as JasperUI from '@jasper/ui';
import * as LucideReact from 'lucide-react';

import App from './App';
import { componentRegistry } from './core/ComponentRegistry';
import './index.css';

// Expose React and Elements for plugins (IIFE/UMD support)
(window as any).JasperElements = Elements;
(window as any).JasperUI = JasperUI;
(window as any).JasperHooks = JasperHooks;
(window as any).LucideReact = LucideReact;
(window as any).componentRegistry = componentRegistry;

ReactDOMClient.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
