import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, MoveLeft } from 'lucide-react';
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
  getResetRequestSchema,
  ResetRequestSchemaType,
} from '../forms/reset-password-schema';
import { Card, CardContent } from '@/components/ui/card';
import { FormHeader } from '@/components/ui/form-header';
import { useRequestPasswordResetMutation } from '@/store/api/auth';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const { } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [requestPasswordReset] = useRequestPasswordResetMutation();

  const form = useForm<ResetRequestSchemaType>({
    resolver: zodResolver(getResetRequestSchema()),
    defaultValues: {
      email: '',
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
    return error?.message || 'Failed to send reset password email. Please try again.';
  };

  async function onSubmit(values: ResetRequestSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('Submitting password reset for:', values.email);

      // Call the API to request password reset with correct payload
      await requestPasswordReset({ username_or_email: values.email }).unwrap();
      
      // Navigate to OTP page with username
      navigate('/auth/otp-verify', { 
        state: { 
          username: values.email, 
          from: 'reset-password' 
        } 
      });
    } catch (err: any) {
      console.error('Password reset request error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader title="Reset your password" caption='Enter your username to receive a password reset code'/>
      <Card className="w-full max-w-[398px] overflow-y-auto flex flex-wrap border-[#DFDFDF]">
        <CardContent className="px-6 py-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">


              {error && (
                <Alert variant="destructive">
                  <AlertIcon>
                    <AlertCircle className="h-4 w-4" />
                  </AlertIcon>
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          type="text"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Sending Code...
                    </span>
                  ) : (
                    'Send Code'
                  )}
                </Button>
              </div>

              <div className="text-center text-sm">
                <Link
                  to="/auth/signin"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
                >
                  <MoveLeft className="size-3.5 opacity-70" /> Back to Sign In
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
}