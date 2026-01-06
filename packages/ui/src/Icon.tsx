
import React from 'react';
import * as LucideIcons from 'lucide-react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: keyof typeof LucideIcons;
    size?: number | string;
}

export const Icon = ({ name, size = 24, className, ...props }: IconProps) => {
    // Lucide imports are typically PascalCase, but users might pass lowercase "music"
    // We should try to handle case insensitivity or expect PascalCase.
    // The previous code used "music", "play", "plus".
    // Lucide exports "Music", "Play", "Plus".

    // Simple helper to capitalize and handle kebab-case (e.g. arrow-up -> ArrowUp)
    const pascalName = name.replace(/(^\w|-\w)/g, (c) => c.replace(/-/, "").toUpperCase()) as keyof typeof LucideIcons;

    const LucideIcon = LucideIcons[pascalName] as React.ElementType;

    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }

    return <LucideIcon size={size} className={className} {...props} />;
};
