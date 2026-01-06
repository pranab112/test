import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Game, ClientGame } from '../types';

export const gamesApi = {
  // Get all games (for browsing)
  getAllGames: async (): Promise<Game[]> => {
    try {
      const response = await api.get<Game[]>(API_ENDPOINTS.GAMES.ADMIN);
      return response as unknown as Game[];
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.error?.code === 'NOT_FOUND') {
        return [];
      }
      console.error('Failed to fetch games:', error);
      return [];
    }
  },

  // Client: Get my selected games
  getClientGames: async (): Promise<ClientGame[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.GAMES.MY_GAMES);
      return (response as any).games || [];
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.error?.code === 'NOT_FOUND') {
        return [];
      }
      console.error('Failed to fetch client games:', error);
      return [];
    }
  },

  // Client: Select/update games
  selectGames: async (gameIds: number[]): Promise<{ message: string }> => {
    try {
      await api.post(API_ENDPOINTS.GAMES.UPDATE_GAMES, { game_ids: gameIds });
      return { message: 'Games updated successfully' };
    } catch (error) {
      console.error('Failed to select games:', error);
      throw error;
    }
  },

  // Client: Update individual game settings
  updateClientGame: async (
    clientGameId: number,
    data: {
      game_link?: string;
      custom_image_url?: string;
      is_active?: boolean;
    }
  ): Promise<ClientGame> => {
    try {
      const response = await api.patch<ClientGame>(`/games/my-games/${clientGameId}`, data);
      return response as unknown as ClientGame;
    } catch (error) {
      console.error('Failed to update client game:', error);
      throw error;
    }
  },

  // Player: Get games for a specific client
  getGamesForClient: async (clientId: number): Promise<Game[]> => {
    try {
      const response = await api.get<Game[]>(`${API_ENDPOINTS.GAMES.CLIENT_GAMES}/${clientId}/games`);
      return response as unknown as Game[];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      console.error('Failed to fetch client games:', error);
      return [];
    }
  },
};
