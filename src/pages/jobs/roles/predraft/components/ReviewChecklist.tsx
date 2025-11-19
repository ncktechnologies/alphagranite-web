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
import { useUpdateFabMutation, useCompleteTemplatingMutation, useGetTemplatingByFabIdQuery, useGetFabByIdQuery } from "@/store/api/job"; // Added completeTemplating mutation and getFabById
import { useGetSalesPersonsQuery } from "@/store/api";

const reviewChecklistSchema = z.object({
    templatereview: z.boolean(),
    notes: z.string().optional(),
    drafter: z.string().optional(),
    square_ft: z.string().optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

interface ReviewChecklistFormProps {
    fabId?: number;
    templateReceived?: boolean;
}

export function ReviewChecklistForm({ fabId, templateReceived = false }: ReviewChecklistFormProps) {
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
    const [completeTemplating] = useCompleteTemplatingMutation(); // Add completeTemplating mutation
    // Add hook to fetch templating data and fab data
    const { data: templatingData } = useGetTemplatingByFabIdQuery(fabId || 0, { skip: !fabId });
    const { data: fabData } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
    
    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            templatereview: false,
            square_ft: '',
            drafter: 'none'
        },
    });

    // Populate square footage from endpoint when fabData is available
    useEffect(() => {
        if (fabData && fabData.total_sqft) {
            form.setValue('square_ft', fabData.total_sqft.toString());
        }
    }, [fabData, form]);

    const onSubmit = async (values: ReviewChecklistData) => {
        // Check if template is received before allowing submission
        if (!templateReceived) {
            toast.error("Template must be received before assigning a drafter");
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Update the fab with the selected drafter (if any) and square footage
            if (fabId) {
                const updateData: any = {};
                
                // Include template review status
                updateData.template_reviewed = values.templatereview;
                
                // Only include drafter_id if a drafter was selected (not "none")
                if (values.drafter && values.drafter !== "none") {
                    updateData.drafter_id = parseInt(values.drafter);
                }
                
                // Include square footage if provided
                if (values.square_ft) {
                    updateData.total_sqft = parseFloat(values.square_ft);
                }
                
                // Include notes if provided
                if (values.notes) {
                    updateData.notes = [values.notes]; // Wrap in array as API expects notes as array
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
                            // actual_sqft: values.square_ft || undefined,
                            // notes: values.notes ? [values.notes] : undefined
                        }).unwrap();
                    }
                }
            }
            
            toast.success("Checklist review completed successfully!");
            // Navigate directly to predraft page instead of opening modal
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

                    <FormField
                        control={form.control}
                        name="templatereview"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
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
                                <FormLabel>Assign to Drafter {templateReceived && ''}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!templateReceived || isLoadingSalesPersons}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={templateReceived ? "Select drafter (optional)" : "Template not received"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {isLoadingSalesPersons ? (
                                            <SelectItem value="loading" disabled>Loading drafters...</SelectItem>
                                        ) : (
                                            <>
                                                {/* Empty option for no drafter selection */}
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
                                {!templateReceived && (
                                    <p className="text-sm text-yellow-600">Template must be received before assigning a drafter</p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="notes"
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
                    <Separator className="my-4" />

                    <div className="space-y-3 mt-6">
                        <Button className="w-full py-6 text-base" type="submit" disabled={isSubmitting || !templateReceived}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </span>
                            ) : (
                                "Schedule for drafting" // Changed button name
                            )}
                        </Button>
                        <Button variant="outline" className="w-full text-secondary font-bold py-6 text-base" onClick={() => navigate('/job/predraft')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Removed the AssignTechnicianModal component */}
        </>
    );
}