import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { LoaderCircleIcon } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { AvatarInput } from './avatar-input';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/auth';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';
import { CompleteProfileSchemaType, getCompleteProfileSchema } from './profile-schema';

interface ProfileFormSectionProps {
  onSave: (data: CompleteProfileSchemaType) => void;
  onCancel: () => void;
}

export const ProfileFormSection = ({ onSave, onCancel }: ProfileFormSectionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isImageUpdating, setIsImageUpdating] = useState(false);

  const { data: profile, isLoading: isLoadingProfile, refetch } = useGetProfileQuery();
  const [updateProfile] = useUpdateProfileMutation();
  const [profileImageMeta, setProfileImageMeta] = useState<{ id: number; url: string; filename: string } | null>(null);

  const defaultValues = useMemo(() => {
    if (profile) {
      return {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        department: profile.department?.toString() || '',
        gender: profile.gender || '',
      };
    }
    return {
      first_name: '',
      last_name: '',
      email: '',
      department: '',
      gender: '',
      phone: '',
    };
  }, [profile]);

  const form = useForm<CompleteProfileSchemaType>({
    resolver: zodResolver(getCompleteProfileSchema()),
    mode: 'onChange',
    defaultValues,
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  // Handle full form submission (all fields + image)
  const onSubmit = async (values: CompleteProfileSchemaType) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...values,
        department: parseInt(values.department, 10),
      };

      const { department, ...updateData } = payload;

      const payloadWithImage = {
        ...updateData,
        ...(profileImageMeta?.id && { profile_image_id: profileImageMeta.id }),
        ...(profileImageMeta?.url && { profile_image_url: profileImageMeta.url }),
      };

      await updateProfile(payloadWithImage).unwrap();
      setSuccess('Profile updated successfully!');

      setTimeout(() => {
        onSave(values);
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto‑update profile image as soon as upload completes
  const handleUploadComplete = async (file: { id: number; url: string; filename: string }) => {
    setProfileImageMeta(file);
    setIsImageUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      // Immediately push the new image to the profile
      await updateProfile({
        profile_image_id: file.id,
        profile_image_url: file.url,
      }).unwrap();

      setSuccess('Profile image updated successfully!');
      refetch(); // Refresh profile data so the new image appears everywhere
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to update profile image.');
      console.error('Image auto‑update error:', err);
    } finally {
      setIsImageUpdating(false);
    }
  };

  return (
    <Form {...form}>
      <form
        id="profile-edit-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-4 items-start"
      >
        {error && (
          <div className="col-span-3">
            <Alert variant="destructive">
              <AlertIcon>
                <AlertCircle className="h-4 w-4" />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          </div>
        )}

        {success && (
          <div className="col-span-3">
            <Alert>
              <AlertIcon>
                <Check className="h-4 w-4 text-green-500" />
              </AlertIcon>
              <AlertTitle>{success}</AlertTitle>
            </Alert>
          </div>
        )}

        {/* Profile Image Upload */}
        <div className="space-y-4 bg-[#F8F9FC] h-[220px] text-center p-[24px] rounded-[12px]">
          <FormLabel className="text-center text-[#2E3A59] pb-2">Upload Image</FormLabel>
          <div className="flex items-center gap-4 justify-center">
            <AvatarInput
              onUploadComplete={handleUploadComplete}
              onUploadStatusChange={setIsAvatarUploading}
              defaultImageUrl={profile?.profile_image_url}
              userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'}
            />
          </div>
          {isImageUpdating && (
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <LoaderCircleIcon className="h-3 w-3 animate-spin" /> Updating profile image...
            </div>
          )}
        </div>

        <Card className="p-3 col-span-2">
          <CardTitle className="text-[#09090B] pb-6">Personal Information</CardTitle>
          <CardContent className="p-4 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-x-3">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
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
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={() => (
                <FormItem>
                  <FormLabel>Department *</FormLabel>
                  <Input value={profile?.department_name ?? ''} disabled />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action buttons */}
            <div className="col-span-2 mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white text-text px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isAvatarUploading || isImageUpdating}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : isAvatarUploading ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Uploading Image...
                  </>
                ) : isImageUpdating ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Updating Image...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};