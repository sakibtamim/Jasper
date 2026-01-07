/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { React, createContext, useContext } from "@jasper/elements";

// Define types locally
export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  web?: {
    entry?: string;
    navItems?: any[];
    widgets?: any[];
    pages?: any[];
  };
}

interface PluginContextType {
  plugins: PluginRegistryEntry[];
  loading: boolean;
  error: string | null;
}

export const PluginContext = createContext<PluginContextType>({
  plugins: [],
  loading: true,
  error: null,
});

export function usePluginContext() {
  return useContext(PluginContext);
}
