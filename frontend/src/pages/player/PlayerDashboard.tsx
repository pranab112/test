import { useAuth } from '@/contexts/AuthContext';
import { IoMdPerson } from 'react-icons/io';
import { GiCash, GiLevelEndFlag, GiCardAceSpades, GiTrophyCup } from 'react-icons/gi';
import { FaGift } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';

export default function PlayerDashboard() {
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
                <p className="text-xs text-gold-700 uppercase tracking-widest">Player Portal</p>
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
            <IoMdPerson className="text-4xl text-gold-500" />
            <div>
              <h2 className="text-2xl font-bold text-gold-500">Player Dashboard</h2>
              <p className="text-gray-400">Welcome back, {user?.username}!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">Credits</h3>
                <GiCash className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-gold-400">{user?.credits || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Available balance</p>
            </div>

            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">Level</h3>
                <GiLevelEndFlag className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-white">{user?.player_level || 1}</p>
              <p className="text-xs text-gray-500 mt-1">Player rank</p>
            </div>

            <div className="bg-dark-400 border border-gold-700 rounded-lg p-6 hover:shadow-gold transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gold-500 font-semibold">Promotions</h3>
                <FaGift className="text-2xl text-gold-600" />
              </div>
              <p className="text-4xl font-bold text-white">--</p>
              <p className="text-xs text-gray-500 mt-1">Available offers</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-dark-500 border border-gold-900 rounded-lg">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <GiTrophyCup className="text-gold-600" />
              Full dashboard features coming in Phase 3...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
