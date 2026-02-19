import { Command, Database, Globe, Layers, Server, Zap } from 'lucide-react';

import { CodeBlock } from '../components/CodeBlock';
import { Section } from '../components/Section';

export const Architecture = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />

            <Section className="relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#00e5ff] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
                        SYSTEM INTERNALS
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Architecture</h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">Under the Hood</p>
                </div>

                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="bg-slate-800/30 p-8 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Jasper is designed to be understandable, debuggable, and extendable.
                            This page gives you a high-level view of how the pieces fit together.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Layers className="text-[#ff6ad5]" /> Core Components
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                {
                                    icon: Command,
                                    label: 'Jasper Core',
                                    desc: 'Discord client, command handling, and lifecycle management.',
                                },
                                {
                                    icon: Layers,
                                    label: 'Plugin Manager',
                                    desc: 'Discovers and loads plugins from src/plugins.',
                                },
                                {
                                    icon: Zap,
                                    label: 'Hook System',
                                    desc: 'Allows plugins to tap into events without modifying the core.',
                                },
                                {
                                    icon: Server,
                                    label: 'Workers',
                                    desc: 'Handle music playback and other long-running tasks.',
                                },
                                {
                                    icon: Globe,
                                    label: 'Web Dashboard',
                                    desc: 'A simple UI for inspecting queues, stats, and configuration.',
                                },
                                {
                                    icon: Database,
                                    label: 'Database Layer',
                                    desc: 'Adapters for SQLite and PostgreSQL, sitting behind a clean abstraction.',
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-[#00e5ff]/50 transition-colors"
                                >
                                    <div className="mt-1 p-2 bg-slate-900 rounded-lg h-fit">
                                        <item.icon size={20} className="text-[#00e5ff]" />
                                    </div>
                                    <div>
                                        <strong className="text-white block mb-1">
                                            {item.label}
                                        </strong>
                                        <p className="text-slate-400 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">System Diagram</h2>
                        <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-1 shadow-2xl">
                            <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 border-b border-slate-700 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                <span className="ml-2">architecture.mermaid</span>
                            </div>
                            <CodeBlock
                                language="mermaid"
                                code={`graph TD
  A[Discord Client] --> B[Command Handler]
  B --> C[Plugin Manager]
  C --> D[Plugins]
  B --> E[Worker Manager]
  E --> F[Workers]
  F --> G[Music Playback]
  B --> H[API Server]
  H --> I[Web Dashboard]
  H --> J[Database Adapter]
  J --> K[(SQLite / Postgres)]`}
                            />
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
