
import { Terminal, Copy } from 'lucide-react';

interface CodeBlockProps {
    code: string;
    label?: string;
    language?: string;
}

export const CodeBlock = ({ code, label, language = "bash" }: CodeBlockProps) => (
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
