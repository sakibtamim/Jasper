import { React } from '@jasper/elements';
import {
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Copy,
    GripVertical,
    HardDrive,
    Inbox,
    Link,
    List,
    LogOut,
    Menu,
    Music,
    Pause,
    Play,
    Plus,
    Repeat,
    Search,
    Settings,
    Shuffle,
    SkipBack,
    SkipForward,
    Trash,
    UploadCloud,
    User,
    Volume2,
    X,
    Youtube,
} from 'lucide-react';

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
    'arrow-left': ArrowLeft,
    'chevron-down': ChevronDown,
    'chevron-up': ChevronUp,
    copy: Copy,
    inbox: Inbox,
    settings: Settings,
    logout: LogOut,
    user: User,
    volume: Volume2,
    next: SkipForward,
    prev: SkipBack,
    pause: Pause,
    repeat: Repeat,
    shuffle: Shuffle,
    'upload-cloud': UploadCloud,
    list: List,
    youtube: Youtube,
    'hard-drive': HardDrive,
    link: Link,
    'grip-vertical': GripVertical,
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
