import { BarChart2, Mic, Music, Pause, Play, SkipForward } from 'lucide-react';

import { Card } from '../components/Card';
import { Section } from '../components/Section';

export const Showcase = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-pink-900/20 to-transparent pointer-events-none" />

            <Section className="relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#ff6ad5] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#ff6ad5] animate-pulse"></span>
                        LIVE DEMO
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Showcase</h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">Jasper in Action</p>
                </div>

                <div className="max-w-3xl mx-auto mb-16 text-slate-300 leading-relaxed text-center bg-slate-800/30 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <p>
                        A few examples of what Jasper can do today. In the future, this page can
                        host real screenshots, GIFs, or short clips.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <Card title="Music Playback" icon={Music} color="primary">
                        <div className="space-y-3 mt-2">
                            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                <Play size={14} className="text-green-400" />
                                <code className="text-xs text-slate-300">/play lofi hip hop</code>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                <SkipForward size={14} className="text-blue-400" />
                                <code className="text-xs text-slate-300">/skip</code>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                <Pause size={14} className="text-yellow-400" />
                                <code className="text-xs text-slate-300">/pause</code>
                            </div>
                        </div>
                    </Card>

                    <Card title="Stats Dashboard" icon={BarChart2} color="secondary">
                        <p className="mb-4 text-sm text-slate-300">
                            Jasper exposes a rich stats API. Visualize your server's listening
                            habits.
                        </p>
                        <div className="space-y-2">
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full w-[80%] bg-[#00e5ff]"></div>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full w-[60%] bg-[#ff6ad5]"></div>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full w-[40%] bg-purple-500"></div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Soundboard (coming soon)" icon={Mic} color="primary">
                        <p className="text-sm text-slate-300 mb-4">
                            A custom soundboard experience where Jasper handles voice connections,
                            playback, and chaos.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-square bg-slate-900 rounded border border-slate-700 flex items-center justify-center hover:border-[#ff6ad5] transition-colors cursor-pointer"
                                >
                                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="mt-16 text-center p-8 border border-dashed border-slate-700 rounded-xl text-slate-500 bg-slate-900/20">
                    <p>
                        This page is intentionally simple for now. Once visual assets are ready,
                        they can be dropped in as cards or embeds.
                    </p>
                </div>
            </Section>
        </div>
    );
};
