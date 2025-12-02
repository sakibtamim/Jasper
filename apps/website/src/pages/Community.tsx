import { Section } from '../components/Section';
import { Github, MessageCircle, Star, GitPullRequest } from 'lucide-react';

export const Community = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

            <Section className="relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#00e5ff] mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
                        JOIN US
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Community</h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Join the Orbit
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-12 text-center text-slate-300">
                    <p className="text-lg">
                        Jasper lives best when it’s part of a community. Whether you’re a server admin, a developer, or just someone who loves music bots, you’re welcome here.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-xl hover:bg-slate-800 transition-all hover:-translate-y-1 text-center group">
                        <div className="inline-flex p-4 rounded-full bg-slate-900 mb-6 group-hover:scale-110 transition-transform">
                            <Github size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Get Involved</h3>
                        <ul className="text-slate-400 space-y-3 mb-8 text-left max-w-xs mx-auto">
                            <li className="flex items-center gap-3">
                                <Star size={16} className="text-yellow-400" /> Star the GitHub repo
                            </li>
                            <li className="flex items-center gap-3">
                                <GitPullRequest size={16} className="text-green-400" /> Open issues & PRs
                            </li>
                            <li className="flex items-center gap-3">
                                <MessageCircle size={16} className="text-blue-400" /> Share plugin ideas
                            </li>
                        </ul>
                        <a
                            href="https://github.com/sakibtamim/Jasper"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                        >
                            Go to GitHub
                        </a>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-xl hover:bg-slate-800 transition-all hover:-translate-y-1 text-center group">
                        <div className="inline-flex p-4 rounded-full bg-slate-900 mb-6 group-hover:scale-110 transition-transform">
                            <MessageCircle size={32} className="text-[#5865F2]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Contributing</h3>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            Check the <code>CONTRIBUTING.md</code> (if present) or open a PR with small, focused changes. Even doc fixes are valuable.
                        </p>
                        <a
                            href="https://discord.gg/3B8fPPETKY"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-8 py-3 rounded-full bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-colors shadow-lg shadow-[#5865F2]/20"
                        >
                            Join Discord
                        </a>
                    </div>
                </div>
            </Section>
        </div>
    );
};
