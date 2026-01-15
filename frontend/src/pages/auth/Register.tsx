import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IconType } from 'react-icons';
import { GiCardAceSpades, GiPokerHand } from 'react-icons/gi';
import { FaUser, FaLock, FaEnvelope, FaBuilding, FaIdCard, FaGift } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';
import { IoMdPerson } from 'react-icons/io';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { UserType } from '@/types';
import { ROUTES } from '@/config/routes.config';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be at most 72 characters')
    .refine(
      (val) => new TextEncoder().encode(val).length <= 72,
      'Password is too long (max 72 bytes in UTF-8)'
    ),
  full_name: z.string().optional(),
  user_type: z.nativeEnum(UserType),
  company_name: z.string().optional(), // For clients
  client_identifier: z.string().optional(), // For players - username or company of client
  referral_code: z.string().optional(), // Optional referral code for bonus credits
}).refine(
  (data) => {
    // If player, client_identifier is required
    if (data.user_type === UserType.PLAYER) {
      return !!data.client_identifier && data.client_identifier.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Client username or company name is required for player registration',
    path: ['client_identifier'],
  }
);

type RegisterFormData = z.infer<typeof registerSchema>;

// Only allow Client and Player registration (Admin accounts created by system)
const publicUserTypes = [UserType.CLIENT, UserType.PLAYER];

const userTypeIcons: Record<UserType, IconType> = {
  [UserType.CLIENT]: FaBuilding,
  [UserType.PLAYER]: IoMdPerson,
  [UserType.ADMIN]: FaBuilding, // Not used but required for type safety
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType>(UserType.PLAYER);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_type: UserType.PLAYER,
    },
  });

  // Check for referral code in URL params (e.g., /register?ref=ABC123)
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setValue('referral_code', refCode);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authApi.register(data);

      // Show different success messages based on user type
      if (data.user_type === UserType.CLIENT) {
        toast.success(
          'Client registration successful! Your account is pending admin approval. You will be notified when approved.',
          { duration: 5000 }
        );
      } else if (data.user_type === UserType.PLAYER) {
        toast.success(
          'Player registration successful! Your account is pending client approval. The client will review your request.',
          { duration: 5000 }
        );
      } else {
        toast.success('Registration successful! Please wait for approval.');
      }

      navigate(ROUTES.LOGIN);
    } catch (error: any) {
      console.error('Registration error:', error);

      // Extract error message from various response formats
      let errorMessage = 'Registration failed. Please try again.';

      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Check for pending approval message and show a more helpful toast
      if (errorMessage.includes('waiting for approval')) {
        toast.error(errorMessage, {
          duration: 6000,
          icon: '⏳',
        });
      } else if (errorMessage.includes('already exists')) {
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }

      setIsLoading(false);
    }
  };

  const handleUserTypeChange = (type: UserType) => {
    setSelectedUserType(type);
    setValue('user_type', type);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GiPokerHand className="absolute top-10 right-20 text-emerald-800 opacity-5 text-9xl transform rotate-12" />
        <GiCardAceSpades className="absolute bottom-20 left-10 text-emerald-800 opacity-5 text-9xl transform -rotate-12" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="card bg-dark-200 border-2 border-emerald-600 shadow-green-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <GiCardAceSpades className="text-6xl text-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold text-emerald-500 glow-green mb-2 tracking-wider">
              GOLDEN ACE
            </h1>
            <p className="text-emerald-700 text-sm uppercase tracking-widest">Create Your Account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* User Type Selection */}
            <div className="form-group">
              <label className="label flex items-center gap-2">
                <FaIdCard className="text-emerald-500" />
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {publicUserTypes.map((type) => {
                  const Icon = userTypeIcons[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleUserTypeChange(type)}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all flex flex-col items-center gap-1 ${
                        selectedUserType === type
                          ? 'bg-emerald-gradient text-dark-700 shadow-green'
                          : 'bg-dark-400 text-gray-400 hover:bg-dark-300 border border-emerald-900'
                      }`}
                    >
                      <Icon className="text-xl" />
                      <span className="text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaEnvelope />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                className="pl-10"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaUser />
              </div>
              <Input
                label="Username"
                type="text"
                placeholder="Choose a username"
                className="pl-10"
                error={errors.username?.message}
                {...register('username')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <IoMdPerson />
              </div>
              <Input
                label="Full Name (Optional)"
                type="text"
                placeholder="Your full name"
                className="pl-10"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
            </div>

            {selectedUserType === UserType.CLIENT && (
              <div className="relative">
                <div className="absolute left-3 top-[38px] text-emerald-600">
                  <FaBuilding />
                </div>
                <Input
                  label="Company Name (Optional)"
                  type="text"
                  placeholder="Your company name"
                  className="pl-10"
                  error={errors.company_name?.message}
                  {...register('company_name')}
                />
              </div>
            )}

            {selectedUserType === UserType.PLAYER && (
              <div className="relative">
                <div className="absolute left-3 top-[38px] text-emerald-600">
                  <FaBuilding />
                </div>
                <Input
                  label="Client Username or Company"
                  type="text"
                  placeholder="Enter client username or company name"
                  className="pl-10"
                  error={errors.client_identifier?.message}
                  {...register('client_identifier')}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaLock />
              </div>
              <Input
                label="Password"
                type="password"
                placeholder="Create a password"
                className="pl-10"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-emerald-600">
                <FaGift />
              </div>
              <Input
                label="Referral Code (Optional)"
                type="text"
                placeholder="Enter referral code for bonus credits"
                className="pl-10"
                error={errors.referral_code?.message}
                {...register('referral_code')}
              />
            </div>

            {selectedUserType === UserType.CLIENT && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-200 flex items-start gap-2">
                <MdAdminPanelSettings className="text-lg mt-0.5 flex-shrink-0" />
                <span>Client accounts require admin approval before you can login.</span>
              </div>
            )}

            {selectedUserType === UserType.PLAYER && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-sm text-blue-200 flex items-start gap-2">
                <IoMdPerson className="text-lg mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Player Registration</p>
                  <p>Enter the username or company name of the client you want to register under. The client will need to approve your account before you can login.</p>
                </div>
              </div>
            )}

            <Button type="submit" loading={isLoading} fullWidth>
              Create Account
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-gray-400">
            <p>
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="text-emerald-500 hover:text-emerald-400 hover:underline font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
