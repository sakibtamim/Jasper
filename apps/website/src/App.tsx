import React, { useState, useEffect } from 'react';
import {
  Music,
  Server,
  Cpu,
  Zap,
  Terminal,
  Layers,
  ShieldAlert,
  Database,
  Cat,
  Github,
  ArrowRight,
  Code,
  Wrench,
  Puzzle,
  AlertTriangle,
  Settings,
  Globe,
  CheckCircle,
  Copy
} from 'lucide-react';

const COLORS = {
  primary: '#ff6ad5',   // Pink
  secondary: '#00e5ff', // Cyan
  surface: '#1e293b',   // Dark Slate
  surfaceLight: '#334155',
  text: '#f8fafc',
  textDim: '#94a3b8'
};

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const Section = ({ children, className = "", id = "" }: SectionProps) => (
  <section id={id} className={`py-20 px-6 md:px-12 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

interface CardProps {
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
  color?: "primary" | "secondary";
}

const Card = ({ title, children, icon: Icon, color = "primary" }: CardProps) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl hover:border-[color:var(--highlight)] transition-all duration-300 hover:-translate-y-1 group"
    style={{ '--highlight': color === 'primary' ? COLORS.primary : COLORS.secondary } as React.CSSProperties}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-3 rounded-lg bg-slate-900 group-hover:bg-opacity-80 transition-colors`}>
        <Icon size={24} color={color === 'primary' ? COLORS.primary : COLORS.secondary} />
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <div className="text-slate-300 leading-relaxed">
      {children}
    </div>
  </div>
);

interface CodeBlockProps {
  code: string;
  label?: string;
  language?: string;
}

const CodeBlock = ({ code, label, language = "bash" }: CodeBlockProps) => (
  <div className="rounded-lg overflow-hidden bg-[#0f172a] border border-slate-700 font-mono text-sm my-4 shadow-xl group">
    {label && <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 border-b border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-2"><Terminal size={12} /> {label}</div>
      <span className="text-slate-500 uppercase text-[10px]">{language}</span>
    </div>}
    <div className="p-4 overflow-x-auto text-slate-300 relative">
      <pre>{code}</pre>
      <button className="absolute top-2 right-2 p-1.5 rounded bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600" title="Copy">
        <Copy size={12} />
      </button>
    </div>
  </div>
);

interface WorkerCatProps {
  name: string;
  role: string;
  status: string;
  delay: number;
}

const WorkerCat = ({ name, role, status, delay }: WorkerCatProps) => (
  <div className={`flex items-center gap-4 bg-slate-900/80 p-4 rounded-lg border-l-4 border-[${COLORS.secondary}] animate-fade-in-up`} style={{ animationDelay: `${delay}ms` }}>
    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
      <Cat size={24} className="text-white" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-white">{name}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'Busy' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{status}</span>
      </div>
      <p className="text-xs text-slate-400">{role}</p>
    </div>
  </div>
);

const DocTabs = () => {
  const [activeTab, setActiveTab] = useState('highlights');

  const tabs = [
    { id: 'highlights', label: 'Highlights', icon: Zap },
    { id: 'developers', label: 'Developers', icon: Code },
    { id: 'plugins', label: 'Plugin System', icon: Puzzle },
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
      case 'developers':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Settings size={20} /> Environment Configuration</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Jasper uses a strict <code>.env</code> validation process on startup.
                  Refer to <a href="https://github.com/sakibtamim/Jasper/blob/master/ENV.md" className="text-[#00e5ff] hover:underline" target="_blank" rel="noopener noreferrer">ENV.md</a> for the full list.
                </p>
                <CodeBlock
                  label=".env"
                  code={`DISCORD_TOKEN=MainBotToken
DISCORD_CLIENT_ID=123456789

# Worker Pool Configuration
MISTY_TOKEN=Worker1Token
TUKI_TOKEN=Worker2Token

# Database (SQLite default, Postgres optional)
DB_TYPE=sqlite
# DATABASE_URL=postgresql://...`}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Server size={20} /> Deployment & CI/CD</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Production ready with PM2 and GitHub Actions.
                  See <a href="https://github.com/sakibtamim/Jasper/blob/master/DEPLOY.md" className="text-[#00e5ff] hover:underline" target="_blank" rel="noopener noreferrer">DEPLOY.md</a>.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><Terminal size={14} className="text-green-400" /> <code>pnpm build</code> - Turbo-charged monorepo build</li>
                  <li className="flex items-center gap-2"><Terminal size={14} className="text-green-400" /> <code>pm2 start ecosystem.config.cjs</code> - Process management</li>
                  <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-400" /> <strong>Node v24+ Required</strong> for <code>better-sqlite3</code></li>
                </ul>
                <div className="mt-4 p-4 bg-slate-800 rounded border border-slate-700">
                  <h4 className="font-bold text-white text-sm mb-2">Monorepo Structure</h4>
                  <pre className="text-xs text-slate-400 font-mono leading-relaxed">
                    apps/
                    bot/        # The Core Controller & Audio Engine
                    web/        # React + Vite Dashboard
                    packages/
                    ui/         # Shared React Components
                    types/      # Shared TypeScript Definitions
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );
      case 'plugins':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">The Plugin Architecture</h3>
              <p className="text-slate-400">
                Jasper is an extensible platform. Plugins can add API routes, UI widgets, and database tables.
                Read the <a href="https://github.com/sakibtamim/Jasper/blob/master/PLUGINS_DEV.md" className="text-[#00e5ff] hover:underline" target="_blank" rel="noopener noreferrer">Plugin Development Guide</a>.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <CodeBlock
                label="jasper-plugin.json"
                language="json"
                code={`{
  "id": "my-cool-plugin",
  "name": "My Cool Plugin",
  "version": "1.0.0",
  "entry": "index.ts",
  "web": {
    "entry": "web/index.tsx",
    "widgets": [
      {
        "slot": "dashboard:master",
        "component": "MyWidget"
      }
    ]
  }
}`}
              />

              <div className="space-y-4">
                <h4 className="font-bold text-white border-b border-slate-700 pb-2">Reference Plugins</h4>
                <div className="space-y-3">
                  <div className="group p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer border border-transparent hover:border-[#ff6ad5]">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-white">Soundboard</strong>
                      <span className="text-[10px] bg-[#ff6ad5]/20 text-[#ff6ad5] px-2 rounded-full">Full Stack</span>
                    </div>
                    <p className="text-xs text-slate-400">Custom sound effects with web upload and mixing.</p>
                  </div>

                  <div className="group p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer border border-transparent hover:border-[#00e5ff]">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-white">Dashboard Notes</strong>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 rounded-full">CRUD</span>
                    </div>
                    <p className="text-xs text-slate-400">Simple persistent notepad for dashboard users.</p>
                  </div>

                  <div className="group p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer border border-transparent hover:border-green-400">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-white">Media Gallery</strong>
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 rounded-full">Storage API</span>
                    </div>
                    <p className="text-xs text-slate-400">Demonstrates the file storage extension API.</p>
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

export default function JasperLanding() {
  const [activeTab, setActiveTab] = useState('cat'); // 'cat' or 'system'
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-[#ff6ad5] selection:text-white overflow-x-hidden">

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-50"></div>
              <Cat className="relative z-10 text-white" size={32} />
            </div>
            <span className="text-white">JASPER</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <a href="#architecture" className="hover:text-[#00e5ff] transition-colors">Architecture</a>
            <a href="#features" className="hover:text-[#ff6ad5] transition-colors">Features</a>
            <a href="#docs" className="hover:text-[#00e5ff] transition-colors">Docs & Plugins</a>
          </div>
          <div className="flex gap-4">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 transition-colors text-sm" onClick={() => window.open('https://github.com/sakibtamim/Jasper', '_blank')}>
              <Github size={16} /> Star
            </button>
            <button className="bg-gradient-to-r from-[#ff6ad5] to-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:shadow-[0_0_20px_rgba(255,106,213,0.4)] transition-shadow">
              Add to Discord
            </button>
          </div>
        </div>
      </nav>

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
            A Distributed System <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6ad5] to-[#00e5ff]">
              Disguised as a Cat
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Jasper treats "just play some music" as a serious engineering problem, wrapping a robust controller-worker architecture in a playful, cat-themed UX.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setActiveTab('cat')}
              className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'cat' ? 'bg-[#ff6ad5] text-white shadow-lg shadow-pink-500/25 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Cat /> The Aesthetic
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'system' ? 'bg-[#00e5ff] text-slate-900 shadow-lg shadow-cyan-500/25 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Cpu /> The Architecture
            </button>
          </div>

          {/* Dynamic Hero Content based on Toggle */}
          <div className="mt-16 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 max-w-3xl mx-auto min-h-[300px] flex items-center justify-center transition-all duration-500">
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

      {/* Core Principles Grid */}
      <Section className="bg-slate-900/30 border-y border-slate-800" id="features">
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
      <Section id="architecture">
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
                  <Database className="text-blue-400" />
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

      {/* NEW: Interactive Documentation Section */}
      <Section className="bg-slate-900/50 border-t border-slate-800" id="docs">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Documentation & Ecosystem</h2>
          <p className="text-slate-400">Explore the platform, tooling, and common fixes.</p>
        </div>
        <DocTabs />
      </Section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800 text-center bg-[#0f172a]">
        <div className="flex items-center justify-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
          <Cat size={24} className="text-[#ff6ad5]" />
          <span className="font-bold text-xl tracking-tighter text-white">JASPER</span>
        </div>
        <div className="flex justify-center gap-6 mb-8 text-slate-400 text-sm">
          <a href="https://github.com/sakibtamim/Jasper/blob/master/README.md" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Documentation</a>
          <a href="https://github.com/sakibtamim/Jasper" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://github.com/sakibtamim/Jasper/blob/master/LICENSE" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">License</a>
          <a href="https://github.com/sakibtamim/Jasper" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Contributing</a>
        </div>
        <p className="text-slate-600 text-xs max-w-md mx-auto">
          Built with TypeScript, Node.js, and a lot of cat treats.
          Jasper is an open-source project designed to teach distributed system concepts through music.
        </p>
      </footer>
    </div>
  );
}
