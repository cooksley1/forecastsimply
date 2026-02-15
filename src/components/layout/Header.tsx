import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import ApiKeySettings from '@/components/settings/ApiKeySettings';
import LoginDialog from '@/components/auth/LoginDialog';
import AccountPanel from '@/components/account/AccountPanel';
import { getStoredApiKey } from '@/components/settings/ApiKeySettings';
import logoHeader from '@/assets/logo-header.svg';

export default function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const hasKey = !!getStoredApiKey();

  return (
    <>
      <header className="border-b border-border bg-background px-3 sm:px-4 py-2 sm:py-3" style={{ height: '56px' }}>
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex items-center justify-between h-full">
            <img src={logoHeader} alt="ForecastSimply" className="h-8 sm:h-9" />

            <div className="flex items-center gap-1.5 sm:gap-2">
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
      {user && <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} />}
    </>
  );
}
