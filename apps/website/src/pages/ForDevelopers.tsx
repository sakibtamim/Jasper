import {
    BookOpen,
    Code2,
    Cpu,
    Database,
    FolderGit2,
    Github,
    Key,
    Layers,
    Link2,
    ShieldAlert,
} from 'lucide-react';

import { CodeBlock } from '../components/CodeBlock';
import { Section } from '../components/Section';

export const ForDevelopers = () => {
    return (
        <div className="relative overflow-hidden min-h-screen text-slate-100">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-[15%] w-[550px] h-[550px] bg-[#00e5ff]/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-10 left-[10%] w-[600px] h-[600px] bg-[#ff6ad5]/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>

            <Section className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-700/80 text-xs font-mono text-[#00e5ff] mb-6 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                        <Code2 size={12} className="text-[#00e5ff]" />
                        DEVELOPER REFERENCE & SPECIFICATION
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
                        For Developers
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                        Build powerful plugins on Jasper's decoupled, sandboxed framework. Register
                        commands, intercept lifecycle hooks, and build interactive dashboards.
                    </p>
                </div>

                {/* Main Technical Topics */}
                <div className="space-y-16 max-w-5xl mx-auto">
                    {/* Topic 1: Dynamic Plugin Router */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-xl"></div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Layers className="text-[#00e5ff]" /> 1. Fastify DynamicPluginRouter
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            To isolate plugins from interfering with the main server's router,
                            Jasper compiled routes inside a custom router pipeline. The router
                            compiles string patterns containing parameters like <code>:id</code>{' '}
                            into regular expressions using the <code>compilePath</code> method,
                            mapping matches to <code>request.params</code>.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Regex Path Matching Logic:
                            </h4>
                            <CodeBlock
                                language="typescript"
                                code={`// compilePath method extracts segments and constructs regex patterns:
// Matches alphanumeric characters, dashes, and underscores
const pattern = "/playlists/:id/tracks";
const regex = /^\\/playlists\\/([a-zA-Z0-9_-]+)\\/tracks$/;

// Inside route matching loop:
const match = request.url.match(regex);
if (match) {
    request.params = { id: match[1] }; // Extracted dynamically!
}`}
                            />
                            <p className="text-xs text-slate-400 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                                When a plugin registers a route (e.g.{' '}
                                <code>context.server.get('/playlists/:id', handler)</code>), the bot
                                compiles the URL string into standard RegExp. Parameters are parsed
                                via <code>([a-zA-Z0-9_-]+)</code>, allowing clean URL configurations
                                like <code>/playlists/rock-mix-123</code>.
                            </p>
                        </div>
                    </div>

                    {/* Topic 2: Scoped Database Persistence */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff6ad5]/5 rounded-full blur-xl"></div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Database className="text-[#ff6ad5]" /> 2. Scoped Database Persistence
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            Plugins must never corrupt the core database schema or steal data from
                            other plugins. Jasper implements the <code>ScopedPluginStore</code>{' '}
                            helper class, which automatically wraps the core{' '}
                            <code>DatabaseAdapter</code> and scopes queries to the plugin's
                            namespace.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Scoped Database Adapter Wrapper:
                            </h4>
                            <CodeBlock
                                language="typescript"
                                code={`// The ScopedPluginStore dynamically namespaces DB operations
class ScopedPluginStore {
    constructor(private db: DatabaseAdapter, private pluginName: string) {}

    async get(key: string): Promise<string | null> {
        // Enforces plugin namespace isolation:
        const record = await this.db.getPluginData(this.pluginName, key);
        return record ? record.value : null;
    }

    async set(key: string, value: string): Promise<void> {
        await this.db.setPluginData(this.pluginName, key, value);
    }
}`}
                            />
                            <p className="text-xs text-slate-400 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                                This keeps plugins isolated from one another. Even if a plugin uses
                                the generic key <code>"settings"</code>, the core database stores it
                                scoped as{' '}
                                <code>{`{ plugin: "garage-band", key: "settings" }`}</code>.
                            </p>
                        </div>
                    </div>

                    {/* Topic 3: Scoped File Storage */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <FolderGit2 className="text-[#00e5ff]" /> 3. Scoped File Storage &
                            Resolution
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            Jasper provides plugins with a secure file storage pipeline. Files are
                            sandboxed inside <code>data/plugins/{'${pluginId}'}/</code>. Path
                            traversal is strictly blocked using sanitization, and storage URIs are
                            mapped to public web assets.
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Path Sanitization and Resolution:
                            </h4>
                            <CodeBlock
                                language="typescript"
                                code={`import path from 'path';

// Sanitizing local uploads to prevent path traversal hacks (../../etc/passwd)
const sanitizeFilename = (filename: string): string => {
    return path.basename(filename); // Strips directory paths
};

// Resolving custom storage URIs:
const resolveUri = (uri: string) => {
    // uri: storage://garage-band/vinyl_art.jpg
    const parts = uri.replace('storage://', '').split('/');
    const pluginId = parts[0];
    const filename = sanitizeFilename(parts[1]);

    const fsPath = path.join(process.cwd(), 'data', 'plugins', pluginId, filename);
    const webUrl = \`/api/plugins/\${pluginId}/storage/\${filename}\`;

    return { fsPath, webUrl };
};`}
                            />
                        </div>
                    </div>

                    {/* Topic 4: Fastify Ecosystem APIs */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Cpu className="text-[#ff6ad5]" /> 4. Fastify Ecosystem APIs
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            The central bot includes administrative endpoints to inspect and manage
                            plugins. Developers can use the following endpoints during development:
                        </p>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                                <span className="font-mono text-[#00e5ff] text-xs font-bold block mb-2">
                                    GET /api/plugins/registry
                                </span>
                                <p className="text-xs text-slate-400">
                                    Retrieves details for all active plugins, listing loaded
                                    versions, routes, hook registrations, and configuration
                                    statuses.
                                </p>
                            </div>
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                                <span className="font-mono text-[#00e5ff] text-xs font-bold block mb-2">
                                    POST /api/plugins/:id/storage/*
                                </span>
                                <p className="text-xs text-slate-400">
                                    Uploads or deletes files within the plugin's sandbox directory.
                                    Protects assets via core authorization middleware.
                                </p>
                            </div>
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                                <span className="font-mono text-[#00e5ff] text-xs font-bold block mb-2">
                                    POST /api/devtools/plugins/*
                                </span>
                                <p className="text-xs text-slate-400">
                                    Administrative endpoints to hot-reload plugins, toggle loaded
                                    flags, and purge sandboxed folder structures instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Topic 5: Out-of-Tree Plugin Workflows */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Link2 className="text-[#00e5ff]" /> 5. Out-of-Tree Workflows
                            (Symlinking)
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            You can develop plugins in an external repository without committing
                            code directly inside the Jasper monorepo. Use the built-in symlinking
                            tool:
                        </p>

                        <div className="space-y-4">
                            <CodeBlock
                                language="bash"
                                code={`# Link an external plugin folder into the active bot
pnpm --filter jasper-bot run plugin:link /absolute/path/to/my-external-plugin

# The framework installs symlinks and hooks:
# -> Creates symlink: apps/bot/src/plugins/my-external-plugin -> /absolute/path/to/my-external-plugin`}
                            />
                            <div className="bg-[#ff6ad5]/5 p-4 rounded-xl border border-[#ff6ad5]/20 text-xs text-slate-400 flex items-start gap-3">
                                <ShieldAlert className="text-[#ff6ad5] shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-white">Note on symlinking:</strong> The
                                    link command automatically registers the plugin inside the Vite
                                    compilation paths. Ensure that standard React elements are
                                    imported from <code>@jasper/elements</code> instead of global
                                    dependencies to avoid version conflicts.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Topic 6: Lifecycle Hooks */}
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Key className="text-[#ff6ad5]" /> 6. Lifecycle Hooks API
                        </h2>
                        <p className="text-sm text-slate-300 mb-6">
                            Interact with Jasper's core states by subscribing to standard hooks. Add
                            event listeners inside the plugin's <code>onLoad</code> block:
                        </p>

                        <div className="space-y-6">
                            <div className="border-l-4 border-[#00e5ff] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    SERVER_READY
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Fires after the Fastify server starts. Use this to bind API
                                    endpoints or initialize databases.
                                </p>
                            </div>

                            <div className="border-l-4 border-[#00e5ff] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    WORKER_ASSIGNED
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Triggered when the AFR scheduler assigns a worker token to a
                                    voice channel.
                                </p>
                            </div>

                            <div className="border-l-4 border-[#00e5ff] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    QUEUE_CREATE
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Fired when a new music playback queue is initialized for a
                                    Discord channel.
                                </p>
                            </div>

                            <div className="border-l-4 border-[#ff6ad5] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    PRE_MUSIC_PLAY
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Runs immediately before audio streaming starts. Allows plugins
                                    to override paths, inject tracks, or play sound overlays.
                                </p>
                            </div>

                            <div className="border-l-4 border-[#ff6ad5] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    POST_MUSIC_PLAY
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Fires when a song completes playback or is skipped. Perfect for
                                    updating listening stats.
                                </p>
                            </div>

                            <div className="border-l-4 border-[#ff6ad5] pl-4">
                                <h4 className="font-mono text-sm text-white font-bold">
                                    VOICE_STATE_UPDATE
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Listens to Discord gateway user actions, like joining/leaving
                                    voice connections or muting states.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Git Submodule Info */}
                <div className="mt-20 text-center relative z-10 max-w-3xl mx-auto">
                    <div className="p-8 glass-panel border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center">
                        <BookOpen size={40} className="text-[#00e5ff] mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Comprehensive Plugin Dev Guide
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 max-w-xl">
                            Read the complete markdown specification in the repository for more code
                            structures, directory details, and frontend dashboard registrations.
                        </p>
                        <a
                            href="https://github.com/sakibtamim/Jasper/blob/master/PLUGINS_DEV.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-[#ff6ad5] hover:bg-pink-600 text-white transition-all shadow-lg shadow-pink-500/20 text-sm"
                        >
                            <Github size={18} /> View PLUGINS_DEV.md on GitHub
                        </a>
                    </div>
                </div>
            </Section>
        </div>
    );
};
