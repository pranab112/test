import { api } from '../services/api';
import type { GameCredential } from '../types';

export const gameCredentialsApi = {
  // Get my game credentials (for players)
  getMyCredentials: async (): Promise<GameCredential[]> => {
    try {
      const response = await api.get('/game-credentials/my-credentials');
      // Backend returns { credentials: [...] } format
      const data = response as unknown as { credentials: GameCredential[] };
      return data.credentials || [];
    } catch (error) {
      console.error('[GameCredentials API] getMyCredentials error:', error);
      throw error;
    }
  },

  // Get credentials for a specific player (for clients)
  getPlayerCredentials: async (playerId: number): Promise<GameCredential[]> => {
    try {
      const response = await api.get(`/game-credentials/player/${playerId}`);
      // Backend returns { credentials: [...] } format
      const data = response as unknown as { credentials: GameCredential[] };
      return data.credentials || [];
    } catch (error) {
      console.error('[GameCredentials API] getPlayerCredentials error:', error);
      throw error;
    }
  },

  // Create credentials for a player (for clients)
  createCredentials: async (data: {
    player_id: number;
    game_id: number;
    game_username: string;
    game_password: string;
  }): Promise<GameCredential> => {
    try {
      console.log('[GameCredentials API] Creating credentials:', data);
      const response = await api.post('/game-credentials/', data);
      console.log('[GameCredentials API] Create response:', response);
      return response as unknown as GameCredential;
    } catch (error: any) {
      console.error('[GameCredentials API] Create error:', error);
      console.error('[GameCredentials API] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Update credentials
  updateCredentials: async (
    credentialId: number,
    data: { game_username: string; game_password: string }
  ): Promise<GameCredential> => {
    try {
      const response = await api.put(`/game-credentials/${credentialId}`, data);
      return response as unknown as GameCredential;
    } catch (error) {
      throw error;
    }
  },

  // Delete credentials
  deleteCredentials: async (credentialId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/game-credentials/${credentialId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },
};
