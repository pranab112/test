import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { ROUTES } from '@/config/routes.config';
import type { User, LoginRequest, UserType } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify token is still valid
        authApi
          .getCurrentUser()
          .then((fetchedUser) => {
            setUser(fetchedUser);
            localStorage.setItem('user', JSON.stringify(fetchedUser));
          })
          .catch(() => {
            // Token invalid, clear storage
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    localStorage.setItem('access_token', response.access_token);

    // Fetch full user data
    const userData = await authApi.getCurrentUser();
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    // Redirect based on user type
    const redirectMap: Record<UserType, string> = {
      admin: ROUTES.ADMIN.DASHBOARD,
      client: ROUTES.CLIENT.DASHBOARD,
      player: ROUTES.PLAYER.DASHBOARD,
    };

    navigate(redirectMap[userData.user_type]);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    navigate(ROUTES.LOGIN);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
