import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/config/routes.config';
import { useState, useEffect } from 'react';

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-dark-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
              <span className="text-dark-900 font-bold text-2xl">G</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Golden Ace</h1>
              <p className="text-xs text-gold-400">Sweepstakes Gaming</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#promotions" className="text-gray-300 hover:text-gold-400 transition-colors text-sm font-medium">Promotions</a>
            <a href="#security" className="text-gray-300 hover:text-green-400 transition-colors text-sm font-medium">Security</a>
            <a href="#features" className="text-gray-300 hover:text-gold-400 transition-colors text-sm font-medium">Features</a>
            <Link to={ROUTES.CONTACT} className="text-gray-300 hover:text-gold-400 transition-colors text-sm font-medium">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to={ROUTES.LOGIN}>
              <Button variant="ghost" className="text-sm">Sign In</Button>
            </Link>
            <Link to={ROUTES.REGISTER}>
              <Button variant="primary" className="text-sm shadow-lg shadow-gold-500/20">Join Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-800/50 via-dark-900 to-dark-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        {/* Floating Cards Animation */}
        <div className="absolute top-20 left-10 w-16 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-lg rotate-12 opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg -rotate-12 opacity-20 animate-pulse delay-100"></div>
        <div className="absolute bottom-40 left-20 w-16 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg rotate-6 opacity-20 animate-pulse delay-200"></div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-sm font-medium">Live Now - Real Players, Real Rewards</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            Play. Win.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-yellow-400 to-gold-600">
              Get Rewarded.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join thousands of players on Golden Ace. Claim exclusive promotions,
            play exciting games, and earn real rewards.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to={ROUTES.REGISTER}>
              <Button variant="primary" className="px-10 py-4 text-lg font-bold shadow-xl shadow-gold-500/30 hover:shadow-gold-500/50 transition-all hover:scale-105">
                Start Playing Free
              </Button>
            </Link>
            <a href="#security">
              <Button variant="secondary" className="px-10 py-4 text-lg">
                Why We're Secure
              </Button>
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No Purchase Required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Instant Signup</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>100% Legal</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-dark-800/50 border-y border-dark-700">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-gold-400 mb-2">4K+</div>
              <div className="text-gray-400">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-gold-400 mb-2">18+</div>
              <div className="text-gray-400">Trusted Clients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-gold-400 mb-2">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-green-400 mb-2">Safe</div>
              <div className="text-gray-400">Review & Report</div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section id="promotions" className="py-24 px-6 bg-gradient-to-b from-dark-800/50 to-dark-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-gold-400 text-sm font-semibold uppercase tracking-wider">Rewards</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">Exclusive Promotions</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Get access to amazing promotions from our partner clients.
              Claim bonuses and boost your credits daily.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Promo Card 1 */}
            <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden group hover:border-gold-500/50 transition-all">
              <div className="h-2 bg-gradient-to-r from-gold-400 to-gold-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-gold-500/10 text-gold-400 px-3 py-1 rounded-full text-sm font-medium">Welcome Bonus</span>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">New Player Bonus</h3>
                <p className="text-gray-400 text-sm mb-4">Get bonus credits when you join and verify your account.</p>
                <div className="text-3xl font-black text-gold-400">+500 GC</div>
              </div>
            </div>

            {/* Promo Card 2 */}
            <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden group hover:border-gold-500/50 transition-all">
              <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">Daily</span>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Daily Login Reward</h3>
                <p className="text-gray-400 text-sm mb-4">Login every day to claim your free daily credits.</p>
                <div className="text-3xl font-black text-purple-400">+100 GC</div>
              </div>
            </div>

            {/* Promo Card 3 */}
            <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden group hover:border-gold-500/50 transition-all">
              <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium">Referral</span>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Refer a Friend</h3>
                <p className="text-gray-400 text-sm mb-4">Invite friends and earn credits when they join.</p>
                <div className="text-3xl font-black text-green-400">+250 GC</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section - Why Not Facebook */}
      <section id="security" className="py-24 px-6 bg-gradient-to-b from-dark-900 via-dark-800/50 to-dark-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-400 text-sm font-semibold uppercase tracking-wider">Security First</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
              More Secure Than <span className="line-through text-gray-500">Facebook Gaming</span>
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto text-lg">
              Unlike games on social media platforms, Golden Ace is a dedicated gaming platform
              built from the ground up with your security and privacy in mind.
            </p>
          </div>

          {/* Security Comparison Grid */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left - Facebook Problems */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-400">Facebook Gaming Risks</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Third-Party Data Sharing</span>
                      <p className="text-gray-500 text-sm">Your gaming data shared with advertisers</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Account Dependency</span>
                      <p className="text-gray-500 text-sm">Facebook ban = lose all gaming progress</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">No Privacy</span>
                      <p className="text-gray-500 text-sm">Friends see all your gaming activity</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Targeted by Scammers</span>
                      <p className="text-gray-500 text-sm">Social platforms are prime targets for phishing</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Generic Security</span>
                      <p className="text-gray-500 text-sm">Not built for financial gaming transactions</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Right - Golden Ace Benefits */}
              <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-400">Golden Ace Protection</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Zero Data Sharing</span>
                      <p className="text-gray-500 text-sm">Your data stays with us, never sold</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Independent Account</span>
                      <p className="text-gray-500 text-sm">Your account is yours - no platform dependency</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Complete Privacy</span>
                      <p className="text-gray-500 text-sm">Your gaming activity is 100% private</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Dedicated Security Team</span>
                      <p className="text-gray-500 text-sm">24/7 monitoring for suspicious activity</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Gaming-Grade Security</span>
                      <p className="text-gray-500 text-sm">Built specifically for secure transactions</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-white font-medium">Review & Report System</span>
                      <p className="text-gray-500 text-sm">Report suspicious activity, we take action</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Features Detail */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-green-500/30 transition-all">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">End-to-End Encryption</h3>
              <p className="text-gray-400 text-sm">Bank-grade AES-256 encryption for all data</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-green-500/30 transition-all">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verified Identity</h3>
              <p className="text-gray-400 text-sm">Email verification for real players only</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-green-500/30 transition-all">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Tracking</h3>
              <p className="text-gray-400 text-sm">Zero advertisers or tracking pixels</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-green-500/30 transition-all">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Review & Report</h3>
              <p className="text-gray-400 text-sm">Report issues, we investigate and act fast</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-gold-400 text-sm font-semibold uppercase tracking-wider">Platform</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">Why Golden Ace?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              We've built the ultimate sweepstakes gaming experience with features you'll love.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ultra Secure</h3>
              <p className="text-gray-400 text-sm">More secure than Facebook - your data never leaves our platform</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Private Social</h3>
              <p className="text-gray-400 text-sm">Chat with friends without social media exposure</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Instant</h3>
              <p className="text-gray-400 text-sm">Claim rewards in real-time</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Mobile</h3>
              <p className="text-gray-400 text-sm">Play anywhere, anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="relative bg-gradient-to-r from-gold-600/20 via-gold-500/10 to-gold-600/20 border border-gold-500/30 rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to Start Winning?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join Golden Ace today and get 500 free credits. No purchase necessary.
              </p>
              <Link to={ROUTES.REGISTER}>
                <Button variant="primary" className="px-12 py-4 text-lg font-bold shadow-xl shadow-gold-500/30">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Section */}
      <section className="py-12 px-6 bg-dark-800/50 border-t border-dark-700">
        <div className="container mx-auto max-w-4xl">
          <h4 className="text-sm font-semibold text-gold-400 mb-4 text-center uppercase tracking-wider">Legal Notice</h4>
          <div className="text-gray-500 text-xs space-y-3 text-center leading-relaxed">
            <p>
              Golden Ace is a sweepstakes platform that operates in compliance with all applicable US federal and state laws.
              No purchase is necessary to play or win. Must be 18+ to participate.
            </p>
            <p>
              This website and all its content are protected under United States intellectual property laws.
              Void where prohibited by law.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">G</span>
              </div>
              <div>
                <span className="text-white font-bold text-lg">Golden Ace</span>
                <p className="text-xs text-gray-500">Sweepstakes Gaming</p>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-8 text-sm">
              <Link to={ROUTES.CONTACT} className="text-gray-400 hover:text-gold-400 transition-colors">Contact</Link>
              <Link to={ROUTES.LOGIN} className="text-gray-400 hover:text-gold-400 transition-colors">Sign In</Link>
              <Link to={ROUTES.REGISTER} className="text-gray-400 hover:text-gold-400 transition-colors">Register</Link>
            </nav>

            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Golden Ace. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
