import { React, ReactDOMClient } from '@jasper/elements';
import * as Elements from '@jasper/elements';
import * as JasperHooks from '@jasper/hooks';
import * as JasperUI from '@jasper/ui';
import * as LucideReact from 'lucide-react';

import App from './App';
import { componentRegistry } from './core/ComponentRegistry';
import './index.css';

// Expose React and Elements for plugins (IIFE/UMD support)
window.JasperElements = Elements;
window.JasperUI = JasperUI;
window.JasperHooks = JasperHooks;
window.LucideReact = LucideReact;
window.componentRegistry = componentRegistry;

ReactDOMClient.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
