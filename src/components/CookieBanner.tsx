import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('sf_cookies_accepted');
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('sf_cookies_accepted', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg">
        <p className="text-xs text-muted-foreground flex-1">
          🍪 We use essential cookies and localStorage for authentication, preferences, and cached data. No tracking cookies are used.{' '}
          <Link to="/privacy" className="text-primary hover:underline">Learn more</Link>.
        </p>
        <button
          onClick={accept}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
