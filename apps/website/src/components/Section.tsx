interface SectionProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
}

export const Section = ({ children, className = '', id = '' }: SectionProps) => (
    <section id={id} className={`py-20 px-6 md:px-12 ${className}`}>
        <div className="max-w-7xl mx-auto">{children}</div>
    </section>
);
