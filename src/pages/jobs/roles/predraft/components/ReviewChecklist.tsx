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
    useGetFabByIdQuery
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
                                    disabled={isSubmitting || !form.watch("templatereceived") || !form.watch("templatereview")}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <LoaderCircle className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : (
                                        "Schedule for drafting"
                                    )}
                                </Button>
                                {(!form.watch("templatereceived") || !form.watch("templatereview")) && (
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        {!form.watch("templatereceived") && !form.watch("templatereview")
                                            ? "Please check both boxes above"
                                            : !form.watch("templatereceived")
                                                ? "Please check 'Template received'"
                                                : "Please check 'Template review complete'"
                                        }
                                    </p>
                                )}
                            </div>
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