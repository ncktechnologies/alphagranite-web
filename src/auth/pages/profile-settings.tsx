import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/auth';
import { toast } from 'sonner';

export function ProfileSettingsPage() {
  const { data: profile, isLoading, isError } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  });

  // Populate form with profile data when it loads
  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, form]);

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
    return error?.message || 'Failed to update profile';
  };

  async function onSubmit(values: any) {
    try {
      await updateProfile(values).unwrap();
      setSuccessMessage('Profile updated successfully!');
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage);
    }
  }

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (isError) {
    return <div>Error loading profile</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {successMessage && (
                <div className="text-green-600 bg-green-50 p-3 rounded">
                  {successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}