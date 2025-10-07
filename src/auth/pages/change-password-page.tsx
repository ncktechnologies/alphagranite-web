import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from 'lucide-react';
import {
  getNewPasswordSchema,
  NewPasswordSchemaType,
} from '../forms/reset-password-schema';
import { Card, CardContent } from '@/components/ui/card';
import { FormHeader } from '@/components/ui/form-header';
import Popup from '@/components/ui/popup';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);

  const form = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(getNewPasswordSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: NewPasswordSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);


      setSuccessMessage('Password changed successfully!');
      setShowPopover(true);
      // Reset form
      form.reset();

      // Redirect to login page after a successful password reset
      // setTimeout(() => {
      //   navigate('/auth/update-profile');
      // }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }



  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader title="Change password" caption='Please change your default password to a new desired password ' />
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
                          placeholder="******************"
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
                          placeholder="******************"
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
                    <LoaderCircleIcon className="h-4 w-4" /> Updating Password...
                  </span>
                ) : (
                  'Update password'
                )}
              </Button>


            </form>
          </Form>
        </CardContent>
      </Card>
      <Popup isOpen={showPopover}
        title='Password updated'
        description='Your password was updated successfully'

      >

        <div className="flex flex-col items-center mt-4">


          <Button
            className="px-8"
            onClick={() => navigate('/auth/update-profile')}
          >
            Close
          </Button>
        </div>
      </Popup>
    </div>
  );
}
