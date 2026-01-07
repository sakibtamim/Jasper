import { COLORS } from "../theme";

interface CardProps {
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
  color?: "primary" | "secondary";
}

export const Card = ({
  title,
  children,
  icon: Icon,
  color = "primary",
}: CardProps) => (
  <div
    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl hover:border-[color:var(--highlight)] transition-all duration-300 hover:-translate-y-1 group"
    style={
      {
        "--highlight": color === "primary" ? COLORS.primary : COLORS.secondary,
      } as React.CSSProperties
    }
  >
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`p-3 rounded-lg bg-slate-900 group-hover:bg-opacity-80 transition-colors`}
      >
        <Icon
          size={24}
          color={color === "primary" ? COLORS.primary : COLORS.secondary}
        />
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <div className="text-slate-300 leading-relaxed">{children}</div>
  </div>
);
