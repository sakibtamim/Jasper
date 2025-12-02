import { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle, ArrowRight, Wrench, Settings, Globe, Mic, Terminal, Command } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

export const DocTabs = () => {
    const [activeTab, setActiveTab] = useState('highlights');

    const tabs = [
        { id: 'highlights', label: 'Highlights', icon: Zap },
        { id: 'soundboard', label: 'Soundboard', icon: Mic },
        { id: 'getting-started', label: 'Getting Started', icon: Terminal },
        { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'highlights':
                return (
                    <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-white">Core Capabilities</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="mt-1"><CheckCircle size={20} className="text-[#ff6ad5]" /></div>
                                    <div>
                                        <strong className="text-white block">High-Fidelity Audio Pipeline</strong>
                                        <p className="text-slate-400 text-sm">Built on <code>@discordjs/voice</code> and <code>yt-dlp</code>. Supports high-res audio extraction and smooth packet handling.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1"><CheckCircle size={20} className="text-[#ff6ad5]" /></div>
                                    <div>
                                        <strong className="text-white block">Full-Stack Dashboard</strong>
                                        <p className="text-slate-400 text-sm">Manage queues, upload files, and configure bots from a React + Vite web interface. No commands needed.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1"><CheckCircle size={20} className="text-[#ff6ad5]" /></div>
                                    <div>
                                        <strong className="text-white block">Automatic Feline Rotation (AFR)</strong>
                                        <p className="text-slate-400 text-sm">Smart load balancing that distributes playback tasks across a pool of "Cat Workers" (bot tokens).</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Globe size={16} /> Web Dashboard Preview</h4>
                            <div className="space-y-3">
                                <div className="bg-slate-800 p-3 rounded flex justify-between items-center">
                                    <span className="text-sm text-slate-300">Current Queue</span>
                                    <span className="text-xs bg-[#ff6ad5] text-white px-2 py-0.5 rounded">Playing</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full w-2/3 bg-gradient-to-r from-[#ff6ad5] to-[#00e5ff]"></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 font-mono">
                                    <span>2:14</span>
                                    <span>3:45</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-slate-800 rounded animate-pulse opacity-50"></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'soundboard':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-4">Soundboard System</h3>
                                <p className="text-slate-400 mb-6">
                                    A full-stack plugin that adds a customizable soundboard. Users can upload sounds via the dashboard and play them in voice channels.
                                </p>
                                <div className="space-y-4">
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                        <h4 className="font-bold text-[#ff6ad5] mb-2 flex items-center gap-2"><Command size={16} /> Key Commands</h4>
                                        <ul className="space-y-2 text-sm text-slate-300">
                                            <li><code className="bg-slate-900 px-1 rounded">/soundboard menu</code> - Open ephemeral selection menu</li>
                                            <li><code className="bg-slate-900 px-1 rounded">/soundboard play</code> - Play specific sound</li>
                                            <li><code className="bg-slate-900 px-1 rounded">/soundboard ui</code> - Create permanent button panel</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                        <h4 className="font-bold text-[#00e5ff] mb-2 flex items-center gap-2"><Settings size={16} /> Smart Features</h4>
                                        <ul className="space-y-2 text-sm text-slate-300">
                                            <li>• <strong>Concurrency:</strong> Queues sounds sequentially if multiple users spam buttons.</li>
                                            <li>• <strong>Mixing:</strong> Pauses music, plays sound, then resumes music automatically.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 flex flex-col justify-center items-center text-center">
                                <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-xs">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="aspect-square bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:border-[#ff6ad5] transition-all cursor-pointer group">
                                            <Mic size={20} className="text-slate-500 group-hover:text-[#ff6ad5]" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-slate-500 text-sm">Interactive UI Mockup</p>
                            </div>
                        </div>
                    </div>
                );
            case 'getting-started':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Quick Setup</h3>
                                    <p className="text-slate-400 text-sm mb-4">Prerequisites: Node.js v18+, FFmpeg, yt-dlp</p>
                                    <CodeBlock language="bash" code={`# 1. Clone
git clone https://github.com/sakibtamim/Jasper.git

# 2. Install
pnpm install

# 3. Configure
cp .env.example .env
# Edit .env with your tokens

# 4. Run
pnpm dev`} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-white mb-2">Tech Stack</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <strong className="text-[#ff6ad5] block mb-1">Runtime</strong>
                                        <span className="text-slate-300 text-sm">Node.js v18+</span>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <strong className="text-[#00e5ff] block mb-1">Language</strong>
                                        <span className="text-slate-300 text-sm">TypeScript (Strict)</span>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <strong className="text-green-400 block mb-1">Framework</strong>
                                        <span className="text-slate-300 text-sm">discord.js v14</span>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <strong className="text-yellow-400 block mb-1">Frontend</strong>
                                        <span className="text-slate-300 text-sm">React 18 + Vite</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'troubleshooting':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl">
                                <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                                    <AlertTriangle /> Common: YouTube Blocking
                                </h3>
                                <p className="text-slate-300 text-sm mb-4">
                                    If you see <code>Sign in to confirm you’re not a bot</code>, YouTube is rate-limiting your IP.
                                </p>
                                <div className="bg-black/40 p-4 rounded text-sm text-slate-400 space-y-2">
                                    <p><strong className="text-white">Fix:</strong> Use the Cookie Manager.</p>
                                    <ol className="list-decimal list-inside space-y-1 ml-1">
                                        <li>Export <code>cookies.txt</code> (Netscape format) from your browser.</li>
                                        <li>Go to Jasper Dashboard → DevTools → Cookies.</li>
                                        <li>Paste and save. Jasper will rotate them automatically.</li>
                                    </ol>
                                    <div className="pt-2">
                                        <a href="https://github.com/sakibtamim/Jasper/blob/master/YT-DLP_TROUBLESHOOTING.md" className="text-red-400 hover:underline text-xs flex items-center gap-1" target="_blank" rel="noopener noreferrer">Read YT-DLP_TROUBLESHOOTING.md <ArrowRight size={10} /></a>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Wrench size={18} /> Node Version Mismatch</h3>
                                    <p className="text-slate-400 text-sm">
                                        <code>ERR_DLOPEN_FAILED</code> usually means the bot was built with a different Node version than it's running on.
                                    </p>
                                    <CodeBlock label="Fix" code="pnpm rebuild" />
                                </div>

                                <div>
                                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Settings size={18} /> Database Config</h3>
                                    <p className="text-slate-400 text-sm">
                                        Ensure <code>DATABASE_URL</code> is set if using Postgres. For SQLite, no config is needed (it creates <code>data/jasper.db</code>).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-wrap border-b border-slate-700 mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${activeTab === tab.id
                            ? 'text-[#ff6ad5]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff6ad5] to-[#00e5ff]" />
                        )}
                    </button>
                ))}
            </div>
            <div className="min-h-[300px]">
                {renderContent()}
            </div>
        </div>
    );
};
