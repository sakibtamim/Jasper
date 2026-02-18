import { Section } from "../components/Section";
import { GitCommit, Calendar } from "lucide-react";

export const Changelog = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-slate-800/50 to-transparent pointer-events-none" />

      <Section className="relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
            HISTORY
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Changelog
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            How Jasper Evolves
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-slate-300 mb-8 text-center bg-slate-800/30 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
            <p>
              Jasper is under active development. This page summarizes notable
              changes over time.
            </p>
          </div>

          <div className="relative border-l-2 border-slate-800 pl-8 space-y-16 ml-4 md:ml-0">
            {/* Entry 1 */}
            <div className="relative group">
              <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#ff6ad5] border-4 border-[#0f172a] shadow-[0_0_10px_rgba(255,106,213,0.5)]"></div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-[#ff6ad5] transition-colors">
                  v0.3.0 — Plugin System & Stats
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-400 border border-slate-700">
                  <Calendar size={12} /> 2025-11-28
                </span>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-[#ff6ad5]/30 transition-colors">
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-[#ff6ad5] mt-1 shrink-0"
                      size={18}
                    />
                    <span>Introduced the plugin manager and hook system.</span>
                  </li>
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-[#ff6ad5] mt-1 shrink-0"
                      size={18}
                    />
                    <span>
                      Added the Statistics plugin and <code>/api/stats</code>.
                    </span>
                  </li>
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-[#ff6ad5] mt-1 shrink-0"
                      size={18}
                    />
                    <span>
                      Improved database abstraction with SQLite and Postgres
                      support.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Entry 2 */}
            <div className="relative group">
              <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#00e5ff] border-4 border-[#0f172a] shadow-[0_0_10px_rgba(0,229,255,0.5)]"></div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                  v0.2.0 — Web Dashboard
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-400 border border-slate-700">
                  <Calendar size={12} /> 2025-11-20
                </span>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-[#00e5ff]/30 transition-colors">
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-[#00e5ff] mt-1 shrink-0"
                      size={18}
                    />
                    <span>
                      Added a basic web dashboard to inspect queues and stats.
                    </span>
                  </li>
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-[#00e5ff] mt-1 shrink-0"
                      size={18}
                    />
                    <span>
                      Integrated Fastify routes for serving dashboard data.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Entry 3 */}
            <div className="relative group">
              <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-slate-600 border-4 border-[#0f172a]"></div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-slate-400 transition-colors">
                  v0.1.0 — First Public Release
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-400 border border-slate-700">
                  <Calendar size={12} /> 2025-11-10
                </span>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-slate-500 mt-1 shrink-0"
                      size={18}
                    />
                    <span>Core music features and worker-based playback.</span>
                  </li>
                  <li className="flex gap-3 text-slate-300">
                    <GitCommit
                      className="text-slate-500 mt-1 shrink-0"
                      size={18}
                    />
                    <span>Initial Discord command set.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};
