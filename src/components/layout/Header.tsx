import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssetType } from '@/types/assets';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import LoginDialog from '@/components/auth/LoginDialog';
import { getStoredApiKey } from '@/components/settings/ApiKeySettings';

const tabs: { key: AssetType; label: string; icon: string }[] = [
  { key: 'crypto', label: 'Crypto', icon: '🪙' },
  { key: 'stocks', label: 'Stocks', icon: '📈' },
  { key: 'etfs', label: 'ETFs', icon: '📊' },
  { key: 'forex', label: 'Forex', icon: '💱' },
];

interface Props {
  active: AssetType;
  onSelect: (t: AssetType) => void;
}

export default function Header({ active, onSelect }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const hasKey = !!getStoredApiKey();

  return (
    <>
      <header className="border-b border-border bg-card px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto">
          {/* Top row: logo + actions */}
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-xs sm:text-sm font-mono">SF</span>
              </div>
              <div>
                <h1 className="text-foreground font-bold text-base sm:text-lg leading-tight">Signal Forge</h1>
                <span className="text-muted-foreground text-[10px] font-mono">v6.1</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Admin link */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-1.5 sm:p-2 rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all text-sm"
                  title="Admin Panel"
                >
                  🛡️
                </button>
              )}
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all text-sm"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* Settings */}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`p-1.5 sm:p-2 rounded-lg border transition-all text-sm ${
                  hasKey
                    ? 'border-positive/30 text-positive bg-positive/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
                title="API Settings"
              >
                ⚙️
              </button>

              {/* Auth */}
              {user ? (
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all"
                >
                  <span className="hidden sm:inline">{user.email?.split('@')[0] || 'User'}</span>
                  <span>↗</span>
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                >
                  👤 <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: asset type tabs */}
          <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => onSelect(t.key)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  active === t.key
                    ? 'bg-primary/15 text-primary glow-cyan'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
