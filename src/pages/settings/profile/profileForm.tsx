import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircleIcon } from 'lucide-react';
import {
    CompleteProfileSchemaType,
    getCompleteProfileSchema,
} from '@/auth/pages/profile-settings/profile-schema';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { AvatarInput } from './avatar-input';
import { useGetProfileQuery, useUpdateProfileMutation, useUploadImageMutation } from '@/store/api/auth';
import { useGetDepartmentsQuery } from '@/store/api/department';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';

interface ProfileFormSectionProps {
    onSave: (data: CompleteProfileSchemaType) => void;
    onCancel: () => void;
}

export const ProfileFormSection = ({ onSave, onCancel }: ProfileFormSectionProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { data: profile, isLoading, isError, error: queryError } = useGetProfileQuery();
    const { data: departmentsData, isLoading: isDepartmentsLoading } = useGetDepartmentsQuery();
    const [updateProfile] = useUpdateProfileMutation();
    const [uploadImage] = useUploadImageMutation();

    useEffect(() => {
        console.log('Profile Query State:', { data: profile, isLoading, isError, error: queryError });
        if (error) {
            console.error('Profile fetch error:', queryError);
        }
    }, [profile, isLoading, isError, queryError]);

    const form = useForm<CompleteProfileSchemaType>({
        resolver: zodResolver(getCompleteProfileSchema()),
        mode: 'onChange',
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            department: '',
            gender: '',
            phone: '',
        },
    });

    // Populate form when profile loads
    useEffect(() => {
        if (profile) {
            form.reset({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                department: profile.department?.toString() || '',
                gender: profile.gender || '',
            });
        }
    }, [profile, form]);

    const onSubmit = async (values: CompleteProfileSchemaType) => {
        try {
            setIsSubmitting(true);
            setError(null);
            setSuccess(null);

            // Convert department string to number for API
            const payload = {
                ...values,
                department: parseInt(values.department, 10),
            };

            // Remove the department string field as we're sending department_id
            const { department, ...updateData } = payload;

            await updateProfile(updateData).unwrap();
            setSuccess('Profile updated successfully!');

            // Call parent onSave callback
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
                    <FormLabel className='text-center text-[#2E3A59] pb-2'>Upload Image</FormLabel>
                    <div className="flex items-center gap-4 justify-center">
                        <AvatarInput />

                    </div>
                </div>
                <Card className='p-3 col-span-2 '>
                    <CardTitle className='text-[#09090B] pb-6'>Personal Information</CardTitle>
                    <CardContent className="p-4 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-x-3 ">
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
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department *</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange} disabled={isDepartmentsLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isDepartmentsLoading ? "Loading departments..." : "Select department"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {departmentsData?.items?.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gender *</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Gender" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90"
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Saving...
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
