import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaBuilding } from 'react-icons/fa';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ROUTES } from '@/config/routes.config';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function ClientLogin() {
  const navigate = useNavigate();
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

      // Verify this is a client account
      if (response.user_type !== 'client') {
        toast.error('Access denied. Client credentials required.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('access_token', response.access_token);

      // Fetch full user data
      const userData = await authApi.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userData));

      toast.success('Client login successful!');
      navigate(ROUTES.CLIENT.DASHBOARD);
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
        <div className="bg-dark-200 border-2 border-blue-600 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaBuilding className="text-5xl text-blue-500" />
            </div>
            <h1 className="text-4xl font-bold text-blue-500 tracking-wider mb-2">
              CLIENT PORTAL
            </h1>
            <p className="text-gray-400">Golden Ace Business Access</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative">
              <div className="absolute left-3 top-[38px] text-blue-600">
                <FaUser />
              </div>
              <Input
                label="Client Username"
                type="text"
                placeholder="Enter your username"
                className="pl-10"
                error={errors.username?.message}
                {...register('username')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-blue-600">
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

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              className="bg-blue-600 hover:bg-blue-700"
            >
              Client Login
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-gray-400">
            <p>
              Need a client account?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
