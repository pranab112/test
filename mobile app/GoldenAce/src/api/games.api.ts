import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Game, ClientGame } from '../types';

interface ClientGamesResponse {
  games: ClientGame[];
}

export const gamesApi = {
  // Get all games (for browsing)
  getAllGames: async (): Promise<Game[]> => {
    try {
      const response = await api.get<Game[]>(API_ENDPOINTS.GAMES.ADMIN);
      return response as unknown as Game[];
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; error?: { code?: string } };
      if (err?.response?.status === 404 || err?.error?.code === 'NOT_FOUND') {
        return [];
      }
      throw error;
    }
  },

  // Client: Get my selected games
  getClientGames: async (): Promise<ClientGame[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.GAMES.MY_GAMES);
      const data = response as unknown as ClientGamesResponse;
      return data.games || [];
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; error?: { code?: string } };
      if (err?.response?.status === 404 || err?.error?.code === 'NOT_FOUND') {
        return [];
      }
      throw error;
    }
  },

  // Client: Select/update games
  selectGames: async (gameIds: number[]): Promise<{ message: string }> => {
    try {
      await api.post(API_ENDPOINTS.GAMES.UPDATE_GAMES, { game_ids: gameIds });
      return { message: 'Games updated successfully' };
    } catch (error) {
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
      throw error;
    }
  },

  // Player: Get games for a specific client
  getGamesForClient: async (clientId: number): Promise<Game[]> => {
    try {
      const response = await api.get<Game[]>(`${API_ENDPOINTS.GAMES.CLIENT_GAMES}/${clientId}/games`);
      return response as unknown as Game[];
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },
};
