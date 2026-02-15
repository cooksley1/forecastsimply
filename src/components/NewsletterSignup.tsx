import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  variant?: 'hero' | 'footer';
}

export default function NewsletterSignup({ variant = 'hero' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setMsg('Please enter a valid email.');
      return;
    }
    if (trimmed.length > 255) {
      setStatus('error');
      setMsg('Email too long.');
      return;
    }

    setStatus('loading');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: trimmed });

    if (error) {
      if (error.code === '23505') {
        setStatus('success');
        setMsg("You're already subscribed! 🎉");
      } else {
        setStatus('error');
        setMsg('Something went wrong. Try again.');
      }
    } else {
      setStatus('success');
      setMsg('Subscribed! Watch your inbox 📬');
      setEmail('');
    }
  };

  if (variant === 'footer') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          maxLength={255}
          className="flex-1 w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          disabled={status === 'loading' || status === 'success'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {status === 'loading' ? '...' : status === 'success' ? '✓' : '📩 Subscribe'}
        </button>
        {msg && (
          <span className={`text-[10px] ${status === 'error' ? 'text-destructive' : 'text-primary'}`}>{msg}</span>
        )}
      </form>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-lg mx-auto text-center space-y-3">
      <h3 className="text-sm font-semibold text-foreground">📬 Get Weekly Market Insights</h3>
      <p className="text-xs text-muted-foreground">AI-curated analysis based on your watchlist. Free, unsubscribe anytime.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          maxLength={255}
          className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          disabled={status === 'loading' || status === 'success'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed ✓' : 'Subscribe'}
        </button>
      </form>
      {msg && (
        <p className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-primary'}`}>{msg}</p>
      )}
    </div>
  );
}
