import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'login' | 'signup' | 'phone';

export default function LoginDialog({ open, onClose }: Props) {
  const { user, signInWithEmail, signUpWithEmail, signInWithPhone, verifyOtp, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-close when user becomes authenticated (e.g. after Google OAuth)
  useEffect(() => {
    if (user && open) onClose();
  }, [user, open, onClose]);

  if (!open) return null;

  const handleEmailSubmit = async (isSignup: boolean) => {
    setError('');
    setSuccess('');
    setLoading(true);
    const fn = isSignup ? signUpWithEmail : signInWithEmail;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      // If user signed up via Google and tries email login, guide them
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid credentials. If you signed up with Google, use the Google button above, or create a password via "Sign Up" with the same email.');
      } else {
        setError(error.message);
      }
    } else if (isSignup) {
      setSuccess('Check your email to confirm your account. If you already use Google sign-in, this will link a password to your account.');
    } else {
      onClose();
    }
  };

  const handlePhone = async () => {
    setError('');
    setLoading(true);
    if (!otpSent) {
      const { error } = await signInWithPhone(phone);
      setLoading(false);
      if (error) setError(error.message);
      else setOtpSent(true);
    } else {
      const { error } = await verifyOtp(phone, otp);
      setLoading(false);
      if (error) setError(error.message);
      else onClose();
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'login', label: 'Sign In' },
    { key: 'signup', label: 'Sign Up' },
    { key: 'phone', label: 'Phone' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">🔐 Account</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Google */}
        <button
          onClick={() => { setLoading(true); signInWithGoogle(); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted transition-all text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground uppercase">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {error && <p className="text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-positive text-xs bg-positive/10 rounded-lg px-3 py-2">{success}</p>}

        {/* Email forms */}
        {(tab === 'login' || tab === 'signup') && (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => handleEmailSubmit(tab === 'signup')}
              disabled={loading || !email || !password}
              className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? '...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        )}

        {/* Phone form */}
        {tab === 'phone' && (
          <div className="space-y-3">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+61 400 000 000"
              disabled={otpSent}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none disabled:opacity-50"
            />
            {otpSent && (
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter verification code"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            )}
            <button
              onClick={handlePhone}
              disabled={loading || !phone}
              className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? '...' : otpSent ? 'Verify Code' : 'Send Code'}
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Sign in is optional. Your data stays local without an account.
        </p>
      </div>
    </div>
  );
}
