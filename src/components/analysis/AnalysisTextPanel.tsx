interface Props {
  text: string;
  marketPhase: string;
}

export default function AnalysisPanel({ text, marketPhase }: Props) {
  // Convert **bold** markdown to JSX
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-foreground font-semibold text-sm">Technical Analysis Summary</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="text-foreground font-mono">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
      </p>
    </div>
  );
}
