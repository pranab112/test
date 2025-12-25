import { FaGamepad } from 'react-icons/fa';

export function GamesSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gold-500">Games Management</h1>
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
        <FaGamepad className="text-6xl text-gold-500 mx-auto mb-4" />
        <p className="text-gray-400">Games management coming soon</p>
      </div>
    </div>
  );
}
