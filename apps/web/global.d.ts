interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    lucide?: {
        createIcons: () => void;
    };
    JasperElements?: typeof import('@jasper/elements');
    JasperUI?: typeof import('@jasper/ui');
    JasperHooks?: typeof import('@jasper/hooks');
    LucideReact?: typeof import('lucide-react');
    componentRegistry?: typeof import('./core/ComponentRegistry').componentRegistry;
}
