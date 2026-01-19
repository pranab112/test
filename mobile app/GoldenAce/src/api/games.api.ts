import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Game, ClientGame } from '../types';

interface ClientGamesResponse {
  games: ClientGame[];
}

export const gamesApi = {
  // Get all games (for browsing) - uses public endpoint, not admin
  getAllGames: async (): Promise<Game[]> => {
    try {
      console.log('[Games API] Fetching all games from:', API_ENDPOINTS.GAMES.BASE);
      const response = await api.get<Game[]>(API_ENDPOINTS.GAMES.BASE);
      console.log('[Games API] All games response:', JSON.stringify(response, null, 2));
      const games = Array.isArray(response) ? response : [];
      console.log('[Games API] Parsed all games:', games.length, 'items');
      return games as Game[];
    } catch (error: unknown) {
      console.error('[Games API] Error fetching all games:', error);
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
      console.log('[Games API] Fetching client games from:', API_ENDPOINTS.GAMES.MY_GAMES);
      const response = await api.get(API_ENDPOINTS.GAMES.MY_GAMES);
      console.log('[Games API] Raw response:', JSON.stringify(response, null, 2));
      const data = response as unknown as ClientGamesResponse;
      const games = data.games || [];
      console.log('[Games API] Parsed games:', games.length, 'items');
      return games;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; error?: { code?: string } };
      console.error('[Games API] Error fetching client games:', error);
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
