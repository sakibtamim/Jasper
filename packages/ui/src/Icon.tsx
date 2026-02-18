import { React } from "@jasper/elements";
import {
    Music,
    Play,
    Plus,
    Trash,
    Search,
    Menu,
    X,
    ChevronDown,
    ChevronUp,
    Settings,
    LogOut,
    User,
    Volume2,
    SkipForward,
    SkipBack,
    Pause,
    Repeat,
    Shuffle
} from "lucide-react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    size?: number | string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    music: Music,
    play: Play,
    plus: Plus,
    trash: Trash,
    search: Search,
    menu: Menu,
    x: X,
    'chevron-down': ChevronDown,
    'chevron-up': ChevronUp,
    settings: Settings,
    logout: LogOut,
    user: User,
    volume: Volume2,
    next: SkipForward,
    prev: SkipBack,
    pause: Pause,
    repeat: Repeat,
    shuffle: Shuffle
};

export const Icon = ({ name, size = 24, className, ...props }: IconProps) => {
    // Normalize: lowercase
    const normalizedName = name.toLowerCase();

    const LucideIcon = ICON_MAP[normalizedName];

    if (!LucideIcon) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Icon "${name}" not found in ICON_MAP`);
        }
        return null;
    }

    return <LucideIcon size={size} className={className} {...props} />;
};
