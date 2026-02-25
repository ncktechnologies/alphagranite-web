import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle, Check, Undo2, Save } from "lucide-react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import {
    useUpdateFabMutation,
    useGetFabByIdQuery,
    useCreateFabNoteMutation,
    useCreateResurfaceSchedulingMutation,
    useUpdateResurfaceSchedulingMutation,
    useGetResurfaceSchedulingByFabIdQuery
} from "@/store/api/job";

import { useGetSalesPersonsQuery } from "@/store/api";
import { Can } from '@/components/permission';

const reviewChecklistSchema = z.object({
    resurface_completed: z.boolean(),
    fab_notes: z.string().optional(),
    drafter: z.string().optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

interface ReviewChecklistFormProps {
    fabId?: number;
}

export function ReviewChecklistForm({ fabId }: ReviewChecklistFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    // Fetch employees and departments
    const {
        data: salesPersonsData,
        isLoading: isLoadingSalesPersons,
        isError: isSalesPersonsError
    } = useGetSalesPersonsQuery();

    // Extract sales persons from the response
    const salesPersons = Array.isArray(salesPersonsData) ? salesPersonsData : [];

    const [updateFab] = useUpdateFabMutation();
    const [createFabNote] = useCreateFabNoteMutation();
    const [createResurfaceScheduling] = useCreateResurfaceSchedulingMutation();
    const [updateResurfaceScheduling] = useUpdateResurfaceSchedulingMutation();

    const { data: fabData } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
    const { data: resurfaceData } = useGetResurfaceSchedulingByFabIdQuery(fabId || 0, { skip: !fabId });

    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            resurface_completed: false,
            drafter: 'none'
        },
    });

    const onSubmit = async (values: ReviewChecklistData) => {
        setIsSubmitting(true);

        try {
            // Create fab note if provided
            if (values.fab_notes && values.fab_notes.trim() && fabId) {
                try {
                    await createFabNote({
                        fab_id: fabId,
                        note: values.fab_notes.trim(),
                        stage: "resurfacing"
                    }).unwrap();
                } catch (noteError) {
                    console.error("Error creating fab note:", noteError);
                    // Don't prevent submission if note creation fails
                }
            }
            
            // If resurface completed is marked, handle resurfacing workflow
            if (values.resurface_completed && fabId) {
                try {
                    // Check if resurfacing record exists
                    let resurifaceId = resurfaceData?.data?.id || resurfaceData?.id;
                    console.log("Existing resurface ID:", resurifaceId);

                    // If no resurfacing record exists, create one
                    if (!resurifaceId) {
                        console.log("Creating new resurfacing record for fab:", fabId);
                        const createResponse = await createResurfaceScheduling({
                            fab_id: fabId
                        }).unwrap();
                        console.log("Create response:", createResponse);
                        resurifaceId = createResponse?.data?.id || createResponse?.id;
                        console.log("New resurface ID:", resurifaceId);
                    }

                    // Update resurfacing record to mark as completed
                    if (resurifaceId) {
                        console.log("Updating resurface record:", resurifaceId);
                        await updateResurfaceScheduling({
                            resurface_scheduling_id: resurifaceId,
                            data: {
                                is_completed: true,
                                actual_start_date: new Date().toISOString(),
                                actual_end_date: new Date().toISOString()
                            }
                        }).unwrap();
                        console.log("Resurface record updated successfully");
                    } else {
                        throw new Error("Failed to get resurface scheduling ID");
                    }
                    
                    toast.success("Resurfacing checklist completed successfully!");
                    navigate('/job/resurfacing');
                } catch (resurfaceError) {
                    console.error("Error in resurfacing workflow:", resurfaceError);
                    toast.error("Error processing resurfacing: " + (resurfaceError as any)?.message);
                    setIsSubmitting(false);
                    return;
                }
            } else {
                if (!values.resurface_completed) {
                    toast.error("Please mark 'Resurface completed' before submitting");
                    setIsSubmitting(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to process resurfacing:", error);
            toast.error("Failed to process resurfacing");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Can action="update" on="Pre-draft Review">

                        <FormField
                            control={form.control}
                            name="resurface_completed"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-base font-semibold text-text">Resurface completed</FormLabel>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="fab_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Type here..."
                                            className="min-h-[100px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </Can>

                    <Separator className="my-4" />

                    <div className="space-y-3 mt-6">
                        <Can action="update" on="Pre-draft Review">
                            <div className="mb-2">
                                <Button
                                    className="w-full py-6 text-base"
                                    type="submit"
                                    disabled={isSubmitting || !form.watch("resurface_completed")}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <LoaderCircle className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        "Start Resurfacing"
                                    )}
                                </Button>
                                {!form.watch("resurface_completed") && (
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        Please check 'Resurface completed'
                                    </p>
                                )}
                            </div>
                        </Can>
                        <Button variant="outline" type="button" className="w-full text-secondary font-bold py-6 text-base" onClick={() => navigate('/job/resurfacing')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Removed the AssignTechnicianModal component */}
        </>
    );
}