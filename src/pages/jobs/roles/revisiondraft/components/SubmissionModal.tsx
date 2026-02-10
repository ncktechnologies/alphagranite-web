// RevisionForm.tsx - Simplified like drafting modal
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import { Drafting } from '@/store/api/job';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { Can } from '@/components/permission';

// Simplified schema - only what's needed for revision submission
const revisionSchema = z.object({
  complete: z.boolean().default(false),
  notes: z.string().optional(),
  mentions: z.string().optional(),
  sqftDrafted: z.string().optional(),
});

type RevisionData = z.infer<typeof revisionSchema>;

export const RevisionForm = ({
  onSubmit,
  onClose,
  revisionReason = "",
  draftingData,
  isRevision = false,
  fabId,
  userId,
  fabData,
  uploadedFilesCount = 0,
}: {
  onSubmit: (data: RevisionData) => void;
  onClose: () => void;
  revisionReason?: string;
  draftingData?: Drafting;
  isRevision?: boolean;
  fabId?: number;
  userId?: number;
  fabData?: any;
  uploadedFilesCount?: number;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const { data: employeesData } = useGetSalesPersonsQuery();
  const salesPersons = Array.isArray(employeesData) ? employeesData : [];

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    mode: 'onChange',
    defaultValues: {
      complete: false,
      notes: '',
      mentions: fabData?.sales_person_id ? String(fabData.sales_person_id) : '',
      sqftDrafted: '',
    },
  });

  // Watch the complete field
  const completeValue = form.watch('complete');

  const handleFormSubmit = async (values: RevisionData) => {
    if (uploadedFilesCount === 0) {
      toast.error("Please upload at least one file before submitting");
      return;
    }

    if (!isConfirmed) {
      toast.error("Please confirm the revision is completed by checking the box");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting revision data:', values);
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error("Failed to submit revision:", error);
      toast.error("Failed to submit revision");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="p-4 space-y-6" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
            {revisionReason && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="font-medium text-sm mb-1 text-yellow-800">Revision Reason:</h3>
                <p className="text-sm text-yellow-700">{revisionReason}</p>
              </div>
            )}

            {/* Files Summary */}
            {uploadedFilesCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-medium text-sm mb-1 text-red-800">No Files Uploaded</h3>
                <p className="text-sm text-red-700">
                  Please upload files in the main activity view before submitting
                </p>
              </div>
            )}

            {/* Revision Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revision Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes about this revision..." 
                      {...field} 
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Square Footage Drafted */}
            <FormField
              control={form.control}
              name="sqftDrafted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Footage Drafted (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter square footage drafted" 
                      {...field} 
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notify Sales */}
            <FormField
              control={form.control}
              name="mentions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notify Sales Person</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales person to notify" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesPersons.map((person: any) => (
                        <SelectItem key={person.id} value={String(person.id)}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmation Checkbox */}
            <div className="flex flex-row items-center space-x-3 mt-4 p-3 border rounded-md">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(v) => setIsConfirmed(Boolean(v))}
                disabled={uploadedFilesCount === 0}
                id="revision-confirm"
              />
              <label 
                htmlFor="revision-confirm"
                className={`font-semibold text-[16px] leading-none ${
                  uploadedFilesCount === 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : isConfirmed 
                      ? 'text-green-600 cursor-pointer' 
                      : 'text-gray-700 cursor-pointer'
                }`}
                onClick={() => {
                  if (uploadedFilesCount > 0) {
                    setIsConfirmed(!isConfirmed);
                  }
                }}
              >
                Revision Complete 
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isConfirmed || uploadedFilesCount === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? "Submitting..." : "Submit Revision"}
              </Button>
            </div>
          
      </form>
    </Form>
  );
};