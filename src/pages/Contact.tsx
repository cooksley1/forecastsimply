import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

const SUBJECTS = [
  { value: 'General', icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'General Inquiry' },
  { value: 'Bug Report', icon: <Bug className="w-3.5 h-3.5" />, label: 'Bug Report' },
  { value: 'Feature Request', icon: <Lightbulb className="w-3.5 h-3.5" />, label: 'Feature Request' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('contact_messages' as any).insert({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      } as any);
      if (error) throw error;
      toast.success('Message sent! We\'ll get back to you soon.');
      setForm({ name: '', email: '', subject: 'General', message: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Contact — ForecastSimply" description="Get in touch with the ForecastSimply team for support, bug reports, or feature requests." />
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">Contact Us</h1>
        <p className="text-sm text-muted-foreground">Have a question, bug report, or feature request? Send us a message and we'll respond as soon as possible.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject selector */}
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button
                type="button"
                key={s.value}
                onClick={() => setForm(f => ({ ...f, subject: s.value }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  form.subject === s.value
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-mono uppercase">Name *</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-mono uppercase">Email *</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-mono uppercase">Message *</label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={form.subject === 'Bug Report'
                ? 'Describe what happened, what you expected, and the asset/browser you were using...'
                : 'Your message...'}
              className="min-h-[120px]"
              required
            />
          </div>

          <Button type="submit" disabled={sending} className="gap-2">
            {sending ? '⏳ Sending...' : <><Send className="w-3.5 h-3.5" /> Send Message</>}
          </Button>
        </form>
      </main>
    </div>
  );
}
