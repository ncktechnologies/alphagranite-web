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
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import {
    useUpdateFabMutation,
    useCompleteTemplatingMutation,
    useMarkTemplatingReceivedMutation,
    useGetTemplatingByFabIdQuery,
    useGetFabByIdQuery,
    useCreatePredraftReviewMutation,
    useGetPredraftReviewByFabIdQuery,
    useCompletePredraftReviewMutation,
    useCreateFabNoteMutation
} from "@/store/api/job";

import { useGetSalesPersonsQuery } from "@/store/api";
import { Can } from '@/components/permission';

// ── Schema ────────────────────────────────────────────────────────────────────
// templatereceived and templatereview are still in schema but optional
// so the form stays compatible whether or not the fields are shown
const reviewChecklistSchema = z.object({
    templatereceived: z.boolean().optional(),
    templatereview:   z.boolean().optional(),
    predraftreview:   z.boolean().optional(), // shown when template_needed === false
    fab_notes:        z.string().optional(),
    drafter:          z.string().optional(),
    square_ft:        z.string().optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

interface ReviewChecklistFormProps {
    fabId?: number;
}

export function ReviewChecklistForm({ fabId }: ReviewChecklistFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const { data: salesPersonsData } = useGetSalesPersonsQuery();
    const salesPersons = Array.isArray(salesPersonsData) ? salesPersonsData : [];

    const [updateFab]               = useUpdateFabMutation();
    const [completeTemplating]      = useCompleteTemplatingMutation();
    const [markTemplatingReceived]  = useMarkTemplatingReceivedMutation();
    const [createPredraftReview]    = useCreatePredraftReviewMutation();
    const [completePredraftReview]  = useCompletePredraftReviewMutation();
    const [createFabNote]           = useCreateFabNoteMutation();

    const { data: templatingData } = useGetTemplatingByFabIdQuery(fabId || 0, { skip: !fabId });
    const { data: fabData }        = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
    const { data: predraftData }   = useGetPredraftReviewByFabIdQuery(fabId || 0, { skip: !fabId });

    // ── Derive whether template is needed from fabData ────────────────────────
    // template_needed === false  →  skip template fields, show predraft review only
    // template_needed === true (or undefined/null)  →  show template fields
    const templateNeeded = fabData?.template_needed !== false;

    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            templatereceived: false,
            templatereview:   false,
            predraftreview:   false,
            square_ft:        '',
            drafter:          'none',
        },
    });

    // ── Populate fields from fabData ──────────────────────────────────────────
    useEffect(() => {
        if (fabData) {
            if (fabData.total_sqft) {
                form.setValue('square_ft', fabData.total_sqft.toString());
            }
            if (fabData.template_received) {
                form.setValue('templatereceived', fabData.template_received);
            }
        }
    }, [fabData, form]);

    // ── Handle template received checkbox ─────────────────────────────────────
    const handleTemplateReceivedChange = async (checked: boolean) => {
        form.setValue('templatereceived', checked);

        if (checked && fabId) {
            try {
                const templatingId = templatingData?.data?.id;
                if (templatingId) {
                    await markTemplatingReceived({ templating_id: templatingId }).unwrap();
                    toast.success("Template marked as received");
                }
            } catch (error) {
                console.error("Failed to mark template as received:", error);
                toast.error("Failed to mark template as received");
                form.setValue('templatereceived', false);
            }
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const onSubmit = async (values: ReviewChecklistData) => {
        setIsSubmitting(true);

        try {
            // 1. Create fab note if provided
            if (values.fab_notes?.trim() && fabId) {
                try {
                    await createFabNote({
                        fab_id: fabId,
                        note: values.fab_notes.trim(),
                        stage: "pre_draft_review"
                    }).unwrap();
                } catch (noteError) {
                    console.error("Error creating fab note:", noteError);
                }
            }

            if (fabId) {
                const updateData: any = {};

                if (templateNeeded) {
                    // Template flow — same as before
                    updateData.template_reviewed = values.templatereview;
                } else {
                    // No-template flow — mark predraft review directly
                    updateData.template_needed   = false;
                    updateData.template_reviewed = true; // auto-pass since no template needed
                }

                if (values.drafter && values.drafter !== "none") {
                    updateData.drafter_id = parseInt(values.drafter, 10);
                }

                if (values.square_ft) {
                    updateData.total_sqft = parseFloat(values.square_ft);
                }

                await updateFab({ id: fabId, data: updateData }).unwrap();

                // 2. Predraft review flow
                // Triggered either by templatereview (template flow)
                // or by predraftreview checkbox (no-template flow)
                const shouldCompletePredraft = templateNeeded
                    ? values.templatereview
                    : values.predraftreview;

                if (shouldCompletePredraft) {
                    let reviewId = predraftData?.data?.id;

                    if (!reviewId) {
                        const createResponse = await createPredraftReview({
                            fab_id: fabId,
                            notes: values.fab_notes || undefined
                        }).unwrap();
                        reviewId = createResponse?.data?.id || createResponse?.id;
                    }

                    if (reviewId) {
                        await completePredraftReview({
                            review_id: reviewId,
                            is_completed: true,
                            notes: values.fab_notes || undefined
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

    // ── Submit button disabled logic ──────────────────────────────────────────
    // Template flow:   both templatereceived + templatereview must be checked
    // No-template flow: predraftreview must be checked
    const isSubmitDisabled = isSubmitting || (
        templateNeeded
            ? !form.watch("templatereceived") || !form.watch("templatereview")
            : !form.watch("predraftreview")
    );

    const submitHint = templateNeeded
        ? !form.watch("templatereceived") && !form.watch("templatereview")
            ? "Please check both boxes above"
            : !form.watch("templatereceived")
                ? "Please check 'Template received'"
                : "Please check 'Template review complete'"
        : !form.watch("predraftreview")
            ? "Please confirm the pre-draft review is complete"
            : null;

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Can action="update" on="Pre-draft Review">

                        {templateNeeded ? (
                            // ── Template flow ─────────────────────────────────
                            <>
                                <FormField
                                    control={form.control}
                                    name="templatereceived"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value ?? false}
                                                    onCheckedChange={(checked) =>
                                                        handleTemplateReceivedChange(checked as boolean)
                                                    }
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-semibold text-text">
                                                Template received
                                            </FormLabel>
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
                                                    checked={field.value ?? false}
                                                    onCheckedChange={field.onChange}
                                                    disabled={!form.watch("templatereceived")}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-semibold text-text">
                                                Template review complete
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : (
                            // ── No-template flow ──────────────────────────────
                            // Template not needed — show only the predraft review confirmation
                            <FormField
                                control={form.control}
                                name="predraftreview"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value ?? false}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-base font-semibold text-text">
                                            Pre-draft review complete
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Square Ft — shown in both flows */}
                        <FormField
                            control={form.control}
                            name="square_ft"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Square Ft</FormLabel>
                                    <Input placeholder="146" {...field} />
                                </FormItem>
                            )}
                        />

                        {/* Notes — shown in both flows */}
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
                                    disabled={isSubmitDisabled}
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
                                {submitHint && (
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        {submitHint}
                                    </p>
                                )}
                            </div>
                        </Can>

                        <Button
                            variant="outline"
                            type="button"
                            className="w-full text-secondary font-bold py-6 text-base"
                            onClick={() => navigate('/job/predraft')}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
}