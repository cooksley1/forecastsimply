import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import LoginDialog from '@/components/auth/LoginDialog';
import AccountPanel from '@/components/account/AccountPanel';
import WatchlistDropdown from '@/components/layout/WatchlistDropdown';
import { getStoredApiKey } from '@/components/settings/ApiKeySettings';
import type { WatchlistItem } from '@/types/assets';
import logoHeaderDark from '@/assets/logo-header.svg';
import logoHeaderLight from '@/assets/logo-header-light.svg';

interface Props {
  watchlist?: WatchlistItem[];
  onWatchlistSelect?: (item: WatchlistItem) => void;
  onWatchlistRemove?: (id: string) => void;
  onWatchlistClear?: () => void;
}

export default function Header({ watchlist = [], onWatchlistSelect, onWatchlistRemove, onWatchlistClear }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const hasKey = !!getStoredApiKey();
  const logoHeader = theme === 'dark' ? logoHeaderDark : logoHeaderLight;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background px-2 sm:px-4 py-2 sm:py-3 overflow-hidden" style={{ height: '56px', position: 'sticky' }}>
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex items-center justify-between h-full">
            <img src={logoHeader} alt="ForecastSimply" className="h-7 sm:h-9 shrink-0" />

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {onWatchlistSelect && (
                <WatchlistDropdown
                  items={watchlist}
                  onSelect={onWatchlistSelect}
                  onRemove={onWatchlistRemove || (() => {})}
                  onClear={onWatchlistClear || (() => {})}
                />
              )}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all text-sm"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-1.5 sm:p-2 rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all text-sm"
                  title="Admin Panel"
                >
                  🛡️
                </button>
              )}
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

              {user ? (
                <button
                  onClick={() => setAccountOpen(true)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <span>👤</span>
                  )}
                  <span className="hidden sm:inline">{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}</span>
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
        </div>
      </header>
      <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      {user && <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} watchlist={watchlist} onWatchlistRemove={onWatchlistRemove} onWatchlistClear={onWatchlistClear} />}
    </>
  );
}
