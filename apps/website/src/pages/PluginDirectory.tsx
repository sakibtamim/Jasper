import { Link } from 'react-router-dom';
import { Section } from '../components/Section';
import { Card } from '../components/Card';
import { Music, BarChart2, Mic, Command } from 'lucide-react';

export const PluginDirectory = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Background */}
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

            <Section className="relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#ff6ad5] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#ff6ad5] animate-pulse"></span>
                        ECOSYSTEM
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Plugins</h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Extend Jasper Your Way
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-16 text-slate-300 leading-relaxed bg-slate-800/30 p-8 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <p className="mb-4">
                        Jasper is built around a simple idea: the core should stay lean, and everything else should be a plugin.
                    </p>
                    <p>
                        Below is a showcase of first-party plugins. In the future, this page can list community plugins discovered from the repository.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card title="Music Core" icon={Music} color="primary">
                        <p className="mb-4">The heart of Jasper. Handles playback, queues, workers, and basic commands like play, pause, skip, and stop.</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">music</span>
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">core</span>
                            <span className="px-2 py-1 bg-[#ff6ad5]/10 text-[#ff6ad5] rounded text-xs border border-[#ff6ad5]/20">required</span>
                        </div>
                    </Card>

                    <Card title="Statistics" icon={BarChart2} color="secondary">
                        <p className="mb-4">Tracks what’s being played, by whom, and how often. Powers dashboards and <code>/api/stats</code>.</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">metrics</span>
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">analytics</span>
                        </div>
                    </Card>

                    <Card title="Soundboard (WIP)" icon={Mic} color="secondary">
                        <p className="mb-4">Discord-style soundboard powered by Jasper’s worker architecture. More sounds, more chaos, less compromise.</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">fun</span>
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">soundboard</span>
                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs border border-yellow-500/20">beta</span>
                        </div>
                    </Card>

                    <Card title="Fun & Utility Commands" icon={Command} color="primary">
                        <p className="mb-4">Lightweight commands for memes, diagnostics, and server quality-of-life.</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">utility</span>
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">fun</span>
                        </div>
                    </Card>
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-400 mb-4">Want to build your own plugin?</p>
                    <Link to="/developers" className="text-[#00e5ff] hover:underline font-bold inline-flex items-center gap-2">
                        Check the For Developers page for a quick guide <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </Section>
        </div>
    );
};
