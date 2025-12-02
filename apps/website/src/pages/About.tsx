import { Section } from '../components/Section';
import { Card } from '../components/Card';
import { Heart, Terminal, Cpu, Smile, Cat } from 'lucide-react';

export const About = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

            <Section className="relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#ff6ad5] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#ff6ad5] animate-pulse"></span>
                        PHILOSOPHY
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About Jasper</h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Built by Humans, Cats, and AI
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-16 text-slate-300 leading-relaxed bg-slate-800/30 p-8 rounded-xl border border-slate-700 backdrop-blur-sm text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="p-4 bg-[#ff6ad5]/10 rounded-full">
                            <Cat size={48} className="text-[#ff6ad5]" />
                        </div>
                    </div>
                    <p className="mb-4 text-lg">
                        Jasper is a project by Purrfect Software Limited, part of the wider Purrfect Universe. It sits at the intersection of engineering, playfulness, and AI-assisted development.
                    </p>
                    <p>
                        The goal is simple: build tools that feel good to use, are honest about how they’re made, and stay friendly to contributors.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card title="Plugin-First" icon={Terminal} color="primary">
                        Keep the core small and stable, let plugins carry experiments and features.
                    </Card>

                    <Card title="Transparent Architecture" icon={Cpu} color="secondary">
                        No black boxes. If something breaks, it should be debuggable by a reasonably curious engineer.
                    </Card>

                    <Card title="AI as a Colleague" icon={Smile} color="secondary">
                        Jasper is actively shaped by AI agents (for scaffolding, refactoring, docs) with human oversight.
                    </Card>

                    <Card title="Fun Is a Feature" icon={Heart} color="primary">
                        We believe tools can be serious and still have personality. The Heavenly Council of Fur insists on it.
                    </Card>
                </div>
            </Section>
        </div>
    );
};
