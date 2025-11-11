import ProfileForm from "@/auth/pages/profile-settings/form";
import { SignUpPage } from "@/auth/pages/signup-page";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { ReactNode, useState } from "react";
import { useCreateEmployeeMutation } from '@/store/api/employee';
import { useGetDepartmentsQuery } from '@/store/api/department';
import { useGetRolesQuery } from '@/store/api/role';
import { Button } from '@/components/ui/button';
import { LoaderCircleIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarInput } from '@/partials/common/avatar-input';
import Popup from '@/components/ui/popup';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { CompleteProfileSchemaType, getCompleteProfileSchema } from "@/auth/pages/profile-settings/profile-schema";

const EmploymentFormSheet = ({ trigger }: { trigger: ReactNode }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPopover, setShowPopover] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);

    // API hooks
    const [createEmployee] = useCreateEmployeeMutation();
    const { data: departmentsData } = useGetDepartmentsQuery();
    const { data: rolesData } = useGetRolesQuery();

    const form = useForm<CompleteProfileSchemaType>({
        resolver: zodResolver(getCompleteProfileSchema()),
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            department: '',
            home_address: '',
            phone: '',
            gender: '',
        },
    });

    async function onSubmit(values: CompleteProfileSchemaType) {
        try {
            setIsSubmitting(true);
            setError(null);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('first_name', values.first_name);
            formData.append('last_name', values.last_name);
            formData.append('email', values.email);
            formData.append('department', values.department || ''); 
            formData.append('home_address', values.home_address || '');
            formData.append('phone', values.phone || '');
            if (values.gender) {
                formData.append('gender', values.gender);
            }
            if (profileImage) {
                formData.append('profile_image', profileImage);
            }

            await createEmployee(formData).unwrap();

            setSuccess('Employee added successfully!');
            setShowPopover(true);
            form.reset();
            setProfileImage(null);
            setIsSheetOpen(false);

        } catch (err: any) {
            setError(err?.data?.message || 'Failed to create employee. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleCancel = () => {
        form.reset();
        setIsSheetOpen(false);
        setError(null);
    };

    return (
        <>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
                <SheetContent className="gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-4 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <SheetHeader className="mb-3 border-border pb-3.5 border-b">
                                <SheetTitle>Add new employee</SheetTitle>
                            </SheetHeader>

                            <SheetBody className="flex-1">
                                <ScrollArea className="h-full">
                                    <div className="space-y-10">
                                        {/* {error && (
                                            <Alert variant="destructive">
                                                <AlertIcon>
                                                    <AlertCircle className="h-4 w-4" />
                                                </AlertIcon>
                                                <AlertTitle>{error}</AlertTitle>
                                            </Alert>
                                        )} */}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                                            <div className="space-y-2 col-span-2">
                                                <FormLabel>Upload image</FormLabel>
                                                <div className="flex items-center gap-4">
                                                    <AvatarInput onFileChange={(file) => setProfileImage(file)} />
                                                </div>
                                            </div>

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
                                                        <FormLabel>Email address *</FormLabel>
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
                                                                    <SelectValue placeholder="Select Department" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {departmentsData?.items?.map((dept) => (
                                                                    <SelectItem key={dept.id} value={String(dept.id)}>
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
                                                name="home_address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Home address *</FormLabel>
                                                        <FormControl><Input placeholder="Enter home address" type="text" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField control={form.control} name="phone" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl><Input placeholder="Your phone number" type="text" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            
                                            <FormField
                                                control={form.control}
                                                name="gender"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Gender</FormLabel>
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
                                    </div>
                                </ScrollArea>
                            </SheetBody>

                            <SheetFooter className="py-3.5 px-5 border-border flex justify-end gap-3 mt-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                    className="justify-center"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSubmitting}
                                    className="justify-center"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </span>
                                    ) : (
                                        'Save employee'
                                    )}
                                </Button>

                            </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>

            <Popup
                isOpen={showPopover}
                title='Employee added successfully'
                description='You have added a new employee successfully'
            >
                <div className="flex flex-col items-center mt-4">
                    <Button
                        className="px-8"
                        onClick={() => {
                            setShowPopover(false);
                        }}
                    >
                        Close
                    </Button>
                </div>
            </Popup>
        </>
    );
}

export default EmploymentFormSheet;