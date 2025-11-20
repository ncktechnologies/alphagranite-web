import { useEffect, useState } from 'react';
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
import { useChangePasswordMutation } from '@/store/api/auth';
import { toast } from 'sonner';
import { useLazyGetProfileQuery } from '@/store/api/auth';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slice';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [changePassword] = useChangePasswordMutation();
  const [getProfile] = useLazyGetProfileQuery();

  // Check if this is a first-time login
  const isFirstTimeLogin = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  const form = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(getNewPasswordSchema()),
    defaultValues: {
      currentPassword: '',
      password: '',
      confirmPassword: '',
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
    return error?.message || 'Failed to change password. Please try again.';
  };

  async function onSubmit(values: NewPasswordSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      // Log the values being sent
      console.log('Sending password change request:', {
        current_password: values.currentPassword,
        new_password: values.password,
        confirm_password: values.confirmPassword
      });

      // Call the API to change password
      await changePassword({ 
        current_password: values.currentPassword,
        new_password: values.password,
        confirm_password: values.confirmPassword
      }).unwrap();

      toast.success('Password changed successfully!');
      setSuccessMessage('Password changed successfully!');
      setShowPopover(true);
      
      // For first-time login, we need to complete the login flow
      if (isFirstTimeLogin()) {
        // Get user profile
        const profileData = await getProfile().unwrap();
        const accessToken = localStorage.getItem('token');
        
        if (accessToken) {
          dispatch(
            setCredentials({
              admin: profileData,
              access_token: accessToken,
              permissions: profileData?.permissions || [], // Pass permissions to Redux
            })
          );
        }
      }

      // Reset form
      form.reset();
    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  const handleClosePopup = () => {
    setShowPopover(false);
    // If this was a first-time login, redirect to update profile page
    if (isFirstTimeLogin()) {
      navigate('/auth/update-profile');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader title="Change password" caption={isFirstTimeLogin() 
        ? 'Please change your default password to a new desired password' 
        : 'Please change your password to a new desired password'} />
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
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password *</FormLabel>
                      <div className="relative">
                        <Input
                          placeholder="******************"
                          type={currentPasswordVisible ? 'text' : 'password'}
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          mode="icon"
                          onClick={() => setCurrentPasswordVisible(!currentPasswordVisible)}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        >
                          {currentPasswordVisible ? (
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
            onClick={handleClosePopup}
          >
            Continue
          </Button>
        </div>
      </Popup>
    </div>
  );
}