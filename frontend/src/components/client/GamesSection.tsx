import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import {
  MdSearch,
  MdEdit,
  MdLink,
  MdCheck,
  MdSave,
  MdAdd,
  MdRemove,
  MdVideogameAsset,
} from 'react-icons/md';
import { FaGamepad } from 'react-icons/fa';
import { gamesApi, type Game, type ClientGame } from '@/api/endpoints';

type TabType = 'my-games' | 'library';

export function GamesSection() {
  const [activeTab, setActiveTab] = useState<TabType>('my-games');
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [clientGames, setClientGames] = useState<ClientGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<number>>(new Set());

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<ClientGame | null>(null);
  const [editFormData, setEditFormData] = useState({
    game_link: '',
    custom_image_url: '',
    is_active: true,
  });

  useEffect(() => {
    loadGamesData();

    // Refresh games periodically to get latest updates from admin
    const interval = setInterval(() => {
      loadGamesData();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadGamesData = async () => {
    setLoading(true);
    try {
      // Get all available games using the API client
      const allGamesData = await gamesApi.getAvailableGames();
      setAllGames(allGamesData);

      // Get client's selected games
      const clientGamesData = await gamesApi.getClientGames();
      setClientGames(clientGamesData);
      const selected = new Set(clientGamesData.map(cg => cg.game_id));
      setSelectedGameIds(selected);

      // Log for debugging
      if (allGamesData.length === 0) {
        console.log('No games available in library yet. Admin needs to add games.');
      }
    } catch (error: any) {
      console.error('Failed to load games:', error);
      // Don't show error toast for empty states
      setAllGames([]);
      setClientGames([]);
      setSelectedGameIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = (gameId: number) => {
    const newSelected = new Set(selectedGameIds);
    newSelected.add(gameId);
    setSelectedGameIds(newSelected);
  };

  const handleRemoveGame = (gameId: number) => {
    const newSelected = new Set(selectedGameIds);
    newSelected.delete(gameId);
    setSelectedGameIds(newSelected);
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      await gamesApi.selectGames(Array.from(selectedGameIds));
      toast.success('Game selection updated successfully');
      loadGamesData();
      setActiveTab('my-games');
    } catch (error) {
      toast.error('Failed to update game selection');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditGame = (game: ClientGame) => {
    setEditingGame(game);
    setEditFormData({
      game_link: game.game_link || '',
      custom_image_url: game.custom_image_url || '',
      is_active: game.is_active,
    });
    setEditModalOpen(true);
  };

  const handleUpdateGame = async () => {
    if (!editingGame) return;

    setSaving(true);
    try {
      await gamesApi.updateClientGame(editingGame.id, editFormData);
      toast.success('Game updated successfully');
      setEditModalOpen(false);
      loadGamesData();
    } catch (error) {
      toast.error('Failed to update game');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Filter games based on search and category
  const filteredLibraryGames = allGames.filter(game => {
    const matchesSearch = game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || game.category === categoryFilter;
    return matchesSearch && matchesCategory && game.is_active;
  });

  const filteredClientGames = clientGames.filter(cg => {
    if (!cg.game) return false;
    const matchesSearch = cg.game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cg.game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || cg.game.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(allGames.map(g => g.category).filter(Boolean))];
  const hasChanges = selectedGameIds.size !== clientGames.filter(cg => cg.is_active).length ||
    [...selectedGameIds].some(id => !clientGames.find(cg => cg.game_id === id && cg.is_active));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500">Games Library</h1>
        <p className="text-gray-400">Manage and customize your game offerings</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gold-700">
        <button
          onClick={() => setActiveTab('my-games')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'my-games'
              ? 'text-gold-500 border-b-2 border-gold-500'
              : 'text-gray-400 hover:text-gold-500'
          }`}
        >
          My Games ({clientGames.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'library'
              ? 'text-gold-500 border-b-2 border-gold-500'
              : 'text-gray-400 hover:text-gold-500'
          }`}
        >
          Game Library ({allGames.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-200 border border-gold-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-dark-200 border border-gold-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat || 'uncategorized'} value={cat || ''}>
              {cat ? cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ') : 'Uncategorized'}
            </option>
          ))}
        </select>
        {activeTab === 'library' && hasChanges && (
          <Button onClick={handleSaveSelection} loading={saving}>
            <MdSave className="mr-2" />
            Save Selection
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading games...</div>
      ) : allGames.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <MdVideogameAsset className="text-6xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No games available in the library yet</p>
          <p className="text-sm text-gray-500">Please contact the admin to add games to the system</p>
        </div>
      ) : activeTab === 'my-games' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClientGames.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MdVideogameAsset className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No games selected yet</p>
              <Button onClick={() => setActiveTab('library')}>
                Browse Game Library
              </Button>
            </div>
          ) : (
            filteredClientGames.map((clientGame) => (
              <div
                key={clientGame.id}
                className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden hover:shadow-gold transition-all"
              >
                <div className="aspect-video bg-dark-300 relative">
                  {clientGame.custom_image_url || clientGame.game?.icon_url ? (
                    <img
                      src={clientGame.custom_image_url || clientGame.game?.icon_url || ''}
                      alt={clientGame.game?.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaGamepad className="text-4xl text-gold-500 opacity-50" />
                    </div>
                  )}
                  <Badge
                    variant={clientGame.is_active ? 'success' : 'error'}
                    className="absolute top-2 right-2"
                  >
                    {clientGame.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white mb-1">
                    {clientGame.game?.display_name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {clientGame.game?.category}
                  </p>
                  {clientGame.game_link && (
                    <div className="flex items-center gap-1 text-xs text-gold-500 mb-3">
                      <MdLink size={14} />
                      <span className="truncate">{clientGame.game_link}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleEditGame(clientGame)}
                    className="w-full bg-dark-300 text-gold-500 py-2 rounded-lg hover:bg-dark-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <MdEdit size={16} />
                    Customize
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLibraryGames.map((game) => {
            const isSelected = selectedGameIds.has(game.id);
            return (
              <div
                key={game.id}
                className={`bg-dark-200 border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                  isSelected ? 'border-gold-500 shadow-gold' : 'border-gold-700 hover:border-gold-600'
                }`}
                onClick={() => isSelected ? handleRemoveGame(game.id) : handleAddGame(game.id)}
              >
                <div className="aspect-video bg-dark-300 relative">
                  {game.icon_url ? (
                    <img
                      src={game.icon_url}
                      alt={game.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaGamepad className="text-4xl text-gold-500 opacity-50" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gold-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-gold-500 text-dark-700 rounded-full p-2">
                        <MdCheck size={32} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white mb-1">{game.display_name}</h3>
                  <p className="text-xs text-gray-400">{game.category}</p>
                  <button className={`mt-3 w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gold-gradient text-dark-700 hover:shadow-gold'
                  }`}>
                    {isSelected ? (
                      <>
                        <MdRemove size={16} />
                        Remove
                      </>
                    ) : (
                      <>
                        <MdAdd size={16} />
                        Add to My Games
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Customize: ${editingGame?.game?.display_name}`}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Game Link/URL"
            value={editFormData.game_link}
            onChange={(e) => setEditFormData({ ...editFormData, game_link: e.target.value })}
            placeholder="https://your-game-link.com"
          />

          <Input
            label="Custom Image URL (Optional)"
            value={editFormData.custom_image_url}
            onChange={(e) => setEditFormData({ ...editFormData, custom_image_url: e.target.value })}
            placeholder="https://your-image-url.com/image.jpg"
          />

          {editFormData.custom_image_url && (
            <div className="bg-dark-300 rounded-lg p-2">
              <img
                src={editFormData.custom_image_url}
                alt="Preview"
                className="w-full h-48 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = editingGame?.game?.icon_url || '';
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editFormData.is_active}
              onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
              className="w-4 h-4 text-gold-500 bg-dark-200 border-gold-700 rounded focus:ring-gold-500"
            />
            <label htmlFor="is_active" className="text-gray-300">
              Game is active for players
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGame} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}