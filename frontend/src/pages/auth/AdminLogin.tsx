import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaShieldAlt } from 'react-icons/fa';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();

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

      // Verify this is an admin account
      if (response.user_type !== 'admin') {
        toast.error('Access denied. Admin credentials required.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('access_token', response.access_token);

      // Fetch full user data
      const userData = await authApi.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userData));

      // Update AuthContext with user data
      setUser(userData);

      toast.success('Admin login successful!');
      // PublicRoute will automatically redirect to dashboard
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500 p-4">
      <div className="max-w-md w-full">
        <div className="bg-dark-200 border-2 border-red-600 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaShieldAlt className="text-5xl text-red-500" />
            </div>
            <h1 className="text-4xl font-bold text-red-500 tracking-wider mb-2">
              ADMIN ACCESS
            </h1>
            <p className="text-gray-400">Green Palace Administration</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative">
              <div className="absolute left-3 top-[38px] text-red-600">
                <FaUser />
              </div>
              <Input
                label="Admin Username"
                type="text"
                placeholder="Enter admin username"
                className="pl-10"
                error={errors.username?.message}
                {...register('username')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-red-600">
                <FaLock />
              </div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                className="pl-10"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              className="bg-red-600 hover:bg-red-700"
            >
              Admin Login
            </Button>
          </form>

          {/* Warning */}
          <div className="mt-6 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-xs text-red-400 text-center">
              ⚠️ Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
