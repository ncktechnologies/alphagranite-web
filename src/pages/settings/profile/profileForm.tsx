import { useState } from 'react';
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
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { LoaderCircleIcon } from 'lucide-react';
import {
    CompleteProfileSchemaType,
    getCompleteProfileSchema,
} from '@/auth/pages/profile-settings/profile-schema';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { AvatarInput } from './avatar-input';

interface ProfileFormSectionProps {
    onSave: (data: CompleteProfileSchemaType) => void;
    onCancel: () => void;
}

export const ProfileFormSection = ({ onSave, onCancel }: ProfileFormSectionProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CompleteProfileSchemaType>({
        resolver: zodResolver(getCompleteProfileSchema()),
        defaultValues: {
            firstName: 'Badmus',
            lastName: 'Edward',
            email: 'badmusedward@alphagranite.com',
            department: 'sales',
            gender: 'male',
            phone: '(239) 555-0108',
        },
    });

    const onSubmit = async (values: CompleteProfileSchemaType) => {
        setIsSubmitting(true);
        await new Promise((res) => setTimeout(res, 1000));
        onSave(values);
        setIsSubmitting(false);
    };

    return (
        <Form {...form}>
            <form
                id="profile-edit-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-4 items-start"
            >
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
                            name="firstName"
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
                            name="lastName"
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
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="sales">Sales</SelectItem>
                                            <SelectItem value="drafting">Drafting</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
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
