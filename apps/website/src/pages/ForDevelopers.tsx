import { Section } from "../components/Section";
import { CodeBlock } from "../components/CodeBlock";
import { Terminal, BookOpen, Github } from "lucide-react";

export const ForDevelopers = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      <Section className="relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-[#00e5ff] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
            BUILDER MODE
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            For Developers
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Build on Jasper
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-slate-800/30 p-8 rounded-xl border border-slate-700 backdrop-blur-sm">
            <p className="text-lg text-slate-300 leading-relaxed">
              Jasper is not just a bot; it’s a small framework for building
              Discord bot plugins. If you’re comfortable with
              TypeScript/JavaScript and Node.js, you can ship your first plugin
              in an evening.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Terminal className="text-[#ff6ad5]" /> Quickstart
            </h2>
            <CodeBlock
              language="bash"
              code={`# Clone the repo
git clone https://github.com/sakibtamim/Jasper.git
cd Jasper

# Install dependencies
yarn install

# Start the development bot / dashboard
yarn dev`}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BookOpen className="text-[#00e5ff]" /> Create Your First Plugin
            </h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <ol className="list-decimal list-inside space-y-4 text-slate-300 relative z-10">
                <li className="pl-2">
                  Create a new folder under{" "}
                  <code>src/plugins/your-plugin-name</code>.
                </li>
                <li className="pl-2">
                  Add a plugin entry file (e.g. <code>index.ts</code>) that
                  exports the expected plugin interface.
                </li>
                <li className="pl-2">
                  Register commands, hooks, and any web routes you need.
                </li>
                <li className="pl-2">
                  Restart Jasper — the plugin should be discovered
                  automatically.
                </li>
              </ol>
            </div>
            <div className="mt-6 flex gap-4">
              <a
                href="https://github.com/sakibtamim/Jasper/blob/master/PLUGINS_DEV.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm font-medium border border-slate-700"
              >
                <Github size={16} /> Read PLUGIN_DEV.md
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">FAQ</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                <h3 className="font-bold text-[#ff6ad5] mb-2">Why plugins?</h3>
                <p className="text-slate-400 text-sm">
                  To keep the core stable and safe, while letting
                  experimentation happen at the edges.
                </p>
              </div>
              <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                <h3 className="font-bold text-[#00e5ff] mb-2">
                  What stack does Jasper use?
                </h3>
                <p className="text-slate-400 text-sm">
                  Node.js, TypeScript/JavaScript, Fastify for APIs, and a
                  worker-based architecture for music playback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};
