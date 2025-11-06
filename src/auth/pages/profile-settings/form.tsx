import React, { useEffect, useMemo } from 'react'
// pages/complete-profile-page.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/auth';
import { useGetDepartmentsQuery } from '@/store/api/department';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, LoaderCircleIcon, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CompleteProfileSchemaType, getCompleteProfileSchema } from './profile-schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarInput } from '@/partials/common/avatar-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Popup from '@/components/ui/popup';
import { FormHeader } from '@/components/ui/form-header';

export default function ProfileForm() {
    const navigate = useNavigate();
    const { data: profile, isLoading, isError, error: queryError } = useGetProfileQuery();
    const { data: departmentsData, isLoading: isDepartmentsLoading } = useGetDepartmentsQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPopover, setShowPopover] = useState(false);
    
    // Debug: Log profile query state
    useEffect(() => {
        console.log('Profile Query State:', { data: profile, isLoading, isError, error: queryError });
        if (isError) {
            console.error('Profile fetch error:', queryError);
        }
    }, [profile, isLoading, isError, queryError]);
    
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

    // Populate form with profile data when it loads
  useEffect(() => {
        if (profile) {
            form.reset(defaultValues);
        }
    }, [defaultValues, form]);

    async function onSubmit(values: CompleteProfileSchemaType) {
        try {
            setIsSubmitting(true);
            setError(null);

            // Convert department string to number for API
            const payload = {
                ...values,
                department_id: parseInt(values.department, 10),
            };
            
            // Remove the department string field as we're sending department_id
            const { department, ...updateData } = payload;

            await updateProfile(updateData).unwrap();
            setSuccess('Profile setup complete!');
            setShowPopover(true);

            // Redirect after delay
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Profile update error:', err);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handlePopupClose = () => {
        setShowPopover(false);
        // Redirect to dashboard after profile setup
        navigate('/');
    };

    return (
        <div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertIcon>
                                <AlertCircle className="h-4 w-4" />
                            </AlertIcon>
                            <AlertTitle>{String(error)}</AlertTitle>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <AlertIcon>
                                <Check className="h-4 w-4 text-green-500" />
                            </AlertIcon>
                            <AlertTitle>{success}</AlertTitle>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <div className="flex items-center gap-4 ">
                                <AvatarInput />
                                {/* <div className="text-sm text-muted-foreground">
                                    <p>Click to upload a new profile picture</p>
                                    {selectedAvatarFile && (
                                        <p className="text-green-600">New image selected: {selectedAvatarFile.name}</p>
                                    )}
                                    {isUploadingAvatar && (
                                        <p className="text-blue-600 flex items-center gap-2">
                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                            Uploading avatar...
                                        </p>
                                    )}
                                </div> */}
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name *</FormLabel>
                                    <Input placeholder="Enter first name" {...field} />
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
                                    <Input placeholder="Enter last name" {...field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Work email address *</FormLabel>
                                    <Input placeholder="Enter email address" {...field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <Input placeholder="Enter phone number" {...field} />
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
                                    <Select value={field.value} onValueChange={field.onChange} disabled >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isDepartmentsLoading ? "Loading departments..." : "Select Department"} />
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
                    </div>
                    <div className='flex justify-end mt-6'>
                        <Button type="submit" className="w-2/5" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                    Saving profile...
                                </span>
                            ) : (
                                'Proceed'
                            )}
                        </Button>
                    </div>

                </form>
            </Form>
            <Popup isOpen={showPopover}
                title='Profile setup completed'
                description='Your profile has been setup successfully'

            >

                <div className="flex flex-col items-center mt-4">


                    <Button
                        className="px-8"
                        onClick={handlePopupClose}
                    >
                        Go to dashboard
                    </Button>
                </div>
            </Popup>
        </div>
    )
}