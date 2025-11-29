import { React, ReactDOMClient } from '@jasper/elements';
import App from './App';
import './index.css';

import { componentRegistry } from './core/ComponentRegistry';

// Expose React for plugins
// (window as any).React = React;
// (window as any).ReactDOM = ReactDOM;
(window as any).componentRegistry = componentRegistry;

ReactDOMClient.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
