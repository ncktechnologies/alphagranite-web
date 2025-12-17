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
    useCompleteTemplatingMutation,
    useMarkTemplatingReceivedMutation,
    useGetTemplatingByFabIdQuery,
    useGetFabByIdQuery,
    useCreateDraftingMutation
} from "@/store/api/job";
import { useGetSalesPersonsQuery } from "@/store/api";
import { Can } from '@/components/permission';

const reviewChecklistSchema = z.object({
    templatereceived: z.boolean(),
    templatereview: z.boolean(),
    fab_notes: z.string().optional(),
    drafter: z.string().optional(),
    square_ft: z.string().optional(),
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
    const [completeTemplating] = useCompleteTemplatingMutation();
    const [markTemplatingReceived] = useMarkTemplatingReceivedMutation();
    const [createDrafting] = useCreateDraftingMutation();
    const { data: templatingData } = useGetTemplatingByFabIdQuery(fabId || 0, { skip: !fabId });
    const { data: fabData } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });

    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            templatereceived: false,
            templatereview: false,
            square_ft: '',
            drafter: 'none'
        },
    });

    // Populate square footage from endpoint when fabData is available
    useEffect(() => {
        if (fabData) {
            if (fabData.total_sqft) {
                form.setValue('square_ft', fabData.total_sqft.toString());
            }
        }
    }, [fabData, form]);

    // Handle template received checkbox change
    const handleTemplateReceivedChange = async (checked: boolean) => {
        form.setValue('templatereceived', checked);

        // If checked, call the markTemplatingReceived endpoint
        if (checked && fabId) {
            try {
                const templatingId = templatingData?.data?.id;
                if (templatingId) {
                    await markTemplatingReceived({
                        templating_id: templatingId,
                    }).unwrap();
                    toast.success("Template marked as received");
                }
            } catch (error) {
                console.error("Failed to mark template as received:", error);
                toast.error("Failed to mark template as received");
                // Revert the checkbox if the API call fails
                form.setValue('templatereceived', false);
            }
        }
    };

    const onSubmit = async (values: ReviewChecklistData) => {
        setIsSubmitting(true);

        try {
            // Update the fab with the selected drafter (if any) and square footage
            if (fabId) {
                const updateData: any = {};

                // Include template review status
                updateData.template_reviewed = values.templatereview;

                // Only include drafter_id if a drafter was selected (not "none")
                if (values.drafter && values.drafter !== "none") {
                    updateData.drafter_id = parseInt(values.drafter, 10);
                }

                // Include square footage if provided
                if (values.square_ft) {
                    updateData.total_sqft = parseFloat(values.square_ft);
                }

                // Include notes if provided
                if (values.fab_notes) {
                    updateData.fab_notes = [values.fab_notes]; // Wrap in array as API expects notes as array
                }

                // First update the FAB
                await updateFab({
                    id: fabId,
                    data: updateData
                }).unwrap();

                // If template review is marked as successful, call completeTemplating endpoint
                if (values.templatereview) {
                    // Get the templating_id from templatingData
                    const templatingId = templatingData?.data?.id;
                    if (templatingId) {
                        await completeTemplating({
                            templating_id: templatingId,
                        }).unwrap();
                    }

                    // If a drafter was selected, create a drafting assignment
                    if (values.drafter && values.drafter !== "none") {
                        try {
                            // Use the templating schedule dates for drafting
                            const startDate = fabData?.templating_schedule_start_date || new Date().toISOString();
                            const endDate = fabData?.templating_schedule_due_date ;

                            await createDrafting({
                                fab_id: fabId,
                                drafter_id: values.drafter && values.drafter !== 'none' ? parseInt(values.drafter, 10) : 0,
                                scheduled_start_date: startDate,
                                scheduled_end_date: endDate,
                                total_sqft_required_to_draft: values.square_ft || "0"
                            }).unwrap();

                            toast.success("Drafting assignment created successfully");
                        } catch (draftError) {
                            console.error("Failed to create drafting assignment:", draftError);
                            toast.error("Failed to create drafting assignment");
                        }
                    }
                }
            }

            toast.success("Checklist review completed successfully!");
            navigate('/job/predraft');
        } catch (error) {
            console.error("Failed to update fab:", error);
            toast.error("Failed to update fab details");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Find the drafters department


    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Can action="update" on="Pre-draft Review">

                        <FormField
                            control={form.control}
                            name="templatereceived"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => handleTemplateReceivedChange(checked as boolean)}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-base font-semibold text-text">Template received</FormLabel>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="templatereview"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={!form.watch("templatereceived")}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-base font-semibold text-text">Template review complete</FormLabel>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="square_ft"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Square Ft</FormLabel>
                                    <Input placeholder="146" {...field} /> {/* Removed disabled prop */}
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="drafter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign to Drafter</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("templatereceived") || isLoadingSalesPersons}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={form.watch("templatereceived") ? "Select drafter (optional)" : "Template not received"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isLoadingSalesPersons ? (
                                                <SelectItem value="loading" disabled>Loading drafters...</SelectItem>
                                            ) : (
                                                <>
                                                    <SelectItem value="none">No drafter assigned</SelectItem>
                                                    {salesPersons.map((drafter: any) => (
                                                        <SelectItem key={drafter.id} value={drafter.id.toString()}>
                                                            {drafter.name}
                                                        </SelectItem>
                                                    ))}
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {!form.watch("templatereceived") && (
                                        <p className="text-sm text-yellow-600">Template must be received before assigning a drafter</p>
                                    )}
                                    <FormMessage />
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
                            <Button className="w-full py-6 text-base" type="submit" disabled={isSubmitting || !form.watch("templatereceived")}>
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <LoaderCircle className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </span>
                                ) : (
                                    "Schedule for drafting"
                                )}
                            </Button>
                        </Can>
                        <Button variant="outline" type="button" className="w-full text-secondary font-bold py-6 text-base" onClick={() => navigate('/job/predraft')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Removed the AssignTechnicianModal component */}
        </>
    );
}