import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/config/routes.config';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gold-500">Casino Royal</h1>
          <Link to={ROUTES.LOGIN}>
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-gold-500">Casino Royal</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            The premier online gaming platform. Experience the thrill of world-class entertainment.
          </p>

          {/* Legal Statement */}
          <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-8 mb-12">
            <h3 className="text-2xl font-semibold text-gold-400 mb-4">Legal Notice</h3>
            <div className="text-gray-300 text-left space-y-4">
              <p>
                This website and all its content are the exclusive property of Casino Royal and are protected
                under United States intellectual property laws, including but not limited to copyright, trademark,
                and trade secret laws.
              </p>
              <p>
                <strong className="text-white">All Rights Reserved.</strong> Unauthorized reproduction, distribution,
                or transmission of any content on this site is strictly prohibited and may result in civil and
                criminal penalties under U.S. law.
              </p>
              <p>
                By accessing this website, you agree to comply with all applicable federal, state, and local laws
                of the United States. This platform operates in accordance with U.S. regulations and is intended
                for users who are of legal gambling age in their respective jurisdictions.
              </p>
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} Casino Royal. All rights reserved under U.S. and international law.
                Protected by the Digital Millennium Copyright Act (DMCA) and applicable U.S. trademark laws.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={ROUTES.REGISTER}>
              <Button variant="primary" className="px-8 py-4 text-lg">
                Get Started
              </Button>
            </Link>
            <Link to={ROUTES.CONTACT}>
              <Button variant="secondary" className="px-8 py-4 text-lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-dark-700">
        <div className="container mx-auto text-center text-gray-400">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
            <Link to={ROUTES.CONTACT} className="hover:text-gold-500 transition-colors">
              Contact Us
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link to={ROUTES.LOGIN} className="hover:text-gold-500 transition-colors">
              Sign In
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link to={ROUTES.REGISTER} className="hover:text-gold-500 transition-colors">
              Register
            </Link>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Casino Royal. All Rights Reserved. | United States
          </p>
        </div>
      </footer>
    </div>
  );
}
