import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Settings, Sun, Moon, Shield, User, Bell } from 'lucide-react';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import LoginDialog from '@/components/auth/LoginDialog';
import AccountPanel from '@/components/account/AccountPanel';
import WatchlistDropdown from '@/components/layout/WatchlistDropdown';
import { getStoredApiKey } from '@/components/settings/ApiKeySettings';
import type { WatchlistItem } from '@/types/assets';
import logoStackedDark from '@/assets/logo-stacked.svg';
import logoStackedLight from '@/assets/logo-stacked-light.svg';

interface Props {
  watchlist?: WatchlistItem[];
  onWatchlistSelect?: (item: WatchlistItem) => void;
  onWatchlistRemove?: (id: string) => void;
  onWatchlistClear?: () => void;
  onWatchlistNoteUpdate?: (id: string, note: string) => void;
}

export default function Header({ watchlist = [], onWatchlistSelect, onWatchlistRemove, onWatchlistClear, onWatchlistNoteUpdate }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const hasKey = !!getStoredApiKey();
  const logo = theme === 'dark' ? logoStackedDark : logoStackedLight;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-3 overflow-hidden" style={{ height: '72px', position: 'sticky' }}>
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex items-center justify-between h-full">
            <button onClick={() => navigate('/')} className="shrink-0 hover:opacity-80 transition-opacity" aria-label="Home">
              <img src={logo} alt="ForecastSimply" className="h-10 sm:h-12" style={{ transform: 'scale(1.8)', transformOrigin: 'left center' }} />
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
                className="p-1.5 sm:p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-1.5 sm:p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                  title="Admin Panel"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
                  hasKey
                    ? 'border-positive/30 text-positive'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
                title="API Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {user ? (
                <button
                  onClick={() => setAccountOpen(true)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-all"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      {user && <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} watchlist={watchlist} onWatchlistRemove={onWatchlistRemove} onWatchlistClear={onWatchlistClear} onWatchlistNoteUpdate={onWatchlistNoteUpdate} />}
    </>
  );
}
