import { useState } from "react";
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
import { LoaderCircle, Check, Undo2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AssignTechnicianModal } from "./AssignTech";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useParams } from "react-router";
import { useGetFabByIdQuery, useGetTemplatingByFabIdQuery, useUnscheduleTemplatingMutation, useCreateFabNoteMutation } from "@/store/api/job";
import { Can } from '@/components/permission';
import { BackButton } from "@/components/common/BackButton";

const reviewChecklistSchema = z.object({
    customerInfo: z.boolean(),
    materialSpecs: z.boolean(),
    stoneType: z.boolean(),
    stoneColour: z.boolean(),
    fabType: z.boolean(),
    notes: z.string().optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

export function ReviewChecklistForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: fab } = useGetFabByIdQuery(Number(id));

    // Get templating data to check if there's a schedule
    const { data: templatingData, isLoading: isTemplatingLoading } = useGetTemplatingByFabIdQuery(Number(id));

    // Mutation for unscheduling
    const [unscheduleTemplating] = useUnscheduleTemplatingMutation();
    // Mutation for creating fab notes
    const [createFabNote] = useCreateFabNoteMutation();

    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            customerInfo: false,
            materialSpecs: false,
            stoneType: false,
            stoneColour: false,
            fabType: false,
        },
    });

    const onSubmit = async (values: ReviewChecklistData) => {
        // Check if any checkboxes are checked (not all required)
        const anyChecked = values.customerInfo || values.materialSpecs || values.stoneType ||
            values.stoneColour || values.fabType;

        if (!anyChecked) {
            toast.error("Please check at least one checklist item");
            return;
        }

        // Handle notes submission if notes exist
        if (values.notes && values.notes.trim()) {
            try {
                await createFabNote({
                    fab_id: Number(id),
                    note: values.notes.trim(),
                    stage: "templating"
                }).unwrap();
                toast.success("Note added successfully");
            } catch (error) {
                console.error("Error creating note:", error);
                toast.error("Failed to add note");
                // Don't prevent form submission if note creation fails
            }
        }

        // Open the assign technician modal instead of submitting directly
        setOpenModal(true);
    };

    const handleUnschedule = async () => {
        try {
            if (templatingData?.data?.id) {
                await unscheduleTemplating({
                    templating_id: templatingData.data.id
                }).unwrap();
                toast.success('Templating unscheduled successfully');
            } else {
                // No templating schedule found, which is not an error condition
                // toast.info('No templating schedule/ found for this job');
            }
        } catch (error) {
            console.error('Failed to unschedule templating:', error);
            toast.error('Failed to unschedule templating');
        }
    };

    // Check if there's a technician assigned and a template schedule
    const isScheduled = !!templatingData?.data?.technician_name && !!templatingData?.data?.schedule_start_date;

    // Show loading state while checking templating data
    if (isTemplatingLoading) {
        return (
            <div className="space-y-4">
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-text">Review Checklist</h2>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                </div>
                <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
                <Separator className="my-4" />
                <div className="space-y-3 mt-6">
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-text">Review Checklist</h2>
                        {[
                            { name: "customerInfo", label: "Customer information verified" },
                            { name: "materialSpecs", label: "Material specifications confirmed" },
                            { name: "stoneType", label: "Stone type confirmed" },
                            { name: "stoneColour", label: "Stone type colour confirmed" },
                            { name: "fabType", label: "FAB type confirmed" },
                        ].map(({ name, label }) => (
                            <FormField
                                key={name}
                                control={form.control}
                                name={name as keyof ReviewChecklistData}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3">
                                        <FormControl>
                                            <Checkbox
                                                checked={Boolean(field.value)}
                                                onCheckedChange={(checked) => field.onChange(checked)}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal text-text-foreground">{label}</FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
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
                        {!isScheduled && (
                            <Can action="update" on="Templating">
                                <Button className="w-full py-6 text-base" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <LoaderCircle className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </span>
                                    ) : (
                                        " Schedule for templating"
                                    )}
                                </Button>
                            </Can>
                        )}

                        {isScheduled && (
                            <Can action="update" on="Templating">
                                <Button
                                    variant="outline"
                                    className="w-full text-secondary font-bold py-6 text-base"
                                    onClick={handleUnschedule}
                                    type="button"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Unschedule
                                </Button>
                            </Can>
                        )}
                        <BackButton className="w-full text-secondary font-bold py-6 text-base" fallbackUrl="/job/templating" label="Cancel"  />

                        {/* <Button variant="outline" className="w-full text-secondary font-bold py-6 text-base">
                            <Undo2 />
                            Return to sales
                        </Button> */}
                        {/* <Button variant="ghost" className="w-full text-[#2B892B] underline py-6 text-base">
                            <Save />
                            Save to draft
                        </Button> */}
                    </div>
                </form>
            </Form>


            {/* ✅ Modal opens after submit */}
            {openModal && (
                <AssignTechnicianModal
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                    fabData={{
                        fabId: fab?.id ? `FAB-${fab.id}` : "FAB-ID",
                        jobName: fab?.fab_type || "Job Name",
                        revenue: fab?.revenue
                    }}
                />
            )}
        </>
    );
}