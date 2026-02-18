import { React, ReactDOMClient } from "@jasper/elements";
import App from "./App";
import "./index.css";

import { componentRegistry } from "./core/ComponentRegistry";

import * as JasperUI from "@jasper/ui";
import * as JasperHooks from "@jasper/hooks";
import * as LucideReact from "lucide-react";
import * as Elements from "@jasper/elements";

// Expose React and Elements for plugins (IIFE/UMD support)
(window as any).JasperElements = Elements;
(window as any).JasperUI = JasperUI;
(window as any).JasperHooks = JasperHooks;
(window as any).LucideReact = LucideReact;
(window as any).componentRegistry = componentRegistry;

ReactDOMClient.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
