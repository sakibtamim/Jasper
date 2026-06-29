import { useState } from 'react';

import {
    AlertCircle,
    BarChart2,
    Disc,
    GripVertical,
    Pause,
    Play,
    Sparkles,
    Upload,
    Volume2,
} from 'lucide-react';

import { Section } from '../components/Section';

export const Showcase = () => {
    // Soundboard States
    const [activeSound, setActiveSound] = useState<string | null>(null);
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [soundStatusMessage, setSoundStatusMessage] = useState<string>('Ready');

    // Garage Band States
    const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [tracks, setTracks] = useState([
        {
            id: '1',
            title: 'Midnight Lo-Fi Chill Out',
            source: 'YouTube Link',
            duration: '03:42',
            type: 'youtube',
        },
        {
            id: '2',
            title: 'Synthwave Grid Run',
            source: 'Direct Stream URL',
            duration: '05:12',
            type: 'stream',
        },
        {
            id: '3',
            title: 'Acoustic Rain Cafe Session',
            source: 'Local File (welcome.mp3)',
            duration: '02:15',
            type: 'file',
        },
        {
            id: '4',
            title: 'Retro Vaporwave Drive',
            source: 'YouTube Link',
            duration: '04:30',
            type: 'youtube',
        },
    ]);
    const [showUploadAlert, setShowUploadAlert] = useState(false);

    // Soundboard Sounds list
    const sounds = [
        { id: '1', name: 'Airhorn', emoji: '📢' },
        { id: '2', name: 'Ba Dum Tss', emoji: '🥁' },
        { id: '3', name: 'Sad Trombone', emoji: '🎺' },
        { id: '4', name: 'Bruh Effect', emoji: '💀' },
        { id: '5', name: 'Crab Rave Hit', emoji: '🦀' },
        { id: '6', name: 'Elevator Loop', emoji: '🏢' },
    ];

    const playSound = (name: string) => {
        setActiveSound(name);
        setIsPlayingSound(true);
        setSoundStatusMessage(`[Soundboard] Paused Music Queue -> Play Overlay: ${name}`);

        // Auto resume after 2.5s simulating overlay play and music recovery
        setTimeout(() => {
            setIsPlayingSound(false);
            setSoundStatusMessage(
                `[Soundboard] Finished playing: ${name}. Resumed Music queue playback.`,
            );
        }, 2500);
    };

    const handleUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            setShowUploadAlert(true);

            // Add mock track
            const newTrack = {
                id: (tracks.length + 1).toString(),
                title: fileName.replace(/\.[^/.]+$/, ''),
                source: `Uploaded File (${fileName})`,
                duration: '02:50',
                type: 'file',
            };
            setTracks((prev) => [...prev, newTrack]);
            setTimeout(() => setShowUploadAlert(false), 3000);
        }
    };

    return (
        <div className="relative overflow-hidden min-h-screen text-slate-100">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#ff6ad5]/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-[#00e5ff]/5 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>

            <Section className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-[#ff6ad5] mb-6 shadow-[0_0_15px_rgba(255,106,213,0.15)]">
                        <Sparkles size={12} className="text-[#ff6ad5]" />
                        INTERACTIVE WORKSPACE PREVIEW
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
                        Jasper Showcase
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                        Experiment with mock live interfaces representing first-party plugins
                        running on Jasper's worker node subsystems.
                    </p>
                </div>

                {/* Showcase Modules */}
                <div className="space-y-16 max-w-6xl mx-auto">
                    {/* Panel 1: Garage Band Playlist Manager */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative">
                        <div className="absolute top-2 right-2 px-3 py-1 rounded bg-[#ff6ad5]/15 border border-[#ff6ad5]/30 text-xs font-mono text-[#ff6ad5]">
                            Garage Band Plugin
                        </div>

                        <div className="grid lg:grid-cols-12 gap-8 items-center">
                            {/* Left Side: Playlist Manager Controller */}
                            <div className="lg:col-span-8 space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                        <Disc className="text-[#ff6ad5]" /> Premium Playlist
                                        Controller
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Drag & drop tracks, mix media streams, and upload files
                                        directly. Visual changes post to the dashboard REST
                                        services.
                                    </p>
                                </div>

                                {/* Drag-drop playlist track list */}
                                <div className="space-y-2.5">
                                    {tracks.map((track, index) => (
                                        <div
                                            key={track.id}
                                            onClick={() => setCurrentTrackIndex(index)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-300 ${currentTrackIndex === index ? 'bg-slate-900 border-[#ff6ad5]/50 shadow-[0_0_12px_rgba(255,106,213,0.1)]' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-500 hover:text-white cursor-grab">
                                                    <GripVertical size={16} />
                                                </div>
                                                <button
                                                    className={`p-1.5 rounded-full ${currentTrackIndex === index && isPlaylistPlaying ? 'bg-[#ff6ad5] text-white' : 'bg-slate-800 text-slate-300'}`}
                                                >
                                                    {currentTrackIndex === index &&
                                                    isPlaylistPlaying ? (
                                                        <Pause size={12} />
                                                    ) : (
                                                        <Play size={12} />
                                                    )}
                                                </button>
                                                <div>
                                                    <h5
                                                        className={`text-sm font-bold ${currentTrackIndex === index ? 'text-[#ff6ad5]' : 'text-slate-200'}`}
                                                    >
                                                        {track.title}
                                                    </h5>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        Source: {track.source}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                                    {track.type.toUpperCase()}
                                                </span>
                                                <span className="text-xs font-mono text-slate-400">
                                                    {track.duration}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Upload zone simulator */}
                                <div className="p-5 border border-dashed border-slate-700/80 rounded-xl bg-slate-950/40 text-center hover:bg-slate-900/30 transition-all relative">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleUploadSimulate}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        title="Simulate Drop Zone Upload"
                                    />
                                    <Upload size={24} className="text-[#00e5ff] mx-auto mb-2" />
                                    <p className="text-xs text-slate-300 font-semibold">
                                        Drop raw audio files here or click to simulate FormData
                                        upload
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Pipes to /playlists/:id/upload. Server extracts duration via
                                        ffprobe.
                                    </p>
                                </div>

                                {showUploadAlert && (
                                    <div className="flex items-center gap-2 p-3 bg-green-950/80 border border-green-800 rounded-lg text-xs text-green-300 animate-in fade-in duration-300">
                                        <Sparkles size={16} />
                                        <span>
                                            File received! Executed ffprobe lookup and saved to
                                            data/plugins/garage-band/.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Visual Spinning Vinyl Record */}
                            <div className="lg:col-span-4 flex flex-col items-center justify-center">
                                <div className="text-center mb-6">
                                    <button
                                        onClick={() => setIsPlaylistPlaying(!isPlaylistPlaying)}
                                        className="px-6 py-3 rounded-xl font-bold bg-[#ff6ad5] hover:bg-pink-600 text-white transition-all text-xs flex items-center gap-2 shadow-lg shadow-pink-500/10"
                                    >
                                        {isPlaylistPlaying ? (
                                            <Pause size={14} />
                                        ) : (
                                            <Play size={14} />
                                        )}
                                        {isPlaylistPlaying
                                            ? 'Pause Main Player'
                                            : 'Play Main Player'}
                                    </button>
                                </div>

                                {/* Record casing */}
                                <div className="relative group p-1 bg-slate-900 rounded-full border border-slate-800 shadow-2xl hover:scale-105 transition-transform duration-500">
                                    {/* The vinyl */}
                                    <div
                                        className={`w-48 h-48 rounded-full bg-slate-950 flex items-center justify-center relative border border-slate-900 ${isPlaylistPlaying ? 'animate-vinyl-spin' : ''}`}
                                    >
                                        {/* Groove lines */}
                                        <div className="absolute inset-2 border border-slate-800/20 rounded-full"></div>
                                        <div className="absolute inset-6 border border-slate-800/20 rounded-full"></div>
                                        <div className="absolute inset-10 border border-slate-800/20 rounded-full"></div>
                                        <div className="absolute inset-14 border border-slate-800/20 rounded-full"></div>

                                        {/* Label */}
                                        <div className="w-16 h-16 rounded-full bg-[#ff6ad5] border-4 border-slate-900 flex items-center justify-center relative">
                                            <span className="text-[8px] font-bold text-white text-center select-none font-mono">
                                                JASPER
                                            </span>
                                            <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-900"></div>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono mt-4">
                                    Hover vinyl to inspect CSS Rotation Keyframe state.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Panel 2: Soundboard Console */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative">
                        <div className="absolute top-2 right-2 px-3 py-1 rounded bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-xs font-mono text-[#00e5ff]">
                            Soundboard Plugin
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Volume2 className="text-[#00e5ff]" /> Soundboard Connection
                                    Sharing Grid
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Click any button to trigger the audio hook overlay. Connection
                                    sharing automatically pauses active queues, overlays playbacks,
                                    and resumes queue streams seamlessly.
                                </p>
                            </div>

                            {/* Status bar */}
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <AlertCircle size={14} className="text-[#00e5ff]" />
                                    <span className="font-mono text-slate-300">
                                        {soundStatusMessage}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={`w-2 h-2 rounded-full ${isPlayingSound ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
                                    ></span>
                                    <span className="text-slate-500 text-[10px] uppercase font-mono">
                                        {isPlayingSound ? 'Streaming Sound' : 'Idle Ready'}
                                    </span>
                                </div>
                            </div>

                            {/* Sound Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {sounds.map((sound) => (
                                    <button
                                        key={sound.id}
                                        onClick={() => playSound(sound.name)}
                                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 ${activeSound === sound.name && isPlayingSound ? 'bg-[#00e5ff]/10 border-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <span className="text-2xl select-none">{sound.emoji}</span>
                                        <span className="text-xs font-bold text-white">
                                            {sound.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Soundboard command reference */}
                            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-900 text-xs text-slate-400">
                                <div className="flex gap-2">
                                    <code className="text-[#00e5ff] font-mono bg-slate-900 p-1.5 rounded border border-slate-800 h-fit">
                                        /soundboard menu
                                    </code>
                                    <p className="mt-0.5">
                                        Spawns an ephemeral select menu in Discord for user-specific
                                        quick triggers.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <code className="text-[#00e5ff] font-mono bg-slate-900 p-1.5 rounded border border-slate-800 h-fit">
                                        /soundboard ui
                                    </code>
                                    <p className="mt-0.5">
                                        Spawns a permanent button grid directly in the text channel
                                        for public control.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Dashboard section */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <BarChart2 className="text-[#00e5ff]" /> Aggregated Stats &
                                    Metrics
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Aggregated metrics and leaderboards served dynamically from
                                    SQLite or PostgreSQL adapters.
                                </p>
                            </div>
                            <span className="text-xs bg-slate-900 text-slate-400 px-3 py-1 rounded border border-slate-800 font-mono h-fit">
                                API: /api/stats
                            </span>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* metric 1 */}
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                                <span className="text-slate-500 text-[10px] uppercase font-mono">
                                    Global Bandwidth Saved
                                </span>
                                <h4 className="text-3xl font-black text-white mt-1">94.2%</h4>
                                <span className="text-[10px] text-green-400 font-mono block mt-1">
                                    Via Disk-Based Audio Cache
                                </span>
                            </div>
                            {/* metric 2 */}
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                                <span className="text-slate-500 text-[10px] uppercase font-mono">
                                    Average Playback Delay
                                </span>
                                <h4 className="text-3xl font-black text-[#00e5ff] mt-1">182ms</h4>
                                <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                    Workers pre-cached buffer
                                </span>
                            </div>
                            {/* metric 3 */}
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                                <span className="text-slate-500 text-[10px] uppercase font-mono">
                                    Active Streams
                                </span>
                                <h4 className="text-3xl font-black text-[#ff6ad5] mt-1">
                                    324 / hr
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                    AFR load-balanced nodes
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
