import Header from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Terms of Service — ForecastSimply" description="Terms and conditions for using ForecastSimply's technical analysis platform." />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-xs text-muted-foreground font-mono">Last updated: February 2026</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using ForecastSimply, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>

          <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
          <p>ForecastSimply provides technical analysis tools, price forecasting, and market data visualisation for educational and informational purposes only. See our <Link to="/disclaimer" className="text-primary hover:underline">Financial Disclaimer</Link> for important limitations.</p>

          <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
          <p>Account creation is optional. If you create an account, you are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>

          <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
          <p>You agree not to misuse the service, attempt to gain unauthorised access, or use automated tools to scrape data beyond normal usage patterns.</p>

          <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
          <p>All content, design, and analysis algorithms are the property of ForecastSimply. Market data is sourced from third-party providers and subject to their respective terms.</p>

          <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
          <p>ForecastSimply is provided "as is" without warranties of any kind. We are not liable for any financial losses incurred from using our analysis tools or acting on information presented on this platform.</p>

          <h2 className="text-lg font-semibold text-foreground">7. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
        </section>
      </main>
    </div>
  );
}
