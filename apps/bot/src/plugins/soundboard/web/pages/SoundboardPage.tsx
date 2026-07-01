import { React, useEffect, useState } from '@jasper/elements';
import { usePluginStorage } from '@jasper/hooks';
import { Badge, Button, Card, Input, Loader } from '@jasper/ui';
import { Edit2, Music, Play, Plus, Trash2, Upload, X } from 'lucide-react';

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
    const [isAdding, setIsAdding] = useState(false);

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
                fetch('/api/plugins/soundboard/stats'),
            ]);

            const soundsData = await soundsRes.json();
            const statsData = await statsRes.json();

            setSounds(soundsData.sounds || []);
            setStats(statsData);
        } catch (err) {
            console.error('Failed to fetch data', err);
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
                    body: JSON.stringify({ name, emoji }),
                });

                if (!res.ok) throw new Error('Failed to update sound');

                // Reset
                setEditingSound(null);
                setIsAdding(false);
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
                        fileUri: uploadResult.uri,
                    }),
                });

                if (!res.ok) throw new Error('Failed to create sound');

                // Reset form
                setIsAdding(false);
            }

            // Reset common form state
            setName('');
            setEmoji('🔊');
            setFile(null);

            // Refresh
            fetchData();
        } catch (err) {
            console.error('Operation failed', err);
            alert(editingSound ? 'Failed to update sound' : 'Failed to add sound');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sound?')) return;

        try {
            await fetch(`/api/plugins/soundboard/sounds/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleClearData = async () => {
        if (!confirm('Are you sure you want to clear ALL soundboard data? This cannot be undone!'))
            return;

        try {
            await fetch('/api/plugins/soundboard/data', { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error('Clear data failed', err);
        }
    };

    const handleEdit = (sound: Sound) => {
        setEditingSound(sound);
        setName(sound.name);
        setEmoji(sound.emoji);
        setFile(null);
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelForm = () => {
        setEditingSound(null);
        setName('');
        setEmoji('🔊');
        setFile(null);
        setIsAdding(false);
    };

    const handlePreview = (soundId: string) => {
        const sound = sounds.find((s) => s.id === soundId);
        if (sound) {
            setPreviewAudio(`/api/plugins/soundboard/storage/${sound.fileUri.split('/').pop()}`);
        }
    };

    const renderEmoji = (emojiStr: string) => {
        // Custom emoji format: <:name:id> or <a:name:id>
        const customEmojiMatch = emojiStr.match(/<a?:(\w+):(\d+)>/);
        if (customEmojiMatch) {
            const [, name, id] = customEmojiMatch;
            return (
                <img
                    src={`https://cdn.discordapp.com/emojis/${id}.png`}
                    alt={name}
                    className="w-8 h-8 object-contain"
                    title={name}
                    onError={(e) => {
                        // Fallback to text if image fails
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
            );
        }
        // Fallback for standard emojis or failed images
        return <span className="text-2xl">{emojiStr}</span>;
    };

    const getSoundPlayCount = (soundId: string): number => {
        if (!stats) return 0;
        const topSound = stats.topSounds.find((s) => s.soundId === soundId);
        return topSound ? topSound.count : 0;
    };

    if (loading && sounds.length === 0) {
        return (
            <div className="p-8 flex justify-center">
                <Loader className="w-8 h-8 text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 w-full mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Jasper Soundboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage custom sound effects for your server.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {stats && (
                        <div className="hidden md:flex items-center gap-4 mr-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Music className="w-4 h-4" />
                                <span>{sounds.length} Sounds</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Play className="w-4 h-4" />
                                <span>{stats.totalPlays} Plays</span>
                            </div>
                        </div>
                    )}
                    <Button
                        variant="secondary"
                        onClick={handleClearData}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                    </Button>
                    {!isAdding && (
                        <Button onClick={() => setIsAdding(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Sound
                        </Button>
                    )}
                </div>
            </div>

            {/* Add/Edit Form Section */}
            {isAdding && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
                    <Card
                        className={`p-6 border-2 ${editingSound ? 'border-amber-500/50' : 'border-blue-500/50'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
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
                            <button
                                onClick={handleCancelForm}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Vine Boom"
                                    maxLength={32}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Emoji
                                </label>
                                <Input
                                    value={emoji}
                                    onChange={(e) => setEmoji(e.target.value)}
                                    placeholder="🔊 or <:custom:123>"
                                    maxLength={64}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Supports standard emojis and custom Discord emojis.
                                </p>
                            </div>

                            {!editingSound && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Sound File
                                    </label>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                        required={!editingSound}
                                    />
                                </div>
                            )}

                            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleCancelForm}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={uploading}>
                                    {uploading
                                        ? 'Saving...'
                                        : editingSound
                                          ? 'Update Sound'
                                          : 'Add Sound'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Sounds Grid */}
            {sounds.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No sounds yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Upload your first sound effect to get started.
                    </p>
                    <Button onClick={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Sound
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {sounds.map((sound) => (
                        <Card
                            key={sound.id}
                            className="group relative p-3 flex flex-col items-center text-center hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                        >
                            <div className="w-12 h-12 mb-2 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                                {renderEmoji(sound.emoji)}
                            </div>

                            <h3
                                className="text-sm font-medium text-gray-900 dark:text-white w-full truncate px-1"
                                title={sound.name}
                            >
                                {sound.name}
                            </h3>

                            {/* Play count badge */}
                            {stats && getSoundPlayCount(sound.id) > 0 && (
                                <Badge variant="info" className="mt-1.5 text-xs">
                                    <Play className="w-3 h-3 mr-1 inline" />
                                    {getSoundPlayCount(sound.id)}
                                </Badge>
                            )}

                            <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex justify-center backdrop-blur-sm rounded-lg">
                                <button
                                    onClick={() => handlePreview(sound.id)}
                                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                                    title="Play"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                </button>
                                <button
                                    onClick={() => handleEdit(sound)}
                                    className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-full transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(sound.id)}
                                    className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-full transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Top Sounds Stats Card */}
            {stats && stats.topSounds.length > 0 && (
                <div className="mt-8">
                    <Card className="p-6">
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Music className="w-5 h-5 text-purple-500" />
                            Top 5 Most Played Sounds
                        </h2>
                        <div className="space-y-3">
                            {stats.topSounds.slice(0, 5).map((s, i) => (
                                <div
                                    key={s.soundId}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 font-mono w-5 text-right">
                                            {i + 1}
                                        </span>
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            {renderEmoji(s.emoji)}
                                        </div>
                                        <span className="font-medium">{s.name}</span>
                                    </div>
                                    <Badge variant="info">
                                        <Play className="w-3 h-3 mr-1 inline" />
                                        {s.count}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

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
