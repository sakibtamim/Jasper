import { React } from '@jasper/elements';

import { Button } from './Button';
import { Icon } from './Icon';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <Button variant="ghost" size="sm" className="px-2 py-2" onClick={onClose}>
                        <Icon name="x" className="w-5 h-5" />
                    </Button>
                </div>
                {children}
            </div>
        </div>
    );
};
