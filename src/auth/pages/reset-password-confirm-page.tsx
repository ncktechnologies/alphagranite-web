import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, MoveLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
import { LoaderCircleIcon } from 'lucide-react';
import {
  getPasswordResetSchema,
  NewPasswordSchemaType,
  PasswordResetSchemaType as ResetPasswordFormType,
} from '../forms/reset-password-schema';
import { Card, CardContent } from '@/components/ui/card';
import { FormHeader } from '@/components/ui/form-header';
import { useResetPasswordMutation } from '@/store/api/auth';
import { toast } from 'sonner';

export function ResetPasswordConfirmPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const [resetPassword] = useResetPasswordMutation();

  const form = useForm<ResetPasswordFormType>({
    resolver: zodResolver(getPasswordResetSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Function to extract error message from API response
  const getErrorMessage = (error: any): string => {
    // First check for the message field in the response
    if (error?.data?.message) {
      return error.data.message;
    }
    
    // Fallback to detail field for other error formats
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
    
    // Final fallback
    return error?.message || 'Failed to reset password. Please try again.';
  };

  async function onSubmit(values: ResetPasswordFormType) {
    try {
      setIsProcessing(true);
      setError(null);

      // Get username and OTP from sessionStorage
      const storedData = sessionStorage.getItem('password_reset_data');
      if (!storedData) {
        setError('Session expired. Please restart the password reset process.');
        return;
      }
      
      const { username, otp } = JSON.parse(storedData);
      
      if (!username || !otp) {
        setError('Missing required data for password reset. Please restart the process.');
        return;
      }

      // Call the API to reset password using the new endpoint
      await resetPassword({ 
        username_or_email: username,
        otp: otp,
        new_password: values.password
      }).unwrap();

      // Clear stored data
      sessionStorage.removeItem('password_reset_data');

      // Set success message
      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
      
      // Redirect to sign in page after a delay
      setTimeout(() => {
        navigate('/auth/signin?pwd_reset=success');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader 
        title="Reset Your Password" 
        caption='Enter your new password to complete the reset process'
      />
      <Card className="w-full max-w-[398px] overflow-y-auto flex flex-wrap border-[#DFDFDF]">
        <CardContent className="px-6 py-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {error && (
                <Alert variant="destructive">
                  <AlertIcon>
                    <AlertCircle className="h-4 w-4" />
                  </AlertIcon>
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertIcon>
                    <Check className="h-4 w-4 text-green-500" />
                  </AlertIcon>
                  <AlertTitle>{successMessage}</AlertTitle>
                </Alert>
              )}

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password *</FormLabel>
                      <div className="relative">
                        <Input
                          placeholder="Enter new password"
                          type={passwordVisible ? 'text' : 'password'}
                          autoComplete="new-password"
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
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <div className="relative">
                        <Input
                          placeholder="Confirm new password"
                          type={confirmPasswordVisible ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          mode="icon"
                          onClick={() =>
                            setConfirmPasswordVisible(!confirmPasswordVisible)
                          }
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        >
                          {confirmPasswordVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircleIcon className="h-4 w-4" /> Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </Button>

            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="text-center text-sm mt-4">
        <Link
          to="/auth/signin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
        >
          <MoveLeft className="size-3.5 opacity-70" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}