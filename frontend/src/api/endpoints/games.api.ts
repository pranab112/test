import { apiClient } from '../client';
import { fileUploadService } from '@/services/fileUpload.service';

export interface Game {
  id: number;
  name: string;
  display_name: string;
  icon_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateGameRequest {
  name: string;
  display_name: string;
  icon_url?: string;
  category?: string;
  is_active?: boolean;
}

export interface UpdateGameRequest {
  name?: string;
  display_name?: string;
  icon_url?: string;
  category?: string;
  is_active?: boolean;
}

export interface ClientGame {
  id: number;
  client_id: number;
  game_id: number;
  is_active: boolean;
  game_link?: string;
  custom_image_url?: string;
  created_at: string;
  updated_at?: string;
  game?: Game;
}

export const gamesApi = {
  // Admin endpoints
  getAllGames: async (): Promise<Game[]> => {
    try {
      // Fetch all games from backend
      const response = await apiClient.get<never, Game[]>('/admin/games');
      return response;
    } catch (error: any) {
      // If it's a 404, return empty array (no games yet)
      if (error?.response?.status === 404 || error?.error?.code === 'NOT_FOUND') {
        console.log('No games found, returning empty array');
        return [];
      }
      console.error('Failed to fetch games:', error);
      // For other errors, still return empty array to prevent app crash
      return [];
    }
  },

  createGame: async (data: CreateGameRequest): Promise<Game> => {
    try {
      // FastAPI expects query parameters for this endpoint
      const formData = new URLSearchParams();
      formData.append('name', data.name);
      formData.append('display_name', data.display_name);
      if (data.icon_url) formData.append('icon_url', data.icon_url);
      if (data.category) formData.append('category', data.category);
      formData.append('is_active', data.is_active?.toString() || 'true');

      const response = await apiClient.post<never, Game>('/admin/games', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response;
    } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
    }
  },

  bulkCreateGames: async (games: CreateGameRequest[]): Promise<{
    message: string;
    created: number;
    errors: number;
    games: Game[];
    error_details: string[];
  }> => {
    try {
      const response = await apiClient.post('/admin/games/bulk', { games });
      return response as any;
    } catch (error) {
      console.error('Failed to bulk create games:', error);
      throw error;
    }
  },

  updateGame: async (gameId: number, data: UpdateGameRequest): Promise<Game> => {
    try {
      // FastAPI expects query parameters for this endpoint
      const formData = new URLSearchParams();
      if (data.name) formData.append('name', data.name);
      if (data.display_name) formData.append('display_name', data.display_name);
      if (data.icon_url) formData.append('icon_url', data.icon_url);
      if (data.category) formData.append('category', data.category);
      if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());

      const response = await apiClient.patch<never, Game>(`/admin/games/${gameId}`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response;
    } catch (error) {
      console.error('Failed to update game:', error);
      throw error;
    }
  },

  deleteGame: async (gameId: number): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete<never, { message: string }>(`/admin/games/${gameId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw error;
    }
  },

  uploadGameImage: async (gameId: number, image: File): Promise<{ icon_url: string }> => {
    try {
      const iconUrl = await fileUploadService.uploadGameImage(gameId, image);
      return { icon_url: iconUrl };
    } catch (error) {
      console.error('Failed to upload game image:', error);
      throw error;
    }
  },

  // Client endpoints
  getClientGames: async (): Promise<ClientGame[]> => {
    try {
      const response = await apiClient.get('/games/my-games-details');
      // The response has a "games" property that contains the array
      return (response as any).games || [];
    } catch (error: any) {
      // If it's a 404, return empty array (no games selected yet)
      if (error?.response?.status === 404 || error?.error?.code === 'NOT_FOUND') {
        console.log('No client games found, returning empty array');
        return [];
      }
      console.error('Failed to fetch client games:', error);
      // For other errors, still return empty array to prevent app crash
      return [];
    }
  },

  selectGames: async (gameIds: number[]): Promise<{ message: string }> => {
    try {
      await apiClient.post('/games/update-games', { game_ids: gameIds });
      return { message: 'Games updated successfully' };
    } catch (error) {
      console.error('Failed to select games:', error);
      throw error;
    }
  },

  updateClientGame: async (clientGameId: number, data: {
    game_link?: string;
    custom_image_url?: string;
    is_active?: boolean;
  }): Promise<ClientGame> => {
    try {
      const response = await apiClient.patch<never, ClientGame>(`/games/my-games/${clientGameId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update client game:', error);
      throw error;
    }
  },

  // Get games for a specific client (player view)
  getGamesForClient: async (clientId: number): Promise<Game[]> => {
    try {
      const response = await apiClient.get<never, Game[]>(`/games/client/${clientId}/games`);
      return response;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      console.error('Failed to fetch client games:', error);
      return [];
    }
  },

  // Mini game betting
  placeMiniGameBet: async (data: MiniGameBetRequest): Promise<MiniGameBetResponse> => {
    try {
      const response = await apiClient.post<never, MiniGameBetResponse>('/games/mini-game/bet', data);
      return response;
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  },
};

// Mini game betting interfaces
export interface MiniGameBetRequest {
  game_type: 'dice' | 'slots';
  bet_amount: number;
  prediction?: number; // For dice: 2-12
}

export interface MiniGameBetResponse {
  success: boolean;
  game_type: string;
  bet_amount: number;
  win_amount: number;
  result: 'win' | 'lose' | 'jackpot';
  details: {
    dice1?: number;
    dice2?: number;
    total?: number;
    prediction?: number;
    reels?: string[];
  };
  new_balance: number;
  message: string;
}