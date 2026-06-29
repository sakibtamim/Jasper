import {
    ArrowRight,
    Cpu,
    Database,
    GitMerge,
    HardDrive,
    Layers,
    Server,
    Shield,
} from 'lucide-react';

import { CodeBlock } from '../components/CodeBlock';
import { Section } from '../components/Section';

export const Architecture = () => {
    return (
        <div className="relative overflow-hidden min-h-screen text-slate-100">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#00e5ff]/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-[#ff6ad5]/10 rounded-full blur-[140px] pointer-events-none"></div>

            <Section className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-[#00e5ff] mb-6 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                        <Cpu size={12} className="text-[#00e5ff]" />
                        SYSTEM DEEP-DIVE & INTERNAL SPECS
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
                        System Architecture
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                        An overview of Jasper's highly optimized multi-process pipeline, database
                        abstraction layer, token cryptography, and caching subsystems.
                    </p>
                </div>

                {/* High-End HTML/CSS System Diagram */}
                <div className="mb-20">
                    <h3 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-wider">
                        Interactive System Flow Diagram
                    </h3>

                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl">
                        <div className="grid md:grid-cols-12 gap-6 items-center">
                            {/* Layer 1: Client Gateway */}
                            <div className="md:col-span-3 flex flex-col gap-4">
                                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#00e5ff]/50 transition-all text-center">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                                        User Plane
                                    </span>
                                    <h4 className="font-bold text-white text-sm">
                                        Discord User Commands
                                    </h4>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        Slash commands / buttons
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#ff6ad5]/50 transition-all text-center">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                                        Web Plane
                                    </span>
                                    <h4 className="font-bold text-white text-sm">Vite Frontend</h4>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        Real-time stats / dashboard
                                    </p>
                                </div>
                            </div>

                            {/* Direction Arrow */}
                            <div className="hidden md:flex md:col-span-1 justify-center text-slate-600">
                                <ArrowRight size={24} className="animate-pulse" />
                            </div>

                            {/* Layer 2: Core Controller (Jasper) */}
                            <div className="md:col-span-4 p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 relative group glow-pink-hover transition-all">
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-[8px] font-mono text-[#ff6ad5] uppercase">
                                    Main Router
                                </div>
                                <div className="p-3 rounded-xl bg-pink-500/10 text-[#ff6ad5] w-fit mb-4 mx-auto border border-[#ff6ad5]/15">
                                    <Cpu size={24} />
                                </div>
                                <h4 className="font-bold text-white text-base text-center">
                                    Jasper Controller Bot
                                </h4>
                                <p className="text-slate-400 text-xs text-center mt-2 leading-relaxed">
                                    Decoupled HTTP & Slash Command Router. Verifies OAuth states,
                                    intercepts lifecycle events, and passes requests down the pipe.
                                </p>

                                <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] font-mono text-slate-500 space-y-1">
                                    <div className="flex justify-between">
                                        <span>REST API:</span>
                                        <span className="text-green-400">Fastify Port 3000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Crypto:</span>
                                        <span className="text-[#ff6ad5]">AES-256-GCM / PBKDF2</span>
                                    </div>
                                </div>
                            </div>

                            {/* Direction Arrow */}
                            <div className="hidden md:flex md:col-span-1 justify-center text-slate-600">
                                <ArrowRight size={24} className="animate-pulse" />
                            </div>

                            {/* Layer 3: Worker Swarm & Storage */}
                            <div className="md:col-span-3 flex flex-col gap-4">
                                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#00e5ff]/50 transition-all text-center relative overflow-hidden">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                                        Media Execution
                                    </span>
                                    <h4 className="font-bold text-[#00e5ff] text-sm flex items-center justify-center gap-1.5">
                                        <Server size={14} /> Worker Bots (AFR)
                                    </h4>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        Isolated voice channels
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#ff6ad5]/50 transition-all text-center">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                                        Caching
                                    </span>
                                    <h4 className="font-bold text-white text-sm flex items-center justify-center gap-1.5">
                                        <HardDrive size={14} /> /cache/audio/
                                    </h4>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        WebM streams (yt-dlp)
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-500 transition-all text-center">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                                        Database
                                    </span>
                                    <h4 className="font-bold text-white text-sm flex items-center justify-center gap-1.5">
                                        <Database size={14} /> SQLite / Postgres
                                    </h4>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        Scoped store indexes
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed System Components */}
                <div className="space-y-12 max-w-5xl mx-auto">
                    {/* Component 1: Multi-Bot Worker Pool */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-xl"></div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Server className="text-[#00e5ff]" /> 1. Multi-Bot Worker Pool
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                                <p>
                                    Traditional bots handle playback within the main application
                                    event loop, leading to heavy processor bottlenecks, memory
                                    bloat, and rate limits. Jasper decouples the command interface
                                    from voice stream processing.
                                </p>
                                <p>
                                    The <strong>Controller bot (Jasper)</strong> acts as the central
                                    scheduler and web dashboard gateway. It reads command payloads
                                    and allocates connection tasks to the{' '}
                                    <strong>Worker bot pool</strong> (Misty, Tuki, Jafreen), which
                                    process audio inside individual voice channels.
                                </p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
                                <div className="border-b border-slate-800 pb-2 mb-2 font-bold text-white text-center">
                                    Process Division
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-[#ff6ad5] font-bold">
                                            ● Controller Bot Process:
                                        </span>
                                        <ul className="list-disc list-inside pl-3 mt-1 space-y-1">
                                            <li>Fastify Web Server</li>
                                            <li>Slash Command Gateway</li>
                                            <li>AES Cryptography</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <span className="text-[#00e5ff] font-bold">
                                            ● Worker Bot Processes:
                                        </span>
                                        <ul className="list-disc list-inside pl-3 mt-1 space-y-1">
                                            <li>Discord Voice Gateway binding</li>
                                            <li>yt-dlp PassThrough streaming</li>
                                            <li>Voice connection keep-alive</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Component 2: AFR Algorithm */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <GitMerge className="text-[#ff6ad5]" /> 2. AFR Selection Algorithm
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            The Automatic Feline Rotation (AFR) selection policy determines which
                            bot client will join the voice channel when a play event is triggered.
                        </p>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                                    Scheduling Steps:
                                </h4>
                                <ol className="list-decimal list-inside text-sm text-slate-400 space-y-3 pl-2">
                                    <li>
                                        <strong className="text-white">Sticky Verification:</strong>{' '}
                                        Looks up active voice channels. If a worker client is
                                        already connected to the channel, reuse that client
                                        immediately.
                                    </li>
                                    <li>
                                        <strong className="text-white">
                                            Weighted Controller Roll:
                                        </strong>{' '}
                                        Checks if Jasper (Controller) is eligible. Rolls a random
                                        check against <code>JASPER_WEIGHT</code> (default: 0.50). If
                                        rolled &le; weight, the Controller is dispatched.
                                    </li>
                                    <li>
                                        <strong className="text-white">Random Dispatch:</strong> If
                                        weight check fails or Controller is busy, selects a random
                                        client from the remaining idle workers.
                                    </li>
                                    <li>
                                        <strong className="text-white">
                                            Active Queue Fallback:
                                        </strong>{' '}
                                        If all clients are full, returns an execution delay state
                                        and queues the track.
                                    </li>
                                </ol>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
                                <div className="border-b border-slate-800 pb-2 mb-2 font-bold text-white">
                                    Selection Algorithm Source Draft
                                </div>
                                <CodeBlock
                                    language="typescript"
                                    code={`// Select eligible worker
const activeInChannel = pool.find(w => w.channelId === target);
if (activeInChannel) return activeInChannel;

if (controller.isEligible && Math.random() <= JASPER_WEIGHT) {
    return controller;
}

const idleWorkers = pool.filter(w => w.status === 'IDLE');
if (idleWorkers.length > 0) {
    return idleWorkers[Math.floor(Math.random() * idleWorkers.length)];
}

return null; // Queue fallback`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Component 3: Wildcard Route Resolution */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Layers className="text-[#00e5ff]" /> 3. Wildcard Route Resolution
                        </h2>
                        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                            Because plugins define custom API routes on the dashboard frontend and
                            backend, Jasper uses Fastify's wildcard routing hooks. A wildcard
                            handler is registered at <code>/api/plugins/:pluginId/*</code>.
                        </p>
                        <p className="text-sm text-slate-400">
                            Upon receiving a request, the router parses the <code>pluginId</code>,
                            checks the plugin registry, and delegates the remaining path parameters
                            to the plugin's <code>DynamicPluginRouter</code> for internal route
                            matching and parameter parsing.
                        </p>
                    </div>

                    {/* Component 4: Database Adapters */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff6ad5]/5 rounded-full blur-xl"></div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Database className="text-[#ff6ad5]" /> 4. SQLite vs PostgreSQL Adapters
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                                <p>
                                    Jasper is database agnostic, wrapping persistence operations
                                    inside a unified database interface. Out of the box, it supports
                                    SQLite for single-node deploys, and PostgreSQL for high-traffic
                                    environments.
                                </p>
                                <p>
                                    To bypass serialization differences (PostgreSQL supports native
                                    JSON schemas, whereas SQLite stores structures as plain string
                                    text), the adapter performs runtime serialization checks.
                                </p>
                                <p>
                                    To speed up retrieval times for plugin data, the database schema
                                    maps lookups against the secondary index{' '}
                                    <code>idx_plugin_storage_plugin_name</code>.
                                </p>
                            </div>
                            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 space-y-3">
                                <div>
                                    <strong className="text-white block mb-1">
                                        SQLite Implementation:
                                    </strong>
                                    <code>{`JSON.stringify()`}</code> is executed before saving
                                    records to text columns, and parsed on query retrieval.
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">
                                        PostgreSQL Implementation:
                                    </strong>
                                    Passes native JSON objects to the connection pool directly.
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">
                                        Secondary Indexes:
                                    </strong>
                                    <code>
                                        CREATE INDEX idx_plugin_storage_plugin_name ON
                                        plugin_storage (plugin_name, key);
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Component 5: Token Security */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Shield className="text-[#00e5ff]" /> 5. AES-256-GCM Token Security
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            Security is vital for preserving server credentials and user access
                            tokens. Discord OAuth tokens are encrypted at rest using the AES-256-GCM
                            cipher with key derivation using PBKDF2.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Cryptographic Serialization Format:
                            </h4>
                            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-center">
                                <span className="text-[#ff6ad5]">salt</span> :{' '}
                                <span className="text-[#00e5ff]">iv</span> :{' '}
                                <span className="text-purple-400">authTag</span> :{' '}
                                <span className="text-emerald-400">encryptedToken</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Every stored token is encrypted with a unique initialization vector
                                (IV) and password-based salt. The authentication tag verification
                                prevents offline tampering, while the salt is used to derive keys on
                                the fly using 100,000 PBKDF2 iterations.
                            </p>
                        </div>
                    </div>

                    {/* Component 6: Dual-Layer Caching */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <HardDrive className="text-[#ff6ad5]" /> 6. Dual-Layer Caching Pipeline
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            To minimize API traffic and save server bandwidth on repeated song
                            requests, Jasper utilizes a robust caching structure:
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                                <h4 className="font-bold text-white text-sm mb-2">
                                    Query Search Cache
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Stores YouTube, Spotify, and direct search responses in-memory.
                                    Prevents redundant API search calls to external media providers,
                                    serving results instantly.
                                </p>
                            </div>
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                                <h4 className="font-bold text-[#00e5ff] text-sm mb-2">
                                    Disk Audio Cache
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Spawns <code>yt-dlp</code> as a PassThrough stream and pipes the
                                    raw WebM container stream directly to <code>cache/audio/</code>{' '}
                                    while playing. Expired files are evicted based on TTL and disk
                                    limits.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
