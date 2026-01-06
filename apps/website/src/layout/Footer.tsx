import { Cat } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-slate-800 text-center bg-[#0f172a]">
      <div className="flex items-center justify-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
        <Cat size={24} className="text-[#ff6ad5]" />
        <span className="font-bold text-xl tracking-tighter text-white">
          JASPER
        </span>
      </div>

      <div className="flex justify-center gap-6 mb-8 text-slate-400 text-sm flex-wrap">
        <a
          href="https://github.com/sakibtamim/Jasper/blob/master/README.md"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Documentation
        </a>
        <a
          href="https://github.com/sakibtamim/Jasper"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://github.com/sakibtamim/Jasper/blob/master/LICENSE"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          License
        </a>
        <a
          href="https://github.com/sakibtamim/Jasper"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contributing
        </a>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-slate-300 font-medium">
          Built by Purrfect Software Limited
        </p>
        <p className="text-slate-500 text-xs leading-relaxed">
          Powered by humans, cats, and an AI swarm (Gemini for scaffolding,
          Antigravity Agent 47/69 for integration, and language models for
          planning and docs).
        </p>
        <p className="text-[#ff6ad5]/60 text-[10px] italic">
          Heavenly Council of Fur: Approved 🐾
        </p>
      </div>
    </footer>
  );
};
