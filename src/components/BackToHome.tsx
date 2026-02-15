import { Link } from 'react-router-dom';

export default function BackToHome() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
    >
      ← Back to app
    </Link>
  );
}
