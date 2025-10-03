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

export function ResetPasswordPage() {
  const { } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const form = useForm<ResetRequestSchemaType>({
    resolver: zodResolver(getResetRequestSchema()),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ResetRequestSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('Submitting password reset for:', values.email);


      navigate('/auth/otp-verify', { state: { email: values.email, from: 'reset-password' } });

      // Set success message
      setSuccessMessage(
        `Password reset link sent to ${values.email}! Please check your inbox and spam folder.`,
      );

      // Reset form
      form.reset();
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(
        err instanceof Error
          ? `Error: ${err.message}. Please ensure your email is correct and try again.`
          : 'An unexpected error occurred. Please try again or contact support.',
      );
    } finally {
      setIsProcessing(false);
    }
  }
  {/* <Card className="w-full max-w-[398px] overflow-y-auto flex flex-wrap border-[#DFDFDF]">
          <CardContent className="px-6 py-12">
          </CardContent>
        </Card> */}
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader title="Reset your password" caption=' Enter your registered email used for the account you want to reset the password'/>
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

              {successMessage && (
                <Alert>
                  <AlertIcon>
                    <Check className="h-4 w-4 text-green-500" />
                  </AlertIcon>
                  <AlertTitle>{successMessage}</AlertTitle>
                </Alert>
              )}

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email address"
                          type="email"
                          autoComplete="email"
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
                      <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Sending Link...
                    </span>
                  ) : (
                    'Send Code'
                  )}
                </Button>
              </div>

              {/* <div className="text-center text-sm">
            <Link
              to="/auth/signin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
            >
              <MoveLeft className="size-3.5 opacity-70" /> Back to Sign In
            </Link>
          </div> */}
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
}
