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
import { ReactNode } from "react";
import { Button } from '@/components/ui/button';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, LoaderCircleIcon, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarInput } from '@/partials/common/avatar-input';
import Popup from '@/components/ui/popup';
import { useState } from 'react';
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
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPopover, setShowPopover] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false); // Control sheet state

    const form = useForm<CompleteProfileSchemaType>({
        resolver: zodResolver(getCompleteProfileSchema()),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            department: '',
            gender: '',
            phone: '',
        },
    });

    async function onSubmit(values: CompleteProfileSchemaType) {
        try {
            setIsSubmitting(true);
            setError(null);

            console.log('Profile data submitted:', values);

            // Simulate API call
            await new Promise((res) => setTimeout(res, 1000));

            setSuccess('Employee added successfully!');
            setShowPopover(true);
            form.reset();
            setIsSheetOpen(false); // Close sheet on success

        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
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
                                                <FormLabel>Upload photo *</FormLabel>
                                                <div className="flex items-center gap-4">
                                                    <AvatarInput />
                                                </div>
                                            </div>

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
                                                        <FormLabel>Personal email address *</FormLabel>
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
                                                                <SelectItem value="drafter">Drafter</SelectItem>
                                                                <SelectItem value="sales-person">Sales person</SelectItem>
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
                                            <FormField control={form.control} name="phone" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl><Input placeholder="Your phone number" type="text" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                </ScrollArea>
                            </SheetBody>

                            <SheetFooter className="py-3.5 px-5 border-border flex justify-end gap-3 mt-auto">
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
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                    className="justify-center"
                                >
                                    Cancel
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