import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getSigninSchema, type SigninSchemaType } from '../forms/signin-schema';
import { LoaderCircleIcon } from 'lucide-react';
import { useLoginMutation, useLazyGetProfileQuery } from '@/store/api/auth';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slice';
import type { LoginResponse } from '@/interfaces/pages/auth';
import Popup from '@/components/ui/popup';

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFirstTimeLoginPopup, setShowFirstTimeLoginPopup] = useState(false);

  const [login] = useLoginMutation();
  // ✅ Always available so we can fetch the full profile after any login
  const [getProfile] = useLazyGetProfileQuery();

  useEffect(() => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.',
      );
    }

    if (errorParam) {
      switch (errorParam) {
        case 'auth_callback_failed':
          setError(errorDescription || 'Authentication failed. Please try again.');
          break;
        case 'auth_callback_error':
          setError(errorDescription || 'An error occurred during authentication. Please try again.');
          break;
        case 'auth_token_error':
          setError(errorDescription || 'Failed to set authentication session. Please try again.');
          break;
        default:
          setError(errorDescription || 'Authentication error. Please try again.');
          break;
      }
    }
  }, [searchParams]);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true,
    },
  });

  const getErrorMessage = (error: any): string => {
    if (error?.data?.detail) {
      if (Array.isArray(error.data.detail)) {
        return error.data.detail.map((err: any) => err.message || JSON.stringify(err)).join(', ');
      } else if (typeof error.data.detail === 'string') {
        return error.data.detail;
      } else {
        return error.data.detail.message || JSON.stringify(error.data.detail);
      }
    }
    return 'Invalid username or password';
  };

  async function onSubmit(values: SigninSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      if (!values.username.trim() || !values.password) {
        setError('Username and password are required');
        return;
      }

      const res: LoginResponse = await login({
        username: values.username,
        password: values.password,
      }).unwrap();

      // ── First-time login ─────────────────────────────────────────────────
      if (res?.success === true && res?.data?.first_time === true && res?.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
        setShowFirstTimeLoginPopup(true);
        return;
      }

      // ── Regular login ────────────────────────────────────────────────────
      if (res?.data?.access_token) {
        // 1. Store token first so the profile request is authenticated
        localStorage.setItem('token', res.data.access_token);
        if (res?.data?.refresh_token) {
          localStorage.setItem('refresh_token', res.data.refresh_token);
        }

        // ✅ 2. Always fetch the full profile — this includes the complete
        //       `roles` array and `permissions` that the login response
        //       may not include or may have stale data for.
        const profileData = await getProfile().unwrap();

        // ✅ 3. Dispatch the PROFILE data (not res.data.user) so roles are
        //       guaranteed to be up-to-date before the dashboard renders.
        dispatch(
          setCredentials({
            admin: profileData,
            access_token: res.data.access_token,
            permissions: profileData?.action_permissions || profileData?.permissions || [],
          })
        );

        toast.success('User login successfully');

        const nextPath = searchParams.get('next') || '/';
        navigate(nextPath);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Unexpected sign-in error:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }

  const handleFirstTimeLoginRedirect = () => {
    setShowFirstTimeLoginPopup(false);
    navigate('/auth/reset-password');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="block w-full space-y-5">

        {error && (
          <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
            <AlertIcon><AlertCircle /></AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {successMessage && (
          <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
            <AlertIcon><Check /></AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username *</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center gap-2.5">
                <FormLabel>Password *</FormLabel>
              </div>
              <div className="relative">
                <Input
                  placeholder="******************"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {passwordVisible
                    ? <EyeOff className="text-muted-foreground" />
                    : <Eye className="text-muted-foreground" />
                  }
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="flex items-center justify-center">
          <span className="text-text">Forgot Password?</span>
          <Link to="/auth/forgot-password" className="text-sm text-primary pl-2 hover:underline">
            Reset Password
          </Link>
        </div>

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2 justify-center" />
          )}
        />
      </form>

      <Popup
        isOpen={showFirstTimeLoginPopup}
        title="First Time Login"
        description="Please change your default password to continue."
      >
        <div className="flex flex-col items-center mt-4">
          <Button className="px-8" onClick={handleFirstTimeLoginRedirect}>
            Change Password
          </Button>
        </div>
      </Popup>
    </Form>
  );
}