import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import BackToHome from '@/components/BackToHome';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Contact — ForecastSimply" description="Get in touch with the ForecastSimply team for support, bug reports, or feature requests." />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <BackToHome />
        <h1 className="text-2xl font-bold text-foreground">Contact Us</h1>

        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>Have a question, bug report, or feature request? We'd love to hear from you.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">📧 Email</h3>
              <p className="text-xs">For general inquiries and support:</p>
              <a href="mailto:support@forecastsimply.com" className="text-primary text-xs hover:underline">support@forecastsimply.com</a>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-foreground font-semibold">🐛 Bug Reports</h3>
              <p className="text-xs">Found an issue? Please include:</p>
              <ul className="text-xs list-disc list-inside space-y-0.5">
                <li>What you expected to happen</li>
                <li>What actually happened</li>
                <li>Asset type and symbol used</li>
                <li>Browser and device info</li>
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-foreground font-semibold">💡 Feature Requests</h3>
            <p className="text-xs">We're always looking to improve. If you have ideas for new features, additional markets, or better analysis tools, email us and we'll consider them for future updates.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
