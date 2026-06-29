import React from 'react';
import { Link } from 'react-router-dom';

import {
    ArrowRight,
    BarChart2,
    Cpu,
    Database,
    Disc,
    FileText,
    Image,
    Mic,
    Music,
    Radio,
    Star,
    Volume2,
} from 'lucide-react';

import { Section } from '../components/Section';

interface PluginInfo {
    title: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    color: string;
    badge: string;
    desc: string;
    features: string[];
    tags: string[];
    repository?: string;
}

export const PluginDirectory = () => {
    const plugins: PluginInfo[] = [
        {
            title: 'Music Core',
            icon: Music,
            color: 'primary',
            badge: 'Required Core',
            desc: "The primary orchestrator of Jasper's playback. It manages voice client pipelines, routes commands, coordinates workers, and handles thread-safe music queues.",
            features: [
                'Robust voice client routing and worker pool scheduling.',
                'Comprehensive commands: /play, /skip, /pause, /resume, /queue, /stop.',
                'Custom interactive button grids for player controls in Discord.',
            ],
            tags: ['music', 'core', 'playback'],
        },
        {
            title: 'Statistics',
            icon: BarChart2,
            color: 'secondary',
            badge: 'Core Feature',
            desc: 'A rich observability suite that aggregates playback and performance analytics. Powers dashboard metrics and provides public API endpoints.',
            features: [
                'Aggregates listening duration, active guilds, and popular tracks.',
                'Serves analytics payloads over Fastify JSON endpoints (/api/stats).',
                'Feeds real-time WebSocket connections for live leaderboard updates.',
            ],
            tags: ['metrics', 'analytics', 'leaderboards'],
        },
        {
            title: 'Soundboard',
            icon: Mic,
            color: 'secondary',
            badge: 'Audio Overlay',
            desc: 'Integrates a dynamic overlay sound system. Features voice client connection sharing to overlay short audio clips without tearing down active queues.',
            features: [
                'Connection sharing: pauses music player, plays sound clip, and resumes music.',
                'Ephemeral /soundboard menu and permanent /soundboard ui button grid.',
                'Secure web upload page to register custom sound effects in the DB.',
            ],
            tags: ['overlays', 'fun', 'voice'],
        },
        {
            title: 'Garage Band',
            icon: Disc,
            color: 'primary',
            badge: 'Early Access (Premium)',
            desc: 'A complete custom playlist manager with an advanced interface and multi-source streaming support. Currently in Early Access as a planned premium offering.',
            features: [
                'Visual hover animation that spins vinyl records using CSS keyframes.',
                'Drag & drop reordering using @dnd-kit contexts (DndContext and SortableContext) posting to /playlists/:id/reorder.',
                'Drop Zone upload interface via FormData to /playlists/:id/upload.',
                'Extracts duration via server-side ffprobe and auto-fetches YouTube metadata.',
                'Mixed stream sources: handles YouTube links, direct stream URLs, and local file attachments.',
            ],
            tags: ['playlists', 'dnd-kit', 'ffprobe'],
            repository: 'https://github.com/purrfectsoft/jasper-plugin-garage-band-releases',
        },
        {
            title: 'Dashboard Notes',
            icon: FileText,
            color: 'primary',
            badge: 'UI Extension',
            desc: 'A collaborative notes widget that anchors itself inside the core dashboard slot to allow admin annotations.',
            features: [
                'Registers directly to the main dashboard note widget (dashboard:main slot).',
                'Full CRUD notes interface: create, read, update, and delete markdown text.',
                'Saves workspace annotations directly to SQLite/PostgreSQL adapters.',
            ],
            tags: ['ui-slot', 'notes', 'crud'],
        },
        {
            title: 'Media Gallery',
            icon: Image,
            color: 'secondary',
            badge: 'Asset Management',
            desc: 'A demonstrator plugin illustrating how to securely handle local file uploads and render custom asset lists.',
            features: [
                'Uses the custom usePluginStorage React hooks for file operations.',
                'Supports drag-and-drop image uploading, gallery previewing, and asset purging.',
                'Enforces scoped file structure policies under sanitized storage paths.',
            ],
            tags: ['storage', 'uploads', 'hooks'],
        },
        {
            title: 'Sound Effect',
            icon: Volume2,
            color: 'primary',
            badge: 'Audio Hooks',
            desc: 'Automates sound triggers linked to guild voice events. Ideal for creating custom greetings or announcements.',
            features: [
                'Triggers a voice joining audio hook on new voice channel creation.',
                'Streams a welcome.mp3 cue before enqueued queue music starts.',
                'Demonstrates pre-music hook scheduling compliance.',
            ],
            tags: ['welcome-cue', 'events', 'hooks'],
        },
        {
            title: 'Advanced Hooks Test',
            icon: Radio,
            color: 'secondary',
            badge: 'Lifecycle Hook',
            desc: 'A diagnostic plugin built to test framework hook registration. Verifies listener hooks are fired correctly.',
            features: [
                'Hooks into server ready status (SERVER_READY) and registers endpoints.',
                'Listens to worker assignments (WORKER_ASSIGNED) to trace load balancing.',
                'Intercepts Discord voice state updates (VOICE_STATE_UPDATE).',
            ],
            tags: ['events', 'debugging', 'trace'],
        },
        {
            title: 'DB Test',
            icon: Database,
            color: 'primary',
            badge: 'Persistence Test',
            desc: 'Validates database connectivity and reads central records to confirm backend integrity.',
            features: [
                'Performs SQLite and PostgreSQL read/write verification cycles.',
                'Reads core music history records and verifies relational keys.',
                'Ensures secure scoped persistence namespaces are functioning.',
            ],
            tags: ['database', 'sqlite', 'postgres'],
        },
    ];

    return (
        <div className="relative overflow-hidden min-h-screen text-slate-100">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-[#00e5ff]/5 rounded-full blur-[140px] pointer-events-none"></div>

            <Section className="relative z-10 pt-28 pb-20">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-[#ff6ad5] mb-6 shadow-[0_0_15px_rgba(255,106,213,0.15)]">
                        <Star size={12} className="text-[#ff6ad5] animate-pulse" />
                        PLUG & PLAY ECOSYSTEM
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
                        Plugin Directory
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                        Jasper is designed with a lean core. All specialized features are built as
                        modular plugins that load dynamically, keeping your bot stable and
                        extensible.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto mb-20 text-slate-300 leading-relaxed bg-slate-950/60 p-8 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-[#ff6ad5]/10 to-transparent rounded-full blur-2xl"></div>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Cpu className="text-[#00e5ff]" /> Dynamic Plugin Loading Architecture
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Upon boot, the central Plugin Manager scans the{' '}
                        <code>apps/bot/src/plugins</code> folder. It reads each plugin's mandatory{' '}
                        <code>jasper-plugin.json</code> manifest, registers its endpoints to
                        Fastify, configures lifecycle hooks, and spins up dashboard widgets.
                    </p>
                    <p className="text-sm text-slate-400">
                        This ensures you can drop in code, restart, and get live slash commands
                        immediately without changing the core repository.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {plugins.map((plugin, idx) => {
                        const IconComponent = plugin.icon;
                        return (
                            <div
                                key={idx}
                                className={`glass-panel p-6 rounded-2xl border border-slate-800/80 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between ${plugin.color === 'primary' ? 'glow-pink-hover' : 'glow-cyan-hover'}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${plugin.color === 'primary' ? 'text-[#ff6ad5]' : 'text-[#00e5ff]'}`}
                                        >
                                            <IconComponent size={24} />
                                        </div>
                                        <span
                                            className={`text-[10px] uppercase font-mono px-2.5 py-1 rounded-full border ${plugin.color === 'primary' ? 'bg-[#ff6ad5]/5 text-[#ff6ad5] border-[#ff6ad5]/20' : 'bg-cyan-500/5 text-[#00e5ff] border-[#00e5ff]/20'}`}
                                        >
                                            {plugin.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {plugin.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-4 leading-relaxed min-h-[60px]">
                                        {plugin.desc}
                                    </p>

                                    <div className="mb-6">
                                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                            Capabilities:
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {plugin.features.map((feat, fidx) => (
                                                <li
                                                    key={fidx}
                                                    className="text-xs text-slate-400 flex items-start gap-1.5"
                                                >
                                                    <span className="text-[#00e5ff] mt-0.5">•</span>
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {plugin.repository && (
                                        <div className="mb-6">
                                            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                                Repository (Early Access):
                                            </h4>
                                            <a
                                                href={plugin.repository}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-[#00e5ff] hover:underline flex items-center gap-1.5 break-all font-mono"
                                            >
                                                {plugin.repository}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-900 flex flex-wrap gap-1.5">
                                    {plugin.tags.map((tag, tidx) => (
                                        <span
                                            key={tidx}
                                            className="text-[10px] font-mono bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded border border-slate-800"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-20 text-center relative z-10">
                    <div className="inline-block p-6 glass-panel border border-slate-800 rounded-2xl max-w-xl mx-auto shadow-xl">
                        <p className="text-slate-300 mb-4 text-sm">
                            Ready to build your own custom plugin?
                        </p>
                        <Link
                            to="/developers"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-slate-900 border border-slate-800 hover:border-slate-500 text-[#00e5ff] hover:text-white transition-all text-sm"
                        >
                            Read the Developer Guide <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </Section>
        </div>
    );
};
