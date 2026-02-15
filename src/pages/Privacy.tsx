import Header from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Privacy Policy — ForecastSimply" description="How ForecastSimply collects, uses, and protects your personal data." />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground font-mono">Last updated: February 2026</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>When you create an account, we collect your email address, display name, and avatar (if provided via social login). We also store your watchlists, analysis history, and user preferences to provide a personalised experience.</p>

          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your data is used solely to provide and improve ForecastSimply's services, including saving your watchlists across devices, remembering your preferences, and displaying your analysis history. We do not sell or share your personal data with third parties.</p>

          <h2 className="text-lg font-semibold text-foreground">3. Data Storage</h2>
          <p>Your data is stored securely using industry-standard encryption. Optional third-party API keys you provide are stored locally in your browser's localStorage and are never transmitted to our servers.</p>

          <h2 className="text-lg font-semibold text-foreground">4. Cookies & Local Storage</h2>
          <p>We use essential cookies and localStorage for authentication sessions, theme preferences, and cached watchlist data. No tracking or advertising cookies are used.</p>

          <h2 className="text-lg font-semibold text-foreground">5. Third-Party Services</h2>
          <p>We use third-party APIs (CoinGecko, Yahoo Finance, DIA, Frankfurter, etc.) to fetch market data. These services may have their own privacy policies. We do not share your personal information with these providers.</p>

          <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
          <p>You can request deletion of your account and all associated data at any time by contacting us. You may also export or delete your watchlist data from your account settings.</p>

          <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
          <p>For privacy-related inquiries, please visit our <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
        </section>
      </main>
    </div>
  );
}
