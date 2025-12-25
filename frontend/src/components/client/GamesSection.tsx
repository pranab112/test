import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import {
  MdSearch,
  MdEdit,
  MdLink,
  MdImage,
  MdCheck,
  MdClose,
  MdSave,
  MdFilterList,
} from 'react-icons/md';
import { FaGamepad } from 'react-icons/fa';
import {
  clientApi,
  type Game,
  type ClientGameWithDetails,
} from '@/api/endpoints';

type TabType = 'my-games' | 'all-games';

export function GamesSection() {
  const [activeTab, setActiveTab] = useState<TabType>('my-games');
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<ClientGameWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<ClientGameWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState({
    game_link: '',
    custom_image_url: '',
  });

  useEffect(() => {
    loadGamesData();
  }, []);

  const loadGamesData = async () => {
    setLoading(true);
    try {
      const [allGamesData, myGamesData] = await Promise.all([
        clientApi.getAllGames(),
        clientApi.getMyGamesWithDetails(),
      ]);
      setAllGames(allGamesData);
      setMyGames(myGamesData.games);

      // Initialize selected game IDs from my games
      const activeGameIds = new Set(
        myGamesData.games.filter((g) => g.is_active).map((g) => g.game_id)
      );
      setSelectedGameIds(activeGameIds);
    } catch (error: any) {
      toast.error('Failed to load games');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGame = (gameId: number) => {
    setSelectedGameIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
    setHasChanges(true);
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      await clientApi.updateGameSelection(Array.from(selectedGameIds));
      // Reload my games to get updated data
      const myGamesData = await clientApi.getMyGamesWithDetails();
      setMyGames(myGamesData.games);
      setHasChanges(false);
      toast.success('Game selection saved successfully');
    } catch (error: any) {
      toast.error('Failed to save game selection');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditGame = (clientGame: ClientGameWithDetails) => {
    setEditingGame(clientGame);
    setEditFormData({
      game_link: clientGame.game_link || '',
      custom_image_url: clientGame.custom_image_url || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveGameEdit = async () => {
    if (!editingGame) return;

    setSaving(true);
    try {
      const updatedGame = await clientApi.updateClientGame(editingGame.id, {
        game_link: editFormData.game_link || undefined,
        custom_image_url: editFormData.custom_image_url || undefined,
      });

      // Update local state
      setMyGames((prev) =>
        prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
      );

      setEditModalOpen(false);
      setEditingGame(null);
      toast.success('Game updated successfully');
    } catch (error: any) {
      toast.error('Failed to update game');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGameActive = async (clientGame: ClientGameWithDetails) => {
    setSaving(true);
    try {
      const updatedGame = await clientApi.updateClientGame(clientGame.id, {
        is_active: !clientGame.is_active,
      });

      setMyGames((prev) =>
        prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
      );

      // Update selected game IDs
      setSelectedGameIds((prev) => {
        const newSet = new Set(prev);
        if (updatedGame.is_active) {
          newSet.add(updatedGame.game_id);
        } else {
          newSet.delete(updatedGame.game_id);
        }
        return newSet;
      });

      toast.success(
        updatedGame.is_active ? 'Game activated' : 'Game deactivated'
      );
    } catch (error: any) {
      toast.error('Failed to update game status');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Get unique categories from all games
  const categories = ['all', ...new Set(allGames.map((g) => g.category).filter(Boolean))];

  // Filter games based on search and category
  const filteredAllGames = allGames.filter((game) => {
    const matchesSearch =
      game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || game.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredMyGames = myGames.filter((clientGame) => {
    const game = clientGame.game;
    const matchesSearch =
      game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || game.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Games Management</h1>
          <p className="text-gray-400">
            Select games to offer your players and customize them
          </p>
        </div>
        {hasChanges && activeTab === 'all-games' && (
          <Button onClick={handleSaveSelection} loading={saving}>
            <MdSave className="mr-2" />
            Save Selection
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gold-700">
        <button
          onClick={() => setActiveTab('my-games')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'my-games'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          My Games ({myGames.filter((g) => g.is_active).length})
        </button>
        <button
          onClick={() => setActiveTab('all-games')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'all-games'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          All Games ({allGames.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-300 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <div className="relative min-w-[180px]">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            title="Filter by category"
            aria-label="Filter by category"
            className="w-full bg-dark-300 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* My Games Tab */}
      {activeTab === 'my-games' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          {filteredMyGames.length === 0 ? (
            <div className="text-center py-12">
              <FaGamepad className="text-6xl text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {myGames.length === 0
                  ? "You haven't selected any games yet"
                  : 'No games match your search'}
              </p>
              {myGames.length === 0 && (
                <Button onClick={() => setActiveTab('all-games')}>
                  Browse All Games
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMyGames.map((clientGame) => (
                <div
                  key={clientGame.id}
                  className={`bg-dark-300 rounded-lg overflow-hidden hover:bg-dark-400 transition-all ${
                    !clientGame.is_active ? 'opacity-50' : ''
                  }`}
                >
                  {/* Game Image */}
                  <div className="relative h-40 bg-dark-400">
                    {clientGame.custom_image_url || clientGame.game.icon_url ? (
                      <img
                        src={clientGame.custom_image_url || clientGame.game.icon_url || ''}
                        alt={clientGame.game.display_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaGamepad className="text-4xl text-gray-500" />
                      </div>
                    )}
                    {clientGame.custom_image_url && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Custom Image
                      </div>
                    )}
                  </div>

                  {/* Game Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-1">
                      {clientGame.game.display_name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {clientGame.game.category || 'Uncategorized'}
                    </p>

                    {/* Custom Link Display */}
                    {clientGame.game_link && (
                      <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
                        <MdLink size={14} />
                        <span className="truncate">{clientGame.game_link}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGame(clientGame)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <MdEdit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleGameActive(clientGame)}
                        disabled={saving}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                          clientGame.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {clientGame.is_active ? (
                          <>
                            <MdClose size={16} />
                            Disable
                          </>
                        ) : (
                          <>
                            <MdCheck size={16} />
                            Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Games Tab */}
      {activeTab === 'all-games' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-400">
              Select the games you want to offer to your players
            </p>
            <p className="text-gold-500 font-medium">
              {selectedGameIds.size} games selected
            </p>
          </div>

          {filteredAllGames.length === 0 ? (
            <div className="text-center py-12">
              <FaGamepad className="text-6xl text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No games match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAllGames.map((game) => {
                const isSelected = selectedGameIds.has(game.id);
                return (
                  <button
                    key={game.id}
                    onClick={() => handleToggleGame(game.id)}
                    className={`bg-dark-300 rounded-lg overflow-hidden hover:bg-dark-400 transition-all text-left relative ${
                      isSelected ? 'ring-2 ring-gold-500' : ''
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 bg-gold-500 text-dark-700 rounded-full p-1">
                        <MdCheck size={16} />
                      </div>
                    )}

                    {/* Game Image */}
                    <div className="relative h-32 bg-dark-400">
                      {game.icon_url ? (
                        <img
                          src={game.icon_url}
                          alt={game.display_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaGamepad className="text-4xl text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Game Info */}
                    <div className="p-3">
                      <h3 className="text-white font-medium text-sm mb-1">
                        {game.display_name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {game.category || 'Uncategorized'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Game Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingGame(null);
        }}
        title={`Edit ${editingGame?.game.display_name || 'Game'}`}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Customize the game link and image for your players.
          </p>

          <div className="relative">
            <div className="absolute left-3 top-[38px] text-gray-400">
              <MdLink size={18} />
            </div>
            <Input
              label="Game Link (URL)"
              type="url"
              value={editFormData.game_link}
              onChange={(e) =>
                setEditFormData({ ...editFormData, game_link: e.target.value })
              }
              placeholder="https://example.com/game"
              className="pl-10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom URL where players can access this game
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-[38px] text-gray-400">
              <MdImage size={18} />
            </div>
            <Input
              label="Custom Image URL"
              type="url"
              value={editFormData.custom_image_url}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  custom_image_url: e.target.value,
                })
              }
              placeholder="https://example.com/image.png"
              className="pl-10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom game image URL (leave empty to use default)
            </p>
          </div>

          {/* Image Preview */}
          {editFormData.custom_image_url && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Image Preview:</p>
              <div className="bg-dark-400 rounded-lg overflow-hidden h-32 w-full">
                <img
                  src={editFormData.custom_image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Invalid image URL';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setEditModalOpen(false);
                setEditingGame(null);
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleSaveGameEdit} loading={saving} fullWidth>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
