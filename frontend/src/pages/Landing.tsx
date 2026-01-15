import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/config/routes.config';
import { useState, useEffect } from 'react';
import greenPalaceLogo from '@/assets/images/green-palace-logo.png';

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
        isScrolled ? 'bg-dark-900/95 backdrop-blur-md shadow-lg shadow-emerald-900/20' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={greenPalaceLogo} alt="Green Palace" className="w-12 h-12 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">Green Palace</h1>
              <p className="text-xs text-emerald-400/80">Premium Sweepstakes Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm font-medium">How It Works</a>
            <a href="#for-players" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm font-medium">For Players</a>
            <a href="#for-clients" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm font-medium">For Clients</a>
            <a href="#security" className="text-gray-300 hover:text-emerald-400 transition-colors text-sm font-medium">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to={ROUTES.LOGIN}>
              <Button variant="ghost" className="text-sm text-emerald-400 hover:text-emerald-300">Sign In</Button>
            </Link>
            <Link to={ROUTES.REGISTER}>
              <Button variant="primary" className="text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/30 border border-emerald-400/30">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Palace Theme */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Elegant Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/50 via-dark-900 to-dark-900"></div>

        {/* Palace Pillars Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-emerald-900/20 to-transparent"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-900/20 to-transparent"></div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl"></div>

        {/* Crown/Royal Pattern */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 opacity-10">
          <svg className="w-40 h-40 text-emerald-400" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 10 L60 35 L90 35 L65 55 L75 85 L50 65 L25 85 L35 55 L10 35 L40 35 Z"/>
          </svg>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          {/* Royal Badge */}
          <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
            <span className="text-2xl">👑</span>
            <span className="text-emerald-400 text-sm font-medium tracking-wide">Welcome to the Palace of Rewards</span>
            <span className="text-2xl">👑</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Green Palace
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-emerald-200/80 mb-4 font-light">
            The Royal Sweepstakes Experience
          </p>

          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            A premium platform connecting <span className="text-emerald-400 font-semibold">Players</span> seeking rewards
            with <span className="text-emerald-400 font-semibold">Clients</span> offering exclusive promotions.
            Join the palace and claim your throne.
          </p>

          {/* Dual CTA - Player & Client */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-16">
            <a href="#for-players" className="group">
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/40 rounded-2xl p-6 hover:border-emerald-400/60 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 min-w-[280px]">
                <div className="text-4xl mb-3">🎮</div>
                <h3 className="text-xl font-bold text-white mb-2">I'm a Player</h3>
                <p className="text-gray-400 text-sm mb-4">Claim promotions & earn rewards</p>
                <span className="text-emerald-400 font-medium group-hover:text-emerald-300 flex items-center justify-center gap-2">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>

            <a href="#for-clients" className="group">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/40 rounded-2xl p-6 hover:border-purple-400/60 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 min-w-[280px]">
                <div className="text-4xl mb-3">💼</div>
                <h3 className="text-xl font-bold text-white mb-2">I'm a Client</h3>
                <p className="text-gray-400 text-sm mb-4">Create promotions & grow audience</p>
                <span className="text-purple-400 font-medium group-hover:text-purple-300 flex items-center justify-center gap-2">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No Purchase Required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>100% Legal & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-dark-900 via-emerald-950/20 to-dark-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">The Palace Way</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">How Green Palace Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              A seamless ecosystem connecting players with exclusive promotions from verified clients
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-dark-900 font-black text-xl shadow-lg shadow-emerald-500/30">1</div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 pt-10 h-full hover:border-emerald-500/30 transition-all">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-white mb-3">Create Account</h3>
                <p className="text-gray-400">
                  Sign up as a <span className="text-emerald-400">Player</span> to claim rewards or as a <span className="text-purple-400">Client</span> to create promotions. Quick verification, instant access.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-dark-900 font-black text-xl shadow-lg shadow-emerald-500/30">2</div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 pt-10 h-full hover:border-emerald-500/30 transition-all">
                <div className="text-4xl mb-4">🎁</div>
                <h3 className="text-xl font-bold text-white mb-3">Engage & Earn</h3>
                <p className="text-gray-400">
                  <span className="text-emerald-400">Players</span> browse and claim promotions. <span className="text-purple-400">Clients</span> create offers and manage their player community.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-dark-900 font-black text-xl shadow-lg shadow-emerald-500/30">3</div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 pt-10 h-full hover:border-emerald-500/30 transition-all">
                <div className="text-4xl mb-4">💎</div>
                <h3 className="text-xl font-bold text-white mb-3">Collect Rewards</h3>
                <p className="text-gray-400">
                  <span className="text-emerald-400">Players</span> receive credits directly. <span className="text-purple-400">Clients</span> build loyalty and grow their platform presence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Players Section */}
      <section id="for-players" className="py-24 px-6 bg-dark-900">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="text-xl">🎮</span> For Players
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Claim Your <span className="text-emerald-400">Royal Rewards</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                As a player at Green Palace, you get access to exclusive promotions from verified clients.
                Earn credits, refer friends, and enjoy a premium sweepstakes experience.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Welcome Bonus</h4>
                    <p className="text-gray-400 text-sm">Get 500 free credits when you join and verify</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Referral Rewards</h4>
                    <p className="text-gray-400 text-sm">Earn 250 credits for each friend you invite</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Community & Chat</h4>
                    <p className="text-gray-400 text-sm">Connect with friends and fellow players</p>
                  </div>
                </div>
              </div>

              <Link to={ROUTES.REGISTER}>
                <Button variant="primary" className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-xl shadow-emerald-500/30">
                  Join as Player
                </Button>
              </Link>
            </div>

            {/* Player Benefits Visual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-emerald-400 mb-1">+500</div>
                <div className="text-sm text-gray-400">Welcome Credits</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-emerald-400 mb-1">+100</div>
                <div className="text-sm text-gray-400">Daily Login</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-emerald-400 mb-1">+250</div>
                <div className="text-sm text-gray-400">Per Referral</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-emerald-400 mb-1">∞</div>
                <div className="text-sm text-gray-400">Promotions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Clients Section */}
      <section id="for-clients" className="py-24 px-6 bg-gradient-to-b from-dark-800/50 to-dark-900">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            {/* Client Benefits Visual */}
            <div className="order-2 md:order-1 grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm text-gray-400">Dashboard Analytics</div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-sm text-gray-400">Targeted Promotions</div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-sm text-gray-400">Player Management</div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">📢</div>
                <div className="text-sm text-gray-400">Broadcast Messages</div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="text-xl">💼</span> For Clients
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Grow Your <span className="text-purple-400">Kingdom</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                As a client, create promotions, manage your player base, and build loyalty.
                Green Palace provides all the tools you need to engage your audience.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Full Analytics Dashboard</h4>
                    <p className="text-gray-400 text-sm">Track claims, engagement, and player activity</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Custom Promotions</h4>
                    <p className="text-gray-400 text-sm">Create unlimited offers with flexible rules</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Direct Communication</h4>
                    <p className="text-gray-400 text-sm">Broadcast announcements to all your players</p>
                  </div>
                </div>
              </div>

              <Link to={ROUTES.REGISTER}>
                <Button variant="primary" className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 shadow-xl shadow-purple-500/30">
                  Register as Client
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-dark-800/50 border-y border-dark-700">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">4K+</div>
              <div className="text-gray-400">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-purple-400 mb-2">18+</div>
              <div className="text-gray-400">Trusted Clients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">Safe</div>
              <div className="text-gray-400">Review & Report</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 px-6 bg-dark-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Palace Security</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
              Safer Than <span className="line-through text-gray-500">Facebook Gaming</span>
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto text-lg">
              Your security is our crown jewel. Green Palace is a dedicated platform
              built with privacy and protection at its core.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition-all">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero Data Sharing</h3>
              <p className="text-gray-400 text-sm">Your data stays in the palace, never sold to third parties</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition-all">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Independent Account</h3>
              <p className="text-gray-400 text-sm">Your account is yours - no social media dependency</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition-all">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Complete Privacy</h3>
              <p className="text-gray-400 text-sm">Your activity is 100% private - no friend tracking</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center hover:border-emerald-500/30 transition-all">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Review & Report</h3>
              <p className="text-gray-400 text-sm">Report issues, we investigate and act immediately</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="relative bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-emerald-900/30 border border-emerald-500/30 rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

            {/* Crown */}
            <div className="relative z-10 mb-6">
              <span className="text-6xl">👑</span>
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Enter the Palace
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join Green Palace today. Whether you're a player seeking rewards or a client building your kingdom.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={ROUTES.REGISTER}>
                  <Button variant="primary" className="px-10 py-4 text-lg font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-xl shadow-emerald-500/30">
                    Join as Player
                  </Button>
                </Link>
                <Link to={ROUTES.REGISTER}>
                  <Button variant="secondary" className="px-10 py-4 text-lg font-bold border-purple-500/50 text-purple-400 hover:border-purple-400 hover:text-purple-300">
                    Register as Client
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Section */}
      <section className="py-12 px-6 bg-dark-800/50 border-t border-dark-700">
        <div className="container mx-auto max-w-4xl">
          <h4 className="text-sm font-semibold text-emerald-400 mb-4 text-center uppercase tracking-wider">Legal Notice</h4>
          <div className="text-gray-500 text-xs space-y-3 text-center leading-relaxed">
            <p>
              Green Palace is a sweepstakes platform that operates in compliance with all applicable US federal and state laws.
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
              <img src={greenPalaceLogo} alt="Green Palace" className="w-10 h-10 object-contain" />
              <div>
                <span className="text-white font-bold text-lg">Green Palace</span>
                <p className="text-xs text-gray-500">Premium Sweepstakes Platform</p>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-8 text-sm">
              <a href="#how-it-works" className="text-gray-400 hover:text-emerald-400 transition-colors">How It Works</a>
              <a href="#for-players" className="text-gray-400 hover:text-emerald-400 transition-colors">For Players</a>
              <a href="#for-clients" className="text-gray-400 hover:text-emerald-400 transition-colors">For Clients</a>
              <Link to={ROUTES.LOGIN} className="text-gray-400 hover:text-emerald-400 transition-colors">Sign In</Link>
            </nav>

            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Green Palace. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
