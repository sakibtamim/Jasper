import { React, useState, useEffect } from '@jasper/elements';
import { Card, Button, Table, Input, Badge, Loader, AuthGuard } from '@jasper/ui';
import { useAuth } from '@jasper/hooks';

interface CookieProfile {
    id: string;
    name: string;
    createdAt: number;
    lastUsedAt: number;
    playCount: number;
    hasContent: boolean;
}

export const MyMusicSettingsWidget = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<CookieProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContent, setNewContent] = useState('');
    const [error, setError] = useState('');

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/plugins/mymusic/profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.profiles);
            } else if (res.status === 401) {
                setError("Unauthorized: Please log in.");
            }
        } catch (e) {
            console.error("Failed to fetch profiles", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProfiles();
        }
    }, [user]);

    const handleAdd = async () => {
        if (!newContent) {
            setError('Cookie content is required');
            return;
        }
        setError('');
        try {
            const res = await fetch('/api/plugins/mymusic/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, content: newContent })
            });

            if (res.ok) {
                setIsAdding(false);
                setNewName('');
                setNewContent('');
                fetchProfiles();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to add profile');
            }
        } catch (e) {
            setError('Failed to add profile');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this profile?')) return;
        try {
            await fetch(`/api/plugins/mymusic/profiles/${id}`, { method: 'DELETE' });
            fetchProfiles();
        } catch (e) {
            console.error("Failed to delete profile", e);
        }
    };

    return (
        <AuthGuard>
            <Card className="w-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Music Profiles</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal YouTube cookies for personalized playback.</p>
                    </div>
                    <Button onClick={() => setIsAdding(!isAdding)}>
                        {isAdding ? 'Cancel' : 'Add Profile'}
                    </Button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <Loader />
                ) : (
                    <>
                        {isAdding && (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Name (Optional)</label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. My Premium Account"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Netscape Cookie Content</label>
                                    <textarea
                                        className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="# Netscape HTTP Cookie File..."
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="primary" onClick={handleAdd}>Save Profile</Button>
                                </div>
                            </div>
                        )}

                        {profiles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No cookie profiles found. Add one to get started!
                            </div>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <th className="text-left">Name</th>
                                        <th className="text-left">Plays</th>
                                        <th className="text-left">Last Used</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profiles.map(profile => (
                                        <tr key={profile.id}>
                                            <td className="font-medium text-gray-900 dark:text-white">{profile.name}</td>
                                            <td>
                                                <Badge variant="info">{profile.playCount}</Badge>
                                            </td>
                                            <td className="text-gray-500">
                                                {profile.lastUsedAt > 0 ? new Date(profile.lastUsedAt).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="text-right">
                                                <Button size="sm" variant="danger" onClick={() => handleDelete(profile.id)}>
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </>
                )}
            </Card>
        </AuthGuard>
    );
};

export const MyMusicPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Music</h1>
            <MyMusicSettingsWidget />
        </div>
    );
};
