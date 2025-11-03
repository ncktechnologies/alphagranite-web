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
// import { Icons } from '@/components/common/icons';
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

  // const { login } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFirstTimeLoginPopup, setShowFirstTimeLoginPopup] = useState(false);
  const [login, { isLoading }] = useLoginMutation();

  const [getProfile] = useLazyGetProfileQuery()

  // Check for success message from password reset or error messages
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
          setError(
            errorDescription || 'Authentication failed. Please try again.',
          );
          break;
        case 'auth_callback_error':
          setError(
            errorDescription ||
            'An error occurred during authentication. Please try again.',
          );
          break;
        case 'auth_token_error':
          setError(
            errorDescription ||
            'Failed to set authentication session. Please try again.',
          );
          break;
        default:
          setError(
            errorDescription || 'Authentication error. Please try again.',
          );
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

  // Function to extract error message from API response
  const getErrorMessage = (error: any): string => {
    if (error?.data?.detail) {
      if (Array.isArray(error.data.detail)) {
        // Handle array of validation errors
        return error.data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
      } else if (typeof error.data.detail === 'string') {
        // Handle string error message
        return error.data.detail;
      } else {
        // Handle object error message
        return error.data.detail.msg || JSON.stringify(error.data.detail);
      }
    }
    return error?.message || 'Invalid username or password';
  };

  async function onSubmit(values: SigninSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('Attempting to sign in with username:', values.username);

      // Simple validation
      if (!values.username.trim() || !values.password) {
        setError('Username and password are required');
        return;
      }

      const res: LoginResponse = await login({ username: values.username, password: values.password }).unwrap();
      
      // Check if it's a first-time login (based on the response structure you provided)
      if (res?.success === true && res?.data?.first_time === true && res?.data?.access_token) {
        // Store the token for the change password flow
        localStorage.setItem('token', res.data.access_token);
        // Show popup instead of toast
        setShowFirstTimeLoginPopup(true);
        return;
      }
      console.log(res)
      // Regular login flow
      if (res?.data?.access_token) {
        toast.success("User login successfully");
        localStorage.setItem('token', res.data.access_token);
        
        // Store refresh token if available
        if (res?.data?.refresh_token) {
          localStorage.setItem('refresh_token', res.data.refresh_token);
        }
        
        dispatch(
          setCredentials({
            admin: res.data.user,
            access_token: res.data.access_token,
          })
        );
        
        const nextPath = searchParams.get('next') || '/';
        // Use navigate for navigation
        navigate(nextPath || '/');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Unexpected sign-in error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
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
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
      >



        {error && (
          <Alert
            variant="destructive"
            appearance="light"
            onClose={() => setError(null)}
          >
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {successMessage && (
          <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
            <AlertIcon>
              <Check />
            </AlertIcon>
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
                  type={passwordVisible ? 'text' : 'password'} // Toggle input type
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
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

          <span className='text-text '>
            Forgot Password?
          </span>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=support@alphagranite.com&su=Password%20Assistance&body=Hello%20Support%2C%0AI%20need%20help%20with%20my%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary pl-2 hover:underline"
          >
            Contact Now
          </a>

        </div>
        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2 justify-center">

            </FormItem>
          )}
        />

        {/* <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/auth/signup"
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            Sign Up
          </Link>
        </div> */}
      </form>

      <Popup 
        isOpen={showFirstTimeLoginPopup}
        title="First Time Login"
        description="Please change your default password to continue."
      >
        <div className="flex flex-col items-center mt-4">
          <Button
            className="px-8"
            onClick={handleFirstTimeLoginRedirect}
          >
            Change Password
          </Button>
        </div>
      </Popup>
    </Form>
  );
}