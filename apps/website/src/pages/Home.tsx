import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cat, Music, Server, Cpu, Zap, Layers, ShieldAlert, Terminal } from 'lucide-react';
import { Section } from '../components/Section';
import { Card } from '../components/Card';
import { WorkerCat } from '../components/WorkerCat';
import { DocTabs } from '../components/DocTabs';

export const Home = () => {
    const [activeTab, setActiveTab] = useState('cat');

    return (
        <>
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-[#00e5ff] rounded-full blur-[120px] opacity-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#ff6ad5] rounded-full blur-[150px] opacity-10"></div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#00e5ff] mb-8 animate-fade-in">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping"></span>
                        SYSTEM ONLINE: v2.4.0
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                        Jasper — The Purrfect <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6ad5] to-[#00e5ff]">
                            Discord Music & Utility Bot
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Plugin-driven. AI-assisted. Built for busy communities that want great vibes without complexity.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                        <button
                            onClick={() => window.open('https://github.com/sakibtamim/Jasper', '_blank')}
                            className="px-8 py-4 rounded-xl font-bold bg-[#ff6ad5] text-white shadow-lg shadow-pink-500/25 hover:scale-105 transition-transform"
                        >
                            View on GitHub
                        </button>
                        <Link
                            to="/plugins"
                            className="px-8 py-4 rounded-xl font-bold bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:border-slate-500 transition-all"
                        >
                            Explore Plugins
                        </Link>
                    </div>

                    <div className="text-slate-400 max-w-3xl mx-auto mb-16 leading-relaxed bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                        <p className="mb-4">
                            Jasper is a modern Discord bot built with care by Purrfect Software Limited. It focuses on high-quality music playback, extensible plugins, and a clean architecture that’s friendly to both server owners and developers.
                        </p>
                        <p>
                            Under the hood, Jasper is powered by a swarm of humans, AI agents, and the ever-watchful Heavenly Council of Fur 🐾.
                        </p>
                    </div>

                    {/* Dynamic Content Toggle (Kept from original design as it's cool) */}
                    <div className="flex justify-center gap-4 mb-8">
                        <button
                            onClick={() => setActiveTab('cat')}
                            className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'cat' ? 'bg-[#ff6ad5]/20 text-[#ff6ad5] border border-[#ff6ad5]' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                        >
                            <Cat size={16} /> The Aesthetic
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'system' ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
                        >
                            <Cpu size={16} /> The Architecture
                        </button>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 max-w-3xl mx-auto min-h-[300px] flex items-center justify-center transition-all duration-500">
                        {activeTab === 'cat' ? (
                            <div className="text-left w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-2xl font-bold text-[#ff6ad5] mb-4 flex items-center gap-2">
                                    <Music className="animate-bounce" /> The Heavenly Council of Fur
                                </h3>
                                <p className="text-slate-300 mb-6">
                                    Jasper isn't just one bot. It's a council. When you request a song, Jasper might play it, or he might dispatch one of his feline workers based on load and availability.
                                </p>
                                <div className="space-y-3">
                                    <WorkerCat name="Jasper (Controller)" role="The Boss & Scheduler" status="Online" delay={0} />
                                    <WorkerCat name="Misty" role="Worker Unit #1" status="Playing in #general" delay={100} />
                                    <WorkerCat name="Tuki" role="Worker Unit #2" status="Idle" delay={200} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-left w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-2xl font-bold text-[#00e5ff] mb-4 flex items-center gap-2">
                                    <Server /> Worker Pool Architecture
                                </h3>
                                <p className="text-slate-300 mb-6">
                                    Traditional bots use one token. Jasper uses a <strong>Resource Pool</strong> pattern. The Controller receives commands and schedules work onto available Worker Tokens.
                                </p>
                                <div className="font-mono text-xs md:text-sm bg-black/50 p-4 rounded-lg border border-slate-700 text-slate-300">
                                    <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
                                        <span>User Request</span>
                                        <span>→</span>
                                        <span className="text-[#ff6ad5]">Controller (Jasper)</span>
                                        <span>→</span>
                                        <span className="text-[#00e5ff]">Load Balancer (AFR)</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-800 p-2 rounded text-slate-500">Worker 1 (Busy)</div>
                                        <div className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/50 p-2 rounded">Worker 2 (Selected)</div>
                                        <div className="bg-slate-800 p-2 rounded text-slate-400">Worker 3 (Idle)</div>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-slate-800 text-right text-[#00e5ff]">
                                        → Spawning child_process: yt-dlp
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Key Features */}
            <Section className="bg-slate-900/30 border-y border-slate-800" id="features">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Everything you need, nothing you don't.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="High-Quality Music" icon={Music} color="primary">
                        Reliable playback with worker-based architecture, queues, and stats.
                    </Card>

                    <Card title="Plugin-First Design" icon={Layers} color="secondary">
                        Extend Jasper without touching the core. Drop plugins into <code>src/plugins</code> and go.
                    </Card>

                    <Card title="Built-In Statistics" icon={Zap} color="primary">
                        Track top songs, active listeners, and global usage with a dedicated stats API.
                    </Card>

                    <Card title="AI-Assisted" icon={Cpu} color="secondary">
                        Jasper’s codebase is actively shaped by AI agents (planning, refactoring, docs) with human review.
                    </Card>
                </div>
            </Section>

            {/* Design Principles */}
            <Section id="principles">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Design Principles</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Jasper is built on the philosophy that "works on my machine" isn't enough.
                        It's designed for resilience, scalability, and developer sanity.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card title="Outsource the Fragile" icon={ShieldAlert} color="secondary">
                        YouTube changes constantly. We don't reverse-engineer it.
                        We delegate extraction to <code className="text-[#00e5ff] bg-slate-900 px-1 rounded">yt-dlp</code> running as a child process.
                        When YouTube breaks, you update the binary, not the bot.
                    </Card>

                    <Card title="Automatic Feline Rotation" icon={Layers} color="primary">
                        AFR isn't just cute flavor text; it's a policy engine.
                        It creates a weighted choice between the Controller and dedicated Workers,
                        treating Discord playback as a scheduling problem.
                    </Card>

                    <Card title="Operational Reality" icon={Terminal} color="secondary">
                        Real systems fail. Jasper includes operational commands like
                        <code className="text-red-400 bg-slate-900 px-1 mx-1 rounded">/catastrophic-reset</code>
                        to nuke queues from orbit when state gets corrupted, without SSH-ing into the box.
                    </Card>
                </div>
            </Section>

            {/* Deep Dive: Tech Stack */}
            <Section className="bg-slate-900/30 border-t border-slate-800" id="architecture">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-block px-3 py-1 rounded-full bg-[#ff6ad5]/10 text-[#ff6ad5] text-sm font-bold mb-6">
                            UNDER THE HOOD
                        </div>
                        <h2 className="text-4xl font-bold mb-6 text-white">
                            TypeScript Monorepo <br />
                            <span className="text-slate-500">& Pluggable Pipeline</span>
                        </h2>
                        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                            Jasper separates concerns strictly. The <strong>Bot</strong> owns the Discord connection.
                            The <strong>Web App</strong> owns the dashboard. Shared packages keep types in sync.
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
                                    <Server className="text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Smart Persistence</h4>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Starts with SQLite (zero-config). Scales to PostgreSQL when you need concurrency.
                                        The codebase abstracts DB access so you don't have to rewrite queries.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="p-2 bg-green-500/10 rounded-lg h-fit">
                                    <Zap className="text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Aggressive Caching</h4>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Saves 90-95% bandwidth on repeated songs.
                                        Includes explicit TTL tuning and cleanup intervals to balance disk usage vs speed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#ff6ad5] to-[#00e5ff] rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-[#1e293b] px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="ml-2 text-xs font-mono text-slate-400">jasper-bot — -zsh — 80x24</span>
                            </div>
                            <div className="p-6 font-mono text-sm text-slate-300">
                                <div className="mb-4">
                                    <span className="text-green-400">➜</span> <span className="text-blue-400">~</span> jasper music-status
                                </div>
                                <div className="space-y-1 text-xs md:text-sm">
                                    <div className="text-slate-400">Please wait, querying worker pool...</div>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <span className="text-[#ff6ad5] font-bold">● Jasper (Controller)</span><br />
                                            Guilds: 14<br />
                                            Voice: <span className="text-yellow-400">Idle</span><br />
                                            Ping: 24ms
                                        </div>
                                        <div>
                                            <span className="text-[#00e5ff] font-bold">● Misty (Worker 01)</span><br />
                                            Guild: "Dev Server"<br />
                                            Voice: <span className="text-green-400">Playing</span><br />
                                            Track: "Lo-Fi Beats..."
                                        </div>
                                    </div>
                                    <div className="mt-4 border-t border-slate-700 pt-2 text-slate-500">
                                        Cache Hit Rate: 94.2% | Disk Usage: 4.2GB
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
            {/* Quick Reference */}
            <Section className="bg-slate-900/50 border-t border-slate-800" id="docs">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">Quick Reference</h2>
                    <p className="text-slate-400">Essential guides and common troubleshooting steps.</p>
                </div>
                <DocTabs />
            </Section>
        </>
    );
};
