import { useAuth } from '@/contexts/AuthContext';
import { FaBuilding, FaUsers, FaGift, FaGamepad } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { GiCardAceSpades } from 'react-icons/gi';

export default function ClientDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500">
      {/* Header */}
      <header className="bg-dark-200 border-b-2 border-gold-600 shadow-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GiCardAceSpades className="text-4xl text-gold-500" />
              <div>
                <h1 className="text-2xl font-bold text-gold-500 tracking-wider">GOLDEN ACE</h1>
                <p className="text-xs text-gold-700 uppercase tracking-widest">Client Portal</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-dark-200 border-2 border-gold-600">
          <div className="flex items-center gap-3 mb-6">
            <FaBuilding className="text-4xl text-gold-500" />
            <div>
              <h2 className="text-2xl font-bold text-gold-500">Client Dashboard</h2>
              <p className="text-gray-400">Welcome back, {user?.username}!</p>
              {user?.company_name && (
                <p className="text-sm text-gold-700">{user.company_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">My Players</h3>
                <FaUsers className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-white">--</p>
              <p className="text-xs text-gray-500 mt-1">Registered players</p>
            </div>

            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">Active Promotions</h3>
                <FaGift className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-white">--</p>
              <p className="text-xs text-gray-500 mt-1">Running campaigns</p>
            </div>

            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">Available Games</h3>
                <FaGamepad className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-white">--</p>
              <p className="text-xs text-gray-500 mt-1">Games in library</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-dark-500 border border-gold-900 rounded-lg">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <GiCardAceSpades className="text-gold-600" />
              Full dashboard features coming in Phase 3...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
