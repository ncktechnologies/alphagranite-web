import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, Check } from "lucide-react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useUploadImageMutation } from "@/store/api/auth";
import { UploadedFileMeta } from "@/types/uploads";
import { 
  useGetSalesCTByFabIdQuery,
  useSetSCTReviewYesMutation,
  useSendToDraftingMutation
} from "@/store/api/job";
// Remove the employee API import since we'll get sales person from FAB data
// import { useGetEmployeesQuery } from "@/store/api/employee";

const revisionSchema = z.object({
  // Remove salesPerson from schema since we'll use FAB data
  reason: z.string().min(1, "Revision reason is required"),
  files: z.array(z.any()).optional(),
});

type RevisionData = z.infer<typeof revisionSchema>;

interface RevisionModalProps {
  open: boolean;
  onClose: () => void;
  fabId: string;
  jobNumber: string;
  fabType: string;
  totalSqFt: number;
  pieces: number;
  // Remove salesPerson prop since we'll get it from FAB data
  // salesPerson: string;
  onSubmit: (data: RevisionData) => void;
  sctId?: number; // Add SCT ID for revision update
  // Add fabSalesPerson prop to receive sales person from FAB data
  fabSalesPerson?: string;
}

export const RevisionModal = ({
  open,
  onClose,
  fabId,
  jobNumber,
  fabType,
  totalSqFt,
  pieces,
  // Remove salesPerson destructuring
  // salesPerson,
  onSubmit,
  sctId,
  // Add fabSalesPerson destructuring
  fabSalesPerson,
}: RevisionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadImage] = useUploadImageMutation();
  const [setSCTReviewYes] = useSetSCTReviewYesMutation();
  const [sendToDrafting] = useSendToDraftingMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  
  // Remove employee API call since we're getting sales person from FAB data
  // const { data: employeesData, isLoading: isEmployeesLoading } = useGetEmployeesQuery({
  //   department_id: 1, // Assuming sales department ID is 1, adjust as needed
  //   role_id: 2, // Assuming sales role ID is 2, adjust as needed
  // });
  
  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      // Remove salesPerson from default values
      // salesPerson,
      reason: "",
      files: [],
    },
    mode: "onChange", // Validate on change
  });

  const uploadSelectedFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const uploaded: UploadedFileMeta[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadImage(formData).unwrap();
      uploaded.push({
        id: response.id.toString(),
        name: file.name,
        size: file.size,
        filename: response.filename,
        url: response.url,
        type: file.type,
      });
    }

    setUploadedFiles((prev) => [...prev, ...uploaded]);
    form.setValue("files", [...(form.getValues("files") ?? []), ...uploaded]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      await uploadSelectedFiles(e.target.files);
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Failed to upload files", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting revision:", values);
      
      // If no SCT ID is available, we should not try to create one here
      // The SCTService should handle SCT creation
      // If sctId is not provided, it means either:
      // 1. SCT doesn't exist and couldn't be created
      // 2. There was an error fetching SCT data
      // In either case, we shouldn't attempt to create it again
      const currentSctId = sctId;
      
      // Make sure we have a valid SCT ID before proceeding
      if (!currentSctId) {
        toast.error("No Sales Check Task available. Please refresh the page and try again.");
        return;
      }
      
      // Collect file IDs if any files were uploaded
      let fileIds: string | undefined;
      if (uploadedFiles.length > 0) {
        fileIds = uploadedFiles.map(file => file.id).join(',');
      }
      
      // First, set review needed to yes with revision reason and file IDs
      await setSCTReviewYes({
        sct_id: currentSctId,
        revision_reason: values.reason,
        file_ids: fileIds
      }).unwrap();
      
      // Then, send to drafting with notes
      await sendToDrafting({
        fab_id: parseInt(fabId.replace('FAB-', '')),
        data: {
          notes: values.reason
        }
      }).unwrap();
      
      toast.custom(
        () => (
          <Alert variant="success" icon="success">
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>
              Revision sent <br />
              Your revision was sent back to drafting department successfully
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-right',
        },
      );
      onSubmit(values);
      onClose();
      navigate('/job/revision')
    } catch (error) {
      console.error("Failed to submit revision:", error);
      toast.error("Failed to submit revision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debugging: Log form state changes
  useEffect(() => {
    console.log("Form state:", {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      sctId: sctId,
      reasonValue: form.getValues("reason"),
      reasonLength: form.getValues("reason")?.length || 0
    });
  }, [form.formState, sctId, form.watch("reason")]);

  // Trigger validation when SCT ID becomes available
  useEffect(() => {
    if (sctId) {
      form.trigger(); // Manually trigger validation when SCT ID is available
    }
  }, [sctId, form]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold py-2 border-b">
            SCT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-5 pb-6 ">
          <p className="font-semibold text-black leading-4">{fabId}</p>
          <p className="text-sm text-black">Conference Table – Quartz</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm pb-5 border-b space-y-3">
          <div>
            <p className="text-text-foreground">Job #</p>
            <p className="font-semibold leading-[28px] text-base text-text">{jobNumber}</p>
          </div>
          <div>
            <p className="text-text-foreground">FAB type</p>
            <p className="font-semibold leading-[28px] text-base text-text">{fabType}</p>
          </div>
          <div>
            <p className="text-text-foreground">No. of pieces</p>
            <p className="font-semibold leading-[28px] text-base text-text">{pieces}</p>
          </div>
          <div>
            <p className="text-text-foreground">Total Sq Ft</p>
            <p className="font-semibold leading-[28px] text-base text-text">{totalSqFt}</p>
          </div>
          {/* Display sales person from FAB data */}
          <div>
            <p className="text-text-foreground">Sales person</p>
            <p className="font-semibold leading-[28px] text-base text-text">
              {fabSalesPerson || 'Not assigned'}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-5">
            {/* Remove Sales Person field since we're displaying it above from FAB data */}
            
            {/* Revision Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revision reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Square foot bigger than what was templated initially"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Upload file</FormLabel>
              <div className="flex items-center gap-6">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-start h-12 border border-dashed rounded-md">
                    <div className="flex items-center gap-2 text-sm uderline text-primary px-3">
                      <img src='/images/app/upload.svg' className="w-[27px] h-[21px]" />
                      Upload file
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      ref={fileInputRef}
                    />
                  </div>
                </label>

                <Button
                  type="button"
                  variant="dashed"
                  className="flex flex-1 items-center gap-2 h-12"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              {isSubmitting && (
                <p className="text-xs text-muted-foreground pt-1">Submitting revision...</p>
              )}

              {uploadedFiles.length > 0 && (
                <div className="space-y-1 pt-2 text-sm text-muted-foreground">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx}>• {file.name}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="w-[127px]">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? "Submitting..." : 
                 !form.formState.isValid ? "Enter revision reason" :
                 "Submit revision"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};