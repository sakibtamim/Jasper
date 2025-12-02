import { React } from '@jasper/elements';
import ExtensionSlot from '../components/ExtensionSlot';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <ExtensionSlot slot="settings:main" />
            </div>
        </div>
    );
}
