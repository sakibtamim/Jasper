import { Cat } from "lucide-react";
import { COLORS } from "../theme";

interface WorkerCatProps {
  name: string;
  role: string;
  status: string;
  delay: number;
}

export const WorkerCat = ({ name, role, status, delay }: WorkerCatProps) => (
  <div
    className={`flex items-center gap-4 bg-slate-900/80 p-4 rounded-lg border-l-4 border-[${COLORS.secondary}] animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
      <Cat size={24} className="text-white" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-white">{name}</h4>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${status === "Busy" ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}
        >
          {status}
        </span>
      </div>
      <p className="text-xs text-slate-400">{role}</p>
    </div>
  </div>
);
