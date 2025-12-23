import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg-darker p-8">
      <div className="max-w-7xl mx-auto">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary-gold glow-gold">
              Admin Dashboard
            </h1>
            <button
              onClick={logout}
              className="btn-secondary text-sm py-2 px-4"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-300">Welcome, {user?.username}!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg-dark border border-border-gold rounded-lg p-4">
                <h3 className="text-primary-gold font-semibold mb-2">Total Users</h3>
                <p className="text-3xl font-bold">--</p>
              </div>
              <div className="bg-bg-dark border border-border-gold rounded-lg p-4">
                <h3 className="text-primary-gold font-semibold mb-2">Pending Approvals</h3>
                <p className="text-3xl font-bold">--</p>
              </div>
              <div className="bg-bg-dark border border-border-gold rounded-lg p-4">
                <h3 className="text-primary-gold font-semibold mb-2">Active Reports</h3>
                <p className="text-3xl font-bold">--</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              🚧 Full dashboard coming in Phase 3...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
