import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { MdStar, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import { friendsApi, type FriendDetails } from '@/api/endpoints/friends.api';
import { gamesApi, type Game } from '@/api/endpoints/games.api';
import { reviewsApi, type ReviewStats } from '@/api/endpoints/reviews.api';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { useDashboard } from '@/contexts/DashboardContext';

interface ClientWithDetails extends FriendDetails {
  games: Game[];
  reviewStats: ReviewStats | null;
  promotionsCount: number;
}

export function ClientsSection() {
  const { setActiveSection } = useDashboard();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [showGamesModal, setShowGamesModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      // Get friends and filter for clients only
      const friends = await friendsApi.getFriends();
      const clientFriends = friends.filter(f => f.user_type === 'client');

      // Load additional details for each client
      const clientsWithDetails = await Promise.all(
        clientFriends.map(async (client) => {
          const [games, reviewStats, promotions] = await Promise.all([
            gamesApi.getGamesForClient(client.id).catch(() => []),
            reviewsApi.getUserReviewStats(client.id).catch(() => null),
            promotionsApi.getAvailablePromotions().catch(() => []),
          ]);

          // Filter promotions for this client
          const clientPromotions = promotions.filter((p: any) => p.client_id === client.id && p.is_active);

          return {
            ...client,
            games,
            reviewStats,
            promotionsCount: clientPromotions.length,
          };
        })
      );

      setClients(clientsWithDetails);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewGames = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setShowGamesModal(true);
  };

  const handleViewPromotions = (client: ClientWithDetails) => {
    // Navigate to promotions section with client filter
    toast.success(`Viewing promotions from ${client.full_name || client.username}`);
    setActiveSection('promotions');
  };

  const columns = [
    {
      key: 'username',
      label: 'Client',
      render: (client: ClientWithDetails) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={client.full_name || client.username}
            size="sm"
            online={client.is_online}
            src={client.profile_picture}
          />
          <div>
            <div className="font-medium text-white">{client.username}</div>
            <div className="text-xs text-gray-400">{client.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_online',
      label: 'Status',
      render: (client: ClientWithDetails) => (
        <Badge variant={client.is_online ? 'success' : 'default'} dot>
          {client.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'promotions',
      label: 'Active Promotions',
      render: (client: ClientWithDetails) => (
        <Badge variant="info">{client.promotionsCount}</Badge>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (client: ClientWithDetails) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-emerald-500" />
          <span className="font-medium">
            {client.reviewStats?.average_rating
              ? `${client.reviewStats.average_rating.toFixed(1)}/5`
              : 'N/A'}
          </span>
          {client.reviewStats?.total_reviews ? (
            <span className="text-xs text-gray-400">
              ({client.reviewStats.total_reviews})
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'games',
      label: 'Games',
      render: (client: ClientWithDetails) => (
        <Badge variant="purple">{client.games.length} Games</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (client: ClientWithDetails) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewGames(client)}
            className="text-emerald-500 hover:text-emerald-400 text-sm font-medium"
          >
            View Games
          </button>
          <button
            onClick={() => handleViewPromotions(client)}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            View Offers
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-emerald-500">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Available Clients</h1>
          <p className="text-gray-400">Browse clients and explore their game libraries</p>
        </div>
        <button
          type="button"
          onClick={loadClients}
          className="bg-dark-300 hover:bg-dark-400 text-emerald-500 p-3 rounded-lg transition-colors"
          title="Refresh"
        >
          <MdRefresh size={20} />
        </button>
      </div>

      <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-emerald-500 mb-4">Client Friends</h2>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No client friends yet</p>
            <p className="text-sm text-gray-500">Add clients as friends to see them here</p>
            <Button
              onClick={() => setActiveSection('friends')}
              className="mt-4"
            >
              Find Clients
            </Button>
          </div>
        ) : (
          <DataTable
            data={clients}
            columns={columns}
            emptyMessage="No clients found"
          />
        )}
      </div>

      {/* Games Library Modal */}
      {showGamesModal && selectedClient && (
        <Modal
          isOpen={showGamesModal}
          onClose={() => {
            setShowGamesModal(false);
            setSelectedClient(null);
          }}
          title={`${selectedClient.full_name || selectedClient.username} - Game Library`}
          size="xl"
        >
          <GamesLibrary client={selectedClient} onViewPromotions={handleViewPromotions} />
        </Modal>
      )}
    </div>
  );
}

function GamesLibrary({
  client,
  onViewPromotions
}: {
  client: ClientWithDetails;
  onViewPromotions: (client: ClientWithDetails) => void;
}) {
  const { openChatWith } = useDashboard();

  const handleSendMessage = () => {
    openChatWith({
      id: client.id,
      username: client.username,
      full_name: client.full_name,
      profile_picture: client.profile_picture,
      is_online: client.is_online,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={client.full_name || client.username}
              size="lg"
              src={client.profile_picture}
              online={client.is_online}
            />
            <div>
              <h3 className="text-xl font-bold text-emerald-500">{client.full_name || client.username}</h3>
              <p className="text-gray-400 text-sm">@{client.username}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <MdStar className="text-emerald-500 text-xl" />
              <span className="font-bold text-white text-lg">
                {client.reviewStats?.average_rating
                  ? `${client.reviewStats.average_rating.toFixed(1)}/5`
                  : 'N/A'}
              </span>
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
            <Badge variant="info">{client.promotionsCount}</Badge>
          </div>
          {client.reviewStats && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Reviews:</span>
              <Badge variant="default">{client.reviewStats.total_reviews}</Badge>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-bold text-emerald-500 mb-4">Available Games</h4>
        {client.games.length === 0 ? (
          <div className="text-center py-12 bg-dark-300 rounded-lg">
            <p className="text-gray-400">No games available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {client.games.map((game) => (
              <GameCard key={game.id} game={game} clientName={client.full_name || client.username} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => onViewPromotions(client)}
        >
          View Promotions ({client.promotionsCount})
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={handleSendMessage}
        >
          Send Message
        </Button>
      </div>
    </div>
  );
}

function GameCard({ game, clientName }: { game: Game; clientName: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-dark-300 rounded-lg overflow-hidden border-2 border-emerald-700 hover:shadow-green transition-all transform hover:scale-105 cursor-pointer">
      <div className="aspect-square bg-dark-400 relative overflow-hidden">
        {imageError || !game.icon_url ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🎮</div>
              <p className="text-xs">{game.display_name}</p>
            </div>
          </div>
        ) : (
          <img
            src={game.icon_url}
            alt={game.display_name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="p-3">
        <h5 className="font-bold text-white text-sm mb-1 truncate">{game.display_name}</h5>
        <p className="text-xs text-gray-400 truncate">by {clientName}</p>
        {game.category && (
          <Badge variant="default" size="sm" className="mt-1">
            {game.category}
          </Badge>
        )}
      </div>
    </div>
  );
}
