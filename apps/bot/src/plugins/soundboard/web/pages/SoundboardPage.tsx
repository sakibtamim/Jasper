import { React, useState, useEffect } from '@jasper/elements';
import { Card, Button, Input, Loader, Badge } from '@jasper/ui';
import { usePluginStorage } from '@jasper/hooks';
import { Trash2, Upload, Music, Play, AlertTriangle, Edit2 } from 'lucide-react';

interface Sound {
    id: string;
    name: string;
    emoji: string;
    fileUri: string;
    createdAt: number;
}

interface Stats {
    totalPlays: number;
    topSounds: {
        soundId: string;
        name: string;
        emoji: string;
        count: number;
    }[];
}

export const SoundboardPage = () => {
    const [sounds, setSounds] = useState<Sound[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('🔊');
    const [file, setFile] = useState<File | null>(null);
    const [previewAudio, setPreviewAudio] = useState<string | null>(null);

    // Edit State
    const [editingSound, setEditingSound] = useState<Sound | null>(null);

    const { upload } = usePluginStorage('soundboard');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [soundsRes, statsRes] = await Promise.all([
                fetch('/api/plugins/soundboard/sounds'),
                fetch('/api/plugins/soundboard/stats')
            ]);

            const soundsData = await soundsRes.json();
            const statsData = await statsRes.json();

            setSounds(soundsData.sounds || []);
            setStats(statsData);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !emoji) return;

        setUploading(true);
        try {
            if (editingSound) {
                // UPDATE Mode
                const res = await fetch(`/api/plugins/soundboard/sounds/${editingSound.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, emoji })
                });

                if (!res.ok) throw new Error("Failed to update sound");

                // Reset to Add mode
                setEditingSound(null);
                setName('');
                setEmoji('🔊');
                setFile(null);
            } else {
                // CREATE Mode
                if (!file) return; // File is required for new sounds

                // 1. Upload File
                const uploadResult = await upload(file);

                // 2. Create Sound
                const res = await fetch('/api/plugins/soundboard/sounds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        emoji,
                        fileUri: uploadResult.uri
                    })
                });

                if (!res.ok) throw new Error("Failed to create sound");

                // Reset form
                setName('');
                setEmoji('🔊');
                setFile(null);
            }

            // Refresh
            fetchData();
        } catch (err) {
            console.error("Operation failed", err);
            alert(editingSound ? "Failed to update sound" : "Failed to add sound");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this sound?")) return;

        try {
            await fetch(`/api/plugins/soundboard/sounds/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleClearData = async () => {
        if (!confirm("Are you sure you want to clear ALL soundboard data? This cannot be undone!")) return;

        try {
            await fetch('/api/plugins/soundboard/data', { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error("Clear data failed", err);
        }
    };

    const handleEdit = (sound: Sound) => {
        console.log("Editing sound:", sound);
        setEditingSound(sound);
        setName(sound.name);
        setEmoji(sound.emoji);
        setFile(null); // File update not supported yet
    };

    const handleCancelEdit = () => {
        setEditingSound(null);
        setName('');
        setEmoji('🔊');
        setFile(null);
    };

    const handlePreview = (soundId: string) => {
        const sound = sounds.find(s => s.id === soundId);
        if (sound) {
            // Construct the URL for the sound file
            setPreviewAudio(`/api/plugins/soundboard/storage/${sound.fileUri.split('/').pop()}`);
        }
    };

    if (loading && sounds.length === 0) {
        return (
            <div className="p-8 flex justify-center">
                <Loader className="w-8 h-8 text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Jasper Soundboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage custom sound effects for your server.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: List */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                            <h2 className="font-semibold text-lg">Sounds ({sounds.length})</h2>
                            <button
                                onClick={handleClearData}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                title="Clear all data"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Clear Data
                            </button>
                        </div>

                        {sounds.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No sounds yet. Add one to get started!
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sounds.map(sound => (
                                    <div key={sound.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                                                {sound.emoji}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">{sound.name}</h3>
                                                <p className="text-xs text-gray-500">Added {new Date(sound.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePreview(sound.id)}
                                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                                title="Preview in browser"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(sound)}
                                                className="p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sound.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Add & Stats */}
                <div className="space-y-6">
                    {/* Add/Edit Sound Card */}
                    <Card className={`p-6 ${editingSound ? 'border-2 border-amber-500/50' : ''}`}>
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            {editingSound ? (
                                <>
                                    <Edit2 className="w-5 h-5 text-amber-500" />
                                    Edit Sound
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 text-blue-500" />
                                    Add New Sound
                                </>
                            )}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Vine Boom"
                                    maxLength={32}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
                                <Input
                                    value={emoji}
                                    onChange={(e) => setEmoji(e.target.value)}
                                    placeholder="🔊"
                                    maxLength={4}
                                    required
                                />
                            </div>

                            {!editingSound && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sound File</label>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                        required={!editingSound}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Max 10 seconds recommended.</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {editingSound && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={handleCancelEdit}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Saving...' : (editingSound ? 'Update Sound' : 'Add Sound')}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Stats Card */}
                    <Card className="p-6">
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Music className="w-5 h-5 text-purple-500" />
                            Top Sounds
                        </h2>
                        {stats && stats.topSounds.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topSounds.map((s, i) => (
                                    <div key={s.soundId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-mono w-4">{i + 1}</span>
                                            <span>{s.emoji} {s.name}</span>
                                        </div>
                                        <Badge variant="info">{s.count}</Badge>
                                    </div>
                                ))}
                                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center">
                                    Total Plays: {stats.totalPlays}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 text-center py-4">
                                No stats available yet.
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Hidden audio element for preview */}
            {previewAudio && (
                <audio
                    key={previewAudio}
                    autoPlay
                    onEnded={() => setPreviewAudio(null)}
                    className="hidden"
                >
                    <source src={previewAudio} type="audio/mpeg" />
                </audio>
            )}


        </div>
    );
};
