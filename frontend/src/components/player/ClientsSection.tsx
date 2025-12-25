import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { MdStar } from 'react-icons/md';
import toast from 'react-hot-toast';

// Game library images mapping
const GAME_IMAGES = [
  { name: 'Egames', image: 'Egames.png' },
  { name: 'Gameroom Online', image: 'Gameroom online.png' },
  { name: 'Highstake', image: 'Highstake.jpg' },
  { name: 'Megaspin', image: 'Megaspin.jpg' },
  { name: 'Panda Master', image: 'Panda Master.jpg' },
  { name: 'Paracasino', image: 'Paracasino.jpg' },
  { name: 'Rivermonster', image: 'Rivermonster.png' },
  { name: 'Vega Sweeps', image: 'Vega Sweeps.png' },
  { name: 'Blue Dragon', image: 'bluedragon.png' },
  { name: 'Cash Frenzy', image: 'cashfrenzy 1.png' },
  { name: 'Cash Machine', image: 'cashmachine.png' },
  { name: 'Casino Ignitee', image: 'casinoignitee.jpg' },
  { name: 'Casino Royale', image: 'casinoroyale.png' },
  { name: 'Fire Kirin', image: 'firekirin.png' },
  { name: 'Game Vault', image: 'gamevault.png' },
  { name: 'Joker 777', image: 'joker 777.png' },
  { name: 'Juwa Online', image: 'juwaonline.png' },
  { name: 'Loot', image: 'loot.jpg' },
  { name: 'Milky Way', image: 'milkyway 2.png' },
  { name: 'Moolah', image: 'moolah.jpg' },
  { name: 'Orion Stars', image: 'orionstars.jpg' },
  { name: 'River Sweeps', image: 'riversweeps.png' },
  { name: 'Ultra Panda', image: 'ultrapanda.png' },
  { name: 'VBlink', image: 'vblink 2.png' },
  { name: 'Vegas X', image: 'vegas x.png' },
  { name: 'Vegas Roll', image: 'vegasroll.png' },
  { name: 'Winstar', image: 'winstar.png' },
  { name: 'Yolo 777', image: 'yolo777.png' },
];

interface Client {
  id: number;
  username: string;
  company_name: string;
  is_online: boolean;
  promotions: number;
  rating: number;
  games: string[];
}

// TODO: Replace with API data
const MOCK_CLIENTS: Client[] = [
  {
    id: 1,
    username: 'client_abc',
    company_name: 'ABC Gaming Company',
    is_online: true,
    promotions: 5,
    rating: 4.8,
    games: ['Fire Kirin', 'Game Vault', 'Ultra Panda', 'Vegas X', 'Orion Stars'],
  },
  {
    id: 2,
    username: 'client_xyz',
    company_name: 'XYZ Casino Corporation',
    is_online: false,
    promotions: 3,
    rating: 4.5,
    games: ['Milky Way', 'River Sweeps', 'Panda Master', 'Cash Frenzy'],
  },
  {
    id: 3,
    username: 'client_golden',
    company_name: 'Golden Entertainment',
    is_online: true,
    promotions: 8,
    rating: 4.9,
    games: ['VBlink', 'Joker 777', 'Blue Dragon', 'Casino Royale', 'Vega Sweeps'],
  },
];

export function ClientsSection() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showGamesModal, setShowGamesModal] = useState(false);

  const handleViewGames = (client: Client) => {
    setSelectedClient(client);
    setShowGamesModal(true);
  };

  const columns = [
    {
      key: 'username',
      label: 'Client',
      render: (client: Client) => (
        <div className="flex items-center gap-3">
          <Avatar name={client.company_name} size="sm" online={client.is_online} />
          <div>
            <div className="font-medium text-white">{client.username}</div>
            <div className="text-xs text-gray-400">{client.company_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_online',
      label: 'Status',
      render: (client: Client) => (
        <Badge variant={client.is_online ? 'success' : 'default'} dot>
          {client.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'promotions',
      label: 'Active Promotions',
      render: (client: Client) => (
        <Badge variant="info">{client.promotions}</Badge>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (client: Client) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{client.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'games',
      label: 'Games',
      render: (client: Client) => (
        <Badge variant="purple">{client.games.length} Games</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (client: Client) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewGames(client)}
            className="text-gold-500 hover:text-gold-400 text-sm font-medium"
          >
            View Games
          </button>
          <button
            onClick={() => toast.success('Viewing promotions...')}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            View Offers
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Available Clients</h1>
        <p className="text-gray-400">Browse clients and explore their game libraries</p>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4">Client Friends</h2>
        <DataTable
          data={MOCK_CLIENTS}
          columns={columns}
          emptyMessage="No clients found"
        />
      </div>

      {/* Games Library Modal */}
      {showGamesModal && selectedClient && (
        <Modal
          isOpen={showGamesModal}
          onClose={() => {
            setShowGamesModal(false);
            setSelectedClient(null);
          }}
          title={`${selectedClient.company_name} - Game Library`}
          size="xl"
        >
          <GamesLibrary client={selectedClient} />
        </Modal>
      )}
    </div>
  );
}

function GamesLibrary({ client }: { client: Client }) {
  const clientGames = GAME_IMAGES.filter(game =>
    client.games.includes(game.name)
  );

  return (
    <div className="space-y-6">
      <div className="bg-dark-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gold-500">{client.company_name}</h3>
            <p className="text-gray-400 text-sm">@{client.username}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <MdStar className="text-gold-500 text-xl" />
              <span className="font-bold text-white text-lg">{client.rating}/5</span>
            </div>
            <Badge variant={client.is_online ? 'success' : 'default'} dot>
              {client.is_online ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Games:</span>
            <Badge variant="purple">{client.games.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Active Promotions:</span>
            <Badge variant="info">{client.promotions}</Badge>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-bold text-gold-500 mb-4">Available Games</h4>
        {clientGames.length === 0 ? (
          <div className="text-center py-12 bg-dark-300 rounded-lg">
            <p className="text-gray-400">No games available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clientGames.map((game, index) => (
              <GameCard key={index} game={game} clientName={client.company_name} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => toast.success(`Viewing promotions from ${client.company_name}`)}
        >
          View Promotions ({client.promotions})
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => toast.success(`Sending message to ${client.company_name}`)}
        >
          Send Message
        </Button>
      </div>
    </div>
  );
}

function GameCard({ game, clientName }: { game: typeof GAME_IMAGES[0]; clientName: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-dark-300 rounded-lg overflow-hidden border-2 border-gold-700 hover:shadow-gold transition-all transform hover:scale-105 cursor-pointer">
      <div className="aspect-square bg-dark-400 relative overflow-hidden">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🎮</div>
              <p className="text-xs">{game.name}</p>
            </div>
          </div>
        ) : (
          <img
            src={`/images/games/${game.image}`}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="p-3">
        <h5 className="font-bold text-white text-sm mb-1 truncate">{game.name}</h5>
        <p className="text-xs text-gray-400 truncate">by {clientName}</p>
      </div>
    </div>
  );
}
