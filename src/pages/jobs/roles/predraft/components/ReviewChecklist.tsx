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
import { LoaderCircle, Check, Undo2, Save } from "lucide-react";
import { toast } from "sonner";
import { AssignTechnicianModal } from "./AssignTech";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";

const reviewChecklistSchema = z.object({
    templatereview: z.boolean(),
    notes: z.string().optional(),
    technician: z.string().min(1, "Please select a technician"),
    square_ft: z.string().optional(),

});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

export function ReviewChecklistForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const navigate = useNavigate()
    const form = useForm<ReviewChecklistData>({
        resolver: zodResolver(reviewChecklistSchema),
        defaultValues: {
            templatereview: false,
            square_ft: ''
        },
    });

    const onSubmit = async (values: ReviewChecklistData) => {
        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 1200));

        toast.success("Checklist review completed successfully!");
        setOpenModal(false); // ✅ open modal when checklist passes
        setIsSubmitting(false);
        navigate('/job/draft')
    };
    const technicians = ["John Doe", "Mary Smith", "Daniel Kim", "Sophia Brown"];

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
                                        checked={Boolean(field.value)}
                                        onCheckedChange={(checked) => field.onChange(checked)}
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
                                <Input placeholder="146" disabled {...field} />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="technician"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assign to Drafter *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select technician" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {technicians.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
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
                        <Button variant="outline" className="w-full text-secondary font-bold py-6 text-base">
                            {/* <Undo2 /> */}
                            Cancel
                        </Button>

                    </div>
                </form>
            </Form>


            {/* ✅ Modal opens after submit */}
            {openModal && (
                <AssignTechnicianModal
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                // fabData={fabData}
                />
            )}
        </>
    );
}
