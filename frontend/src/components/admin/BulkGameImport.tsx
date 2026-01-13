import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import {
  MdUploadFile,
  MdAdd,
  MdDelete,
  MdContentCopy,
  MdDownload,
  MdInfo
} from 'react-icons/md';
import { gamesApi, type CreateGameRequest } from '@/api/endpoints';

interface BulkGameImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface BulkGame {
  name: string;
  display_name: string;
  category: string;
  icon_url?: string;
  is_active?: boolean;
}

// Predefined game templates for quick import
const GAME_TEMPLATES = {
  popular: [
    { name: 'fire_kirin', display_name: 'Fire Kirin', category: 'fish', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Fire+Kirin' },
    { name: 'golden_dragon', display_name: 'Golden Dragon', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Golden+Dragon' },
    { name: 'panda_master', display_name: 'Panda Master', category: 'fish', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Panda+Master' },
    { name: 'juwa', display_name: 'Juwa', category: 'multi-game', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Juwa' },
    { name: 'game_vault', display_name: 'Game Vault', category: 'multi-game', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Game+Vault' },
    { name: 'orion_stars', display_name: 'Orion Stars', category: 'multi-game', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Orion+Stars' },
    { name: 'vegas_x', display_name: 'Vegas X', category: 'casino', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Vegas+X' },
    { name: 'ultra_panda', display_name: 'Ultra Panda', category: 'fish', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Ultra+Panda' },
    { name: 'milky_way', display_name: 'Milky Way', category: 'sweepstakes', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Milky+Way' },
    { name: 'river_monster', display_name: 'River Monster', category: 'fish', icon_url: 'https://placehold.co/400x300/10B981/333333?text=River+Monster' },
  ],
  slots: [
    { name: 'lucky_777', display_name: 'Lucky 777', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Lucky+777' },
    { name: 'mega_fortune', display_name: 'Mega Fortune', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Mega+Fortune' },
    { name: 'gold_rush', display_name: 'Gold Rush', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Gold+Rush' },
    { name: 'diamond_dreams', display_name: 'Diamond Dreams', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Diamond+Dreams' },
    { name: 'fruit_frenzy', display_name: 'Fruit Frenzy', category: 'slots', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Fruit+Frenzy' },
  ],
  casino: [
    { name: 'blackjack_pro', display_name: 'Blackjack Pro', category: 'casino', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Blackjack+Pro' },
    { name: 'roulette_royale', display_name: 'Roulette Royale', category: 'casino', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Roulette+Royale' },
    { name: 'poker_stars', display_name: 'Poker Stars', category: 'poker', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Poker+Stars' },
    { name: 'baccarat_gold', display_name: 'Baccarat Gold', category: 'casino', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Baccarat+Gold' },
    { name: 'craps_master', display_name: 'Craps Master', category: 'casino', icon_url: 'https://placehold.co/400x300/10B981/333333?text=Craps+Master' },
  ]
};

const SAMPLE_CSV = `name,display_name,category,icon_url
fire_kirin,Fire Kirin,fish,https://placehold.co/400x300/10B981/333333?text=Fire+Kirin
golden_dragon,Golden Dragon,slots,https://placehold.co/400x300/10B981/333333?text=Golden+Dragon
panda_master,Panda Master,fish,https://placehold.co/400x300/10B981/333333?text=Panda+Master`;

const SAMPLE_JSON = JSON.stringify([
  {
    name: "fire_kirin",
    display_name: "Fire Kirin",
    category: "fish",
    icon_url: "https://placehold.co/400x300/10B981/333333?text=Fire+Kirin"
  },
  {
    name: "golden_dragon",
    display_name: "Golden Dragon",
    category: "slots",
    icon_url: "https://placehold.co/400x300/10B981/333333?text=Golden+Dragon"
  }
], null, 2);

export function BulkGameImport({ isOpen, onClose, onImportComplete }: BulkGameImportProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'templates' | 'file'>('templates');
  const [games, setGames] = useState<BulkGame[]>([]);
  const [importing, setImporting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [fileFormat, setFileFormat] = useState<'json' | 'csv'>('json');

  const handleAddGame = () => {
    setGames([...games, {
      name: '',
      display_name: '',
      category: 'slots',
      icon_url: '',
      is_active: true
    }]);
  };

  const handleUpdateGame = (index: number, field: keyof BulkGame, value: any) => {
    const updated = [...games];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-generate name from display_name
    if (field === 'display_name' && value) {
      updated[index].name = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    setGames(updated);
  };

  const handleRemoveGame = (index: number) => {
    setGames(games.filter((_, i) => i !== index));
  };

  const handleLoadTemplate = (templateKey: keyof typeof GAME_TEMPLATES) => {
    setGames(GAME_TEMPLATES[templateKey]);
    toast.success(`Loaded ${GAME_TEMPLATES[templateKey].length} ${templateKey} games`);
  };

  const handleParseText = () => {
    try {
      let parsed: BulkGame[] = [];

      if (fileFormat === 'json') {
        parsed = JSON.parse(textInput);
        if (!Array.isArray(parsed)) {
          throw new Error('JSON must be an array of games');
        }
      } else {
        // Parse CSV
        const lines = textInput.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const game: any = {};

          headers.forEach((header, index) => {
            game[header] = values[index] || '';
          });

          parsed.push(game);
        }
      }

      // Validate parsed games
      const validGames = parsed.filter(g => g.name && g.display_name && g.category);

      if (validGames.length === 0) {
        throw new Error('No valid games found in input');
      }

      setGames(validGames);
      toast.success(`Parsed ${validGames.length} games successfully`);
      setTextInput('');
    } catch (error: any) {
      toast.error(`Parse error: ${error.message}`);
    }
  };

  const handleImport = async () => {
    // Validate games
    const validGames = games.filter(g => g.name && g.display_name && g.category);

    if (validGames.length === 0) {
      toast.error('No valid games to import');
      return;
    }

    setImporting(true);

    try {
      // Convert to API format
      const gameRequests = validGames.map(game => ({
        name: game.name,
        display_name: game.display_name,
        category: game.category,
        icon_url: game.icon_url,
        is_active: game.is_active !== false
      } as CreateGameRequest));

      // Use bulk import API
      const result = await gamesApi.bulkCreateGames(gameRequests);

      // Show results
      if (result.created > 0) {
        toast.success(`Successfully imported ${result.created} games`);
      }

      if (result.errors > 0) {
        toast.error(`Failed to import ${result.errors} games`);

        // Show specific error details
        result.error_details.forEach(error => {
          console.error('Import error:', error);
        });
      }

      // Close modal and refresh on any success
      if (result.created > 0) {
        onImportComplete();
        onClose();
        setGames([]);
      }
    } catch (error: any) {
      toast.error('Failed to import games. Please try again.');
      console.error('Bulk import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? SAMPLE_CSV : SAMPLE_JSON;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_template.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const categories = ['slots', 'casino', 'fish', 'multi-game', 'sweepstakes', 'poker', 'sports', 'arcade', 'other'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Games"
      size="xl"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-emerald-700">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-emerald-500'
            }`}
          >
            Quick Templates
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-emerald-500'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'file'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-emerald-500'
            }`}
          >
            Import File
          </button>
        </div>

        {/* Content */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MdInfo className="text-emerald-500" />
                <p className="text-sm text-gray-400">
                  Quick import popular games with one click
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleLoadTemplate('popular')}
                  className="bg-dark-200 border border-emerald-700 rounded-lg p-4 hover:border-emerald-500 transition-colors"
                >
                  <h4 className="text-emerald-500 font-medium mb-1">Popular Games</h4>
                  <p className="text-xs text-gray-400">10 most popular games</p>
                </button>

                <button
                  onClick={() => handleLoadTemplate('slots')}
                  className="bg-dark-200 border border-emerald-700 rounded-lg p-4 hover:border-emerald-500 transition-colors"
                >
                  <h4 className="text-emerald-500 font-medium mb-1">Slot Games</h4>
                  <p className="text-xs text-gray-400">5 slot machine games</p>
                </button>

                <button
                  onClick={() => handleLoadTemplate('casino')}
                  className="bg-dark-200 border border-emerald-700 rounded-lg p-4 hover:border-emerald-500 transition-colors"
                >
                  <h4 className="text-emerald-500 font-medium mb-1">Casino Games</h4>
                  <p className="text-xs text-gray-400">5 classic casino games</p>
                </button>
              </div>
            </div>

            {games.length > 0 && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="text-emerald-500 font-medium mb-3">
                  Games to Import ({games.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {games.map((game, index) => (
                    <div key={index} className="flex items-center justify-between bg-dark-200 rounded p-2">
                      <div className="flex items-center gap-3">
                        {game.icon_url && (
                          <img
                            src={game.icon_url}
                            alt={game.display_name}
                            className="w-10 h-10 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <p className="text-white font-medium">{game.display_name}</p>
                          <p className="text-xs text-gray-400">{game.name} · {game.category}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveGame(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <MdDelete size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">Add games manually one by one</p>
              <Button onClick={handleAddGame}>
                <MdAdd className="mr-2" />
                Add Game
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {games.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Click "Add Game" to start adding games manually
                </div>
              ) : (
                games.map((game, index) => (
                  <div key={index} className="bg-dark-300 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h5 className="text-emerald-500 font-medium">Game #{index + 1}</h5>
                      <button
                        onClick={() => handleRemoveGame(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <MdDelete size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Display Name *</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g., Fire Kirin"
                          value={game.display_name}
                          onChange={(e) => handleUpdateGame(index, 'display_name', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label">Game ID (auto-generated)</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g., fire_kirin"
                          value={game.name}
                          onChange={(e) => handleUpdateGame(index, 'name', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label">Category *</label>
                        <select
                          className="input"
                          value={game.category}
                          onChange={(e) => handleUpdateGame(index, 'category', e.target.value)}
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label">Icon URL (optional)</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="https://example.com/icon.jpg"
                          value={game.icon_url}
                          onChange={(e) => handleUpdateGame(index, 'icon_url', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">Paste JSON or CSV data</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFileFormat('json')}
                    className={`px-3 py-1 rounded text-xs ${
                      fileFormat === 'json'
                        ? 'bg-emerald-500 text-dark-700'
                        : 'bg-dark-200 text-gray-400'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setFileFormat('csv')}
                    className={`px-3 py-1 rounded text-xs ${
                      fileFormat === 'csv'
                        ? 'bg-emerald-500 text-dark-700'
                        : 'bg-dark-200 text-gray-400'
                    }`}
                  >
                    CSV
                  </button>
                </div>
              </div>

              <textarea
                className="w-full h-48 bg-dark-200 border border-emerald-700 rounded-lg p-3 text-white font-mono text-sm"
                placeholder={fileFormat === 'json' ? 'Paste JSON array here...' : 'Paste CSV data here...'}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />

              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadTemplate(fileFormat)}
                    className="text-emerald-500 hover:text-emerald-400 text-sm flex items-center gap-1"
                  >
                    <MdDownload size={16} />
                    Download Template
                  </button>
                  <button
                    onClick={() => copyToClipboard(fileFormat === 'json' ? SAMPLE_JSON : SAMPLE_CSV)}
                    className="text-emerald-500 hover:text-emerald-400 text-sm flex items-center gap-1"
                  >
                    <MdContentCopy size={16} />
                    Copy Sample
                  </button>
                </div>
                <Button onClick={handleParseText} disabled={!textInput}>
                  Parse Data
                </Button>
              </div>
            </div>

            {games.length > 0 && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="text-emerald-500 font-medium mb-3">
                  Parsed Games ({games.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {games.map((game, index) => (
                    <div key={index} className="flex items-center justify-between bg-dark-200 rounded p-2">
                      <div>
                        <p className="text-white font-medium">{game.display_name}</p>
                        <p className="text-xs text-gray-400">{game.name} · {game.category}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveGame(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <MdDelete size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-dark-400">
          <div className="text-sm text-gray-400">
            {games.length > 0 && (
              <span>{games.length} games ready to import</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={games.length === 0}
            >
              <MdUploadFile className="mr-2" />
              Import {games.length} Games
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}