
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

    // Simple helper to capitalize
    const pascalName = (name.charAt(0).toUpperCase() + name.slice(1)) as keyof typeof LucideIcons;

    const LucideIcon = LucideIcons[pascalName] as React.ElementType;

    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }

    return <LucideIcon size={size} className={className} {...props} />;
};
