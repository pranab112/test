import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { BulkGameImport } from './BulkGameImport';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdImage, MdLink, MdCategory, MdUploadFile } from 'react-icons/md';
import { FaGamepad } from 'react-icons/fa';
import { gamesApi, type Game, type CreateGameRequest } from '@/api/endpoints';

export function GamesSection() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const allGames = await gamesApi.getAllGames();
      setGames(allGames);

      // Only show a message if this is the first load and there are no games
      if (allGames.length === 0) {
        console.log('No games in library yet');
      }
    } catch (error: any) {
      console.error('Failed to load games:', error);
      // Don't show error toast for empty states
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (data: CreateGameRequest) => {
    setSaving(true);
    try {
      const game = await gamesApi.createGame(data);

      // Upload image if selected
      if (selectedImage) {
        try {
          const imageResult = await gamesApi.uploadGameImage(game.id, selectedImage);
          game.icon_url = imageResult.icon_url;
        } catch (error) {
          toast.error('Game created but image upload failed');
        }
      }

      toast.success('Game created successfully');
      setShowCreateModal(false);
      setSelectedImage(null);
      setImagePreview('');
      loadGames();
    } catch (error) {
      toast.error('Failed to create game');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGame = async (id: number, data: Partial<CreateGameRequest>) => {
    setSaving(true);
    try {
      await gamesApi.updateGame(id, data);

      // Upload new image if selected
      if (selectedImage) {
        try {
          await gamesApi.uploadGameImage(id, selectedImage);
        } catch (error) {
          toast.error('Game updated but image upload failed');
        }
      }

      toast.success('Game updated successfully');
      setEditingGame(null);
      setSelectedImage(null);
      setImagePreview('');
      loadGames();
    } catch (error) {
      toast.error('Failed to update game');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await gamesApi.deleteGame(id);
      toast.success('Game deleted successfully');
      loadGames();
    } catch (error) {
      toast.error('Failed to delete game');
      console.error(error);
    }
  };

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const columns = [
    {
      key: 'icon',
      label: 'Icon',
      render: (game: Game) => (
        <div className="w-16 h-16 bg-dark-300 rounded-lg overflow-hidden">
          {game.icon_url ? (
            <img
              src={game.icon_url}
              alt={game.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gold-500">
              <FaGamepad size={24} />
            </div>
          )}
        </div>
      ),
      width: '100px',
    },
    {
      key: 'display_name',
      label: 'Game Name',
      render: (game: Game) => (
        <div>
          <p className="font-medium text-white">{game.display_name}</p>
          <p className="text-xs text-gray-400">{game.name}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (game: Game) => (
        <Badge variant="info">
          {game.category || 'Uncategorized'}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (game: Game) => (
        <Badge variant={game.is_active ? 'success' : 'error'} dot>
          {game.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (game: Game) => new Date(game.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (game: Game) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingGame(game)}
            className="text-gold-500 hover:text-gold-400 transition-colors"
            title="Edit"
          >
            <MdEdit size={20} />
          </button>
          <button
            onClick={() => handleDeleteGame(game.id, game.display_name)}
            className="text-red-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <MdDelete size={20} />
          </button>
        </div>
      ),
    },
  ];

  const categories = [
    'slots',
    'casino',
    'fish',
    'multi-game',
    'sweepstakes',
    'poker',
    'sports',
    'arcade',
    'other',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">Game Library</h1>
          <p className="text-gray-400">Manage available games for clients</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
            <MdUploadFile className="mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <MdAdd className="mr-2" />
            Add Game
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-200 border border-gold-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Games</p>
          <p className="text-2xl font-bold text-gold-500">{games.length}</p>
        </div>
        <div className="bg-dark-200 border border-gold-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active Games</p>
          <p className="text-2xl font-bold text-green-500">
            {games.filter(g => g.is_active).length}
          </p>
        </div>
        <div className="bg-dark-200 border border-gold-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Categories</p>
          <p className="text-2xl font-bold text-blue-500">
            {[...new Set(games.map(g => g.category).filter(Boolean))].length}
          </p>
        </div>
        <div className="bg-dark-200 border border-gold-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Inactive</p>
          <p className="text-2xl font-bold text-red-500">
            {games.filter(g => !g.is_active).length}
          </p>
        </div>
      </div>

      {/* Games Table */}
      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading games...</div>
      ) : (
        <DataTable
          data={games}
          columns={columns}
          emptyMessage="No games found. Add your first game to get started!"
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingGame) && (
        <GameFormModal
          isOpen={showCreateModal || !!editingGame}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGame(null);
            setSelectedImage(null);
            setImagePreview('');
          }}
          onSubmit={editingGame
            ? (data) => handleUpdateGame(editingGame.id, data)
            : handleCreateGame
          }
          game={editingGame}
          saving={saving}
          categories={categories}
          selectedImage={selectedImage}
          imagePreview={imagePreview || editingGame?.icon_url || ''}
          onImageSelect={handleImageSelect}
        />
      )}

      {/* Bulk Import Modal */}
      <BulkGameImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImportComplete={loadGames}
      />
    </div>
  );
}

interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGameRequest) => void;
  game?: Game | null;
  saving: boolean;
  categories: string[];
  selectedImage: File | null;
  imagePreview: string;
  onImageSelect: (file: File) => void;
}

function GameFormModal({
  isOpen,
  onClose,
  onSubmit,
  game,
  saving,
  categories,
  selectedImage,
  imagePreview,
  onImageSelect,
}: GameFormModalProps) {
  const [formData, setFormData] = useState<CreateGameRequest>({
    name: game?.name || '',
    display_name: game?.display_name || '',
    icon_url: game?.icon_url || '',
    category: game?.category || 'slots',
    is_active: game?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={game ? 'Edit Game' : 'Add New Game'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Form Fields */}
          <div className="space-y-4">
            <Input
              label="Game ID (Unique Identifier)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g., fire_kirin"
              required
              disabled={!!game}
            />

            <Input
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., Fire Kirin"
              required
            />

            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Game Link/URL (Optional)"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              placeholder="https://game-provider.com/game-link"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-gold-500 bg-dark-200 border-gold-700 rounded focus:ring-gold-500"
              />
              <label htmlFor="is_active" className="text-gray-300">
                Game is active and available
              </label>
            </div>
          </div>

          {/* Right Column - Image Upload */}
          <div className="space-y-4">
            <div>
              <label className="label">Game Cover Image</label>
              <div className="bg-dark-300 border-2 border-dashed border-gold-700 rounded-lg p-4">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onImageSelect(null as any);
                        setFormData({ ...formData, icon_url: '' });
                      }}
                      className="w-full text-red-500 hover:text-red-400 text-sm"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center justify-center py-8">
                      <MdImage className="text-4xl text-gold-500 mb-2" />
                      <p className="text-gold-500 font-medium">Click to upload image</p>
                      <p className="text-gray-400 text-xs mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && onImageSelect(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              {selectedImage && (
                <p className="text-xs text-gray-400 mt-2">
                  Selected: {selectedImage.name}
                </p>
              )}
            </div>

            <div className="bg-dark-300 rounded-lg p-3">
              <h4 className="text-gold-500 font-medium mb-2 flex items-center gap-2">
                <MdCategory size={18} />
                Category Guidelines
              </h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• <strong>Slots:</strong> Slot machine games</li>
                <li>• <strong>Casino:</strong> Traditional casino games</li>
                <li>• <strong>Fish:</strong> Fish hunting games</li>
                <li>• <strong>Multi-game:</strong> Platforms with multiple games</li>
                <li>• <strong>Sweepstakes:</strong> Sweepstakes games</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-dark-400">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {game ? 'Update' : 'Add'} Game
          </Button>
        </div>
      </form>
    </Modal>
  );
}