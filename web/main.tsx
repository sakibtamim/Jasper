import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { componentRegistry } from './core/ComponentRegistry';

// Expose React for plugins
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;
(window as any).componentRegistry = componentRegistry;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
