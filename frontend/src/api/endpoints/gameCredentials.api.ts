import { apiClient } from '../client';

export interface GameCredential {
  id: number;
  player_id: number;
  game_id: number;
  game_name: string;
  game_display_name: string;
  game_username: string;
  game_password: string;
  created_by_client_id: number;
  created_at: string;
  updated_at?: string;
  // Aliases for backward compatibility with UI components
  username?: string;
  password?: string;
  login_url?: string;
  client_name?: string;
}

export interface GameCredentialListResponse {
  credentials: GameCredential[];
}

export interface CreateGameCredentialRequest {
  player_id: number;
  game_id: number;
  game_username?: string;
  game_password?: string;
  // Aliases for backward compatibility
  username?: string;
  password?: string;
}

export interface UpdateGameCredentialRequest {
  game_username?: string;
  game_password?: string;
  // Aliases for backward compatibility
  username?: string;
  password?: string;
}

export const gameCredentialsApi = {
  // Get credentials for a specific player (client use)
  getPlayerCredentials: async (playerId: number): Promise<GameCredential[]> => {
    const response = await apiClient.get<GameCredentialListResponse>(
      `/game-credentials/player/${playerId}`
    );
    return (response as any).credentials || [];
  },

  // Get current user's credentials (player use)
  getMyCredentials: async (): Promise<GameCredential[]> => {
    const response = await apiClient.get<GameCredentialListResponse>(
      '/game-credentials/my-credentials'
    );
    return (response as any).credentials || [];
  },

  // Create new game credentials for a player (client use)
  createCredential: async (data: CreateGameCredentialRequest): Promise<GameCredential> => {
    const response = await apiClient.post<GameCredential>('/game-credentials/', data);
    return response as any;
  },

  // Update game credentials (client use)
  updateCredential: async (
    credentialId: number,
    data: UpdateGameCredentialRequest
  ): Promise<GameCredential> => {
    const response = await apiClient.put<GameCredential>(
      `/game-credentials/${credentialId}`,
      data
    );
    return response as any;
  },

  // Delete game credentials (client use)
  deleteCredential: async (credentialId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/game-credentials/${credentialId}`);
    return response as any;
  },
};
