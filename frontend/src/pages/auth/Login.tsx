import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaGamepad } from 'react-icons/fa';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ROUTES } from '@/config/routes.config';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);

      // Verify this is a player account
      if (response.user_type !== 'player') {
        toast.error('This is the player login. Please use the correct login page for your account type.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('access_token', response.access_token);

      // Fetch full user data
      const userData = await authApi.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userData));

      // Update auth context so ProtectedRoute knows we're authenticated
      setUser(userData);

      toast.success('Welcome back, player!');
      setIsLoading(false);
      navigate(ROUTES.PLAYER.DASHBOARD, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.detail || error?.response?.data?.detail || error?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500 p-4">
      <div className="max-w-md w-full">
        <div className="bg-dark-200 border-2 border-emerald-600 rounded-lg shadow-green-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaGamepad className="text-5xl text-emerald-500" />
            </div>
            <h1 className="text-4xl font-bold text-emerald-500 tracking-wider mb-2">
              PLAYER LOGIN
            </h1>
            <p className="text-gray-400">Green Palace Gaming Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaUser />
              </div>
              <Input
                label="Player Username"
                type="text"
                placeholder="Enter your username"
                className="pl-10"
                error={errors.username?.message}
                {...register('username')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaLock />
              </div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                className="pl-10"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button type="submit" loading={isLoading} fullWidth>
              Player Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
