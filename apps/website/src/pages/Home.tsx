import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
    ArrowRight,
    Cat,
    Cpu,
    Layers,
    Music,
    RefreshCw,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Terminal,
    Zap,
} from 'lucide-react';

import { Card } from '../components/Card';
import { DocTabs } from '../components/DocTabs';
import { Section } from '../components/Section';

export const Home = () => {
    const [afrSimulationStep, setAfrSimulationStep] = useState(0);

    const simulationSteps = [
        {
            title: '1. User Command Initiated',
            details: "User in Voice Channel '#gaming' runs '/play lo-fi'",
            code: 'CMD: /play\nGUILD: 9876543210\nCHANNEL: #gaming (123456)',
        },
        {
            title: '2. Sticky Connection Check',
            details: "AFR checks if any bot is already active in '#gaming'",
            code: 'CHECK: Active voice connections for Channel 123456\nRESULT: None (Fresh connection needed)',
        },
        {
            title: '3. Controller Weight Roll',
            details:
                'Checking Jasper (Controller) availability and rolling weight (JASPER_WEIGHT: 0.5)',
            code: 'ROLL: 0.73 vs 0.50\nRESULT: Weight roll exceeded. Allocating worker token to preserve controller resources.',
        },
        {
            title: '4. Worker Pool Dispatch',
            details: 'AFR selects an idle Worker Bot from the pool',
            code: 'POOL STATUS: Misty (Busy), Tuki (Idle), Jafreen (Idle)\nSELECTION: Tuki allocated and dispatched to Voice Channel 123456',
        },
        {
            title: '5. Playback Pipeline Initiated',
            details: 'Tuki joins the channel and spawns the yt-dlp audio stream',
            code: 'SPAWN: yt-dlp --format bestaudio -o - [URL]\nSTREAM: PassThrough -> Discord Gateway Voice Connection (Tuki)',
        },
    ];

    const advanceSimulation = () => {
        setAfrSimulationStep((prev) => (prev + 1) % simulationSteps.length);
    };

    return (
        <div className="relative overflow-hidden min-h-screen text-slate-100">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#ff6ad5]/15 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
            <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#00e5ff]/15 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none"></div>

            {/* Hero Section */}
            <section className="relative pt-36 pb-24 px-6 flex items-center justify-center">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-[#00e5ff] mb-8 animate-fade-in shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff] animate-ping"></span>
                        SYSTEM ONLINE: v2.4.0 Production Swarm
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-8 leading-none">
                        Jasper — The <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6ad5] via-purple-400 to-[#00e5ff] drop-shadow-[0_2px_10px_rgba(255,106,213,0.15)]">
                            Multi-Bot Swarm
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
                        The world's first{' '}
                        <span className="text-white font-semibold">
                            Automatic Feline Rotation (AFR)
                        </span>{' '}
                        Discord music engine. Powered by a collaborative swarm of worker bots to
                        bypass limits and deliver flawless 24/7 audio.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-16">
                        <button
                            onClick={() =>
                                window.open('https://github.com/sakibtamim/Jasper', '_blank')
                            }
                            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-[#ff6ad5] to-[#aa4bcf] text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 border border-pink-400/20"
                        >
                            View Repository <ArrowRight size={18} />
                        </button>
                        <Link
                            to="/plugins"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700/80 hover:border-slate-500/80 transition-all duration-300 backdrop-blur-sm flex items-center justify-center gap-2"
                        >
                            Explore Plugin Ecosystem
                        </Link>
                    </div>

                    {/* Premium Intro Section */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-left max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-2xl"></div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldCheck className="text-[#ff6ad5]" /> Built for Resilient Discord
                            Communities
                        </h2>
                        <p className="text-slate-300 mb-4 leading-relaxed">
                            Traditional single-token music bots crumble under high concurrency, rate
                            limits, and YouTube's shifting architecture. Jasper changes the game.
                            Created by <strong>Purrfect Software Limited</strong>, Jasper decouples
                            bot commands from media delivery.
                        </p>
                        <p className="text-slate-400 text-sm">
                            When users issue commands, they talk to the Controller (Jasper). But
                            when they listen, they are served by the{' '}
                            <span className="text-[#00e5ff]">Heavenly Council of Fur</span>—a
                            dynamically balanced worker bot pool.
                        </p>
                    </div>
                </div>
            </section>

            {/* Automated Feline Rotation & Worker Pool Mockup */}
            <Section
                className="py-20 relative bg-slate-950/40 border-y border-slate-900"
                id="afr-showcase"
            >
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                            Automatic Feline Rotation (AFR)
                        </h2>
                        <p className="text-slate-400 max-w-3xl mx-auto text-lg">
                            An architectural breakdown of the weighted selection engine that
                            dynamically manages voice connections across separate bot clients.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-stretch">
                        {/* Simulation controls */}
                        <div className="lg:col-span-5 flex flex-col justify-between glass-panel p-8 rounded-2xl border border-slate-800">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-xs uppercase font-mono tracking-wider text-[#00e5ff] bg-[#00e5ff]/10 px-3 py-1 rounded-full">
                                        Interactive AFR Trace
                                    </span>
                                    <button
                                        onClick={advanceSimulation}
                                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
                                        title="Next Step"
                                    >
                                        <RefreshCw size={16} className="animate-spin-slow" />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    How AFR Allocates Workers
                                </h3>
                                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                                    Click through the steps below to see how a Discord slash command
                                    is processed, evaluated by the selection algorithm, and
                                    delegated to a dedicated worker.
                                </p>

                                <div className="space-y-3">
                                    {simulationSteps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setAfrSimulationStep(idx)}
                                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-300 ${afrSimulationStep === idx ? 'bg-[#ff6ad5]/10 border-[#ff6ad5]/50 shadow-[0_0_15px_rgba(255,106,213,0.1)]' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <h4
                                                className={`text-sm font-bold ${afrSimulationStep === idx ? 'text-[#ff6ad5]' : 'text-slate-300'}`}
                                            >
                                                {step.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {step.details}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500">
                                Tip: AFR ensures that Jasper doesn't get rate-limited by shifting
                                voice connections to specific client instances.
                            </div>
                        </div>

                        {/* Interactive Console and Visual Swarm Graph */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            {/* Graphic Visual Representation */}
                            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex-1 flex flex-col justify-between">
                                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
                                    Active Worker Swarm Topology
                                </h4>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-auto py-6">
                                    {/* Controller bot */}
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-slate-900/80 border border-slate-800 transition-all relative">
                                        <div
                                            className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500`}
                                        ></div>
                                        <div className="p-3 rounded-full bg-[#ff6ad5]/15 text-[#ff6ad5] mb-3">
                                            <Settings size={24} />
                                        </div>
                                        <span className="font-bold text-xs text-white text-center">
                                            Jasper (Controller)
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1">
                                            Status: Listening
                                        </span>
                                    </div>

                                    {/* Worker 1 */}
                                    <div
                                        className={`flex flex-col items-center p-4 rounded-xl bg-slate-900/80 border transition-all duration-500 relative ${afrSimulationStep === 3 ? 'border-[#00e5ff]/30' : 'border-slate-800'}`}
                                    >
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        <div className="p-3 rounded-full bg-slate-800/80 text-[#00e5ff] mb-3">
                                            <Cat size={24} />
                                        </div>
                                        <span className="font-bold text-xs text-white">Misty</span>
                                        <span className="text-[10px] text-red-400 mt-1">
                                            Playing in #chill
                                        </span>
                                    </div>

                                    {/* Worker 2 */}
                                    <div
                                        className={`flex flex-col items-center p-4 rounded-xl bg-slate-900/80 border transition-all duration-500 relative ${afrSimulationStep === 3 ? 'border-[#ff6ad5] shadow-[0_0_15px_rgba(255,106,213,0.2)] bg-slate-950 scale-105' : 'border-slate-800'}`}
                                    >
                                        <div
                                            className={`absolute top-2 right-2 w-2 h-2 rounded-full ${afrSimulationStep >= 3 ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}
                                        ></div>
                                        <div
                                            className={`p-3 rounded-full mb-3 ${afrSimulationStep >= 3 ? 'bg-[#ff6ad5]/15 text-[#ff6ad5]' : 'bg-slate-800 text-slate-400'}`}
                                        >
                                            <Cat size={24} />
                                        </div>
                                        <span className="font-bold text-xs text-white">Tuki</span>
                                        <span
                                            className={`text-[10px] mt-1 ${afrSimulationStep >= 3 ? 'text-red-400' : 'text-green-400'}`}
                                        >
                                            {afrSimulationStep >= 3 ? 'Playing in #gaming' : 'Idle'}
                                        </span>
                                    </div>

                                    {/* Worker 3 */}
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-slate-900/80 border border-slate-800 transition-all relative">
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400"></div>
                                        <div className="p-3 rounded-full bg-slate-800 text-slate-400 mb-3">
                                            <Cat size={24} />
                                        </div>
                                        <span className="font-bold text-xs text-white">
                                            Jafreen
                                        </span>
                                        <span className="text-[10px] text-green-400 mt-1">
                                            Idle
                                        </span>
                                    </div>
                                </div>

                                {/* Flow path indicator */}
                                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800/80 text-xs flex justify-between items-center text-slate-400">
                                    <span>Incoming Req</span>
                                    <span className="text-[#ff6ad5]">→</span>
                                    <span>Jasper Controller</span>
                                    <span className="text-[#ff6ad5]">→</span>
                                    <span className="text-[#00e5ff] font-bold">AFR Router</span>
                                    <span className="text-[#ff6ad5]">→</span>
                                    <span className="text-white font-mono">
                                        {afrSimulationStep >= 3 ? 'Tuki (Allocated)' : 'Idle Pool'}
                                    </span>
                                </div>
                            </div>

                            {/* Console Trace block */}
                            <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                                    </div>
                                    <span className="text-xs font-mono text-[#00e5ff] font-bold">
                                        AFR_SCHEDULER_DAEMON
                                    </span>
                                </div>
                                <div className="p-6 font-mono text-sm text-slate-300 min-h-[140px] flex flex-col justify-between">
                                    <pre className="text-slate-400 text-xs overflow-x-auto whitespace-pre-wrap">
                                        {simulationSteps[afrSimulationStep].code}
                                    </pre>
                                    <div className="mt-4 pt-3 border-t border-slate-900 text-right text-xs text-[#ff6ad5]">
                                        Active Step: {afrSimulationStep + 1} of{' '}
                                        {simulationSteps.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* The Heavenly Council of Fur Profiles */}
            <Section className="py-24" id="feline-council">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <div className="inline-block px-3 py-1 rounded-full bg-[#ff6ad5]/10 text-[#ff6ad5] text-xs font-bold uppercase tracking-wider mb-4 border border-[#ff6ad5]/20">
                            The Guardians of Sound
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-4">
                            Heavenly Council of Fur
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            Meet the specialized feline bot identities that make up our automatic
                            rotation pool.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Jasper Card */}
                        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:-translate-y-2 transition-all duration-300 glow-pink-hover relative group flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff6ad5] to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                                        <Cat size={32} className="text-white" />
                                    </div>
                                    <span
                                        className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-green-500 border-2 border-slate-900"
                                        title="Online"
                                    ></span>
                                </div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-[#ff6ad5] transition-colors">
                                    Jasper
                                </h3>
                                <p className="text-xs font-mono text-[#ff6ad5] uppercase tracking-wider mt-1 mb-4">
                                    Council President
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    The core controller and central nervous system. Jasper listens
                                    to all guild interactions, manages OAuth dashboard sessions, and
                                    schedules audio pipelines using AFR selection weight.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
                                <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2.5 py-1 rounded-md border border-slate-800">
                                    API ROUTER
                                </span>
                                <span className="text-[10px] font-mono bg-pink-500/10 text-[#ff6ad5] px-2.5 py-1 rounded-md border border-[#ff6ad5]/20">
                                    CONTROLLER
                                </span>
                            </div>
                        </div>

                        {/* Misty Card */}
                        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:-translate-y-2 transition-all duration-300 glow-cyan-hover relative group flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                        <Cat size={32} className="text-white" />
                                    </div>
                                    <span
                                        className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-red-500 border-2 border-slate-900"
                                        title="Busy (Playing)"
                                    ></span>
                                </div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                                    Misty
                                </h3>
                                <p className="text-xs font-mono text-[#00e5ff] uppercase tracking-wider mt-1 mb-4">
                                    Worker Elite #1
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Specialist voice streaming client. Designed to bind to active
                                    gaming channels. Built to scale high-bandwidth audio processes
                                    using a dedicated system client instance.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
                                <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2.5 py-1 rounded-md border border-slate-800">
                                    VOICE NODE
                                </span>
                                <span className="text-[10px] font-mono bg-cyan-500/10 text-[#00e5ff] px-2.5 py-1 rounded-md border border-[#00e5ff]/20">
                                    ACTIVE
                                </span>
                            </div>
                        </div>

                        {/* Tuki Card */}
                        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:-translate-y-2 transition-all duration-300 glow-cyan-hover relative group flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
                                        <Cat size={32} className="text-white" />
                                    </div>
                                    <span
                                        className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-green-400 border-2 border-slate-900"
                                        title="Idle (Ready)"
                                    ></span>
                                </div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                                    Tuki
                                </h3>
                                <p className="text-xs font-mono text-[#00e5ff] uppercase tracking-wider mt-1 mb-4">
                                    Worker Elite #2
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    The standby vanguard worker. Handles sudden load spikes when
                                    Misty is locked to a long-running audio queue. Instantly boots
                                    child pipelines for clean playback.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
                                <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2.5 py-1 rounded-md border border-slate-800">
                                    VOICE NODE
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    IDLE READY
                                </span>
                            </div>
                        </div>

                        {/* Jafreen Card */}
                        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:-translate-y-2 transition-all duration-300 glow-cyan-hover relative group flex flex-col justify-between min-h-[380px]">
                            <div>
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-800 flex items-center justify-center">
                                        <Cat size={32} className="text-white" />
                                    </div>
                                    <span
                                        className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-green-400 border-2 border-slate-900"
                                        title="Idle (Ready)"
                                    ></span>
                                </div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                                    Jafreen
                                </h3>
                                <p className="text-xs font-mono text-[#00e5ff] uppercase tracking-wider mt-1 mb-4">
                                    Worker Elite #3
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Multi-channel backup client. Provides high resilience, operating
                                    as a third-layer backup to ensure queue requests are processed
                                    even in massive, multi-channel guilds.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
                                <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2.5 py-1 rounded-md border border-slate-800">
                                    VOICE NODE
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    IDLE READY
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Key Features */}
            <Section className="bg-slate-900/30 border-y border-slate-900 py-20" id="features">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                            Core Ecosystem Advantages
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            Everything you need to orchestrate stateful audio.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card title="High-Quality Music" icon={Music} color="primary">
                            Lossless, uninterrupted playback via native worker stream binding.
                            Support for queues, autoplay, loop modes, and detailed track metadata
                            extraction.
                        </Card>

                        <Card title="Plugin-First Design" icon={Layers} color="secondary">
                            Strict decoupled architecture. Drop custom plugins into{' '}
                            <code>apps/bot/src/plugins</code> using modular manifest definitions,
                            API routes, and frontend dashboard components.
                        </Card>

                        <Card title="Aggressive Metrics" icon={Zap} color="primary">
                            In-depth tracking of active listeners, top songs, system load, and
                            memory allocation. Exposes static and WebSocket API endpoints for
                            real-time leaderboards.
                        </Card>

                        <Card title="AI-Native Architecture" icon={Cpu} color="secondary">
                            Shaped from day one by collaborative AI engineering. Completely clean,
                            strongly typed codebase running under TypeScript strict mode.
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Design Principles */}
            <Section className="py-24" id="principles">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                            Engineering Principles
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            Decoupled, resilient, and built to survive production reality.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card title="Outsource the Fragile" icon={ShieldAlert} color="secondary">
                            We don't reverse-engineer YouTube or direct stream layers. Jasper
                            delegates extraction to a system-installed{' '}
                            <code className="text-[#00e5ff] bg-slate-950 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                                yt-dlp
                            </code>{' '}
                            binary running as a managed child process. When streaming layers break,
                            update the binary, not your code.
                        </Card>

                        <Card title="AFR Scheduling Policy" icon={Layers} color="primary">
                            Automatic Feline Rotation treats Discord voice connections as a
                            constraint scheduling problem. Uses configurable weighted choice metrics
                            to distribute traffic, preventing ratelimit shutdowns.
                        </Card>

                        <Card title="Self-Healing Commands" icon={Terminal} color="secondary">
                            Real networks experience state drift. Jasper provides emergency
                            operations like{' '}
                            <code className="text-red-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                                /catastrophic-reset
                            </code>{' '}
                            to wipe active guild states and reclaim memory leaks without needing SSH
                            box access.
                        </Card>
                    </div>
                </div>
            </Section>

            {/* Technical Quick Reference */}
            <Section className="bg-slate-950/60 border-t border-slate-900 py-20" id="docs">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                            Quick Start & Documentation
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Get up and running with commands, configuration, and diagnostics.
                        </p>
                    </div>
                    <div className="max-w-4xl mx-auto">
                        <DocTabs />
                    </div>
                </div>
            </Section>
        </div>
    );
};
