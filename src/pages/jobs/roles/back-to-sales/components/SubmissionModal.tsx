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
import { Upload, Plus, Check, X } from "lucide-react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useUploadImageMutation } from "@/store/api/auth";
import { UploadedFileMeta } from "@/types/uploads";
import {
  useGetSalesCTByFabIdQuery,
  useSetSCTReviewYesMutation,
  useSendToDraftingMutation,
  useUpdateSCTRevisionMutation
} from "@/store/api/job";
// Remove the employee API import since we'll get sales person from FAB data
// import { useGetEmployeesQuery } from "@/store/api/employee";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const revisionSchema = z.object({
  // Remove salesPerson from schema since we'll use FAB data
  revisionType: z.string().min(1, "Select revision type"),
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
  const [uploadInstances, setUploadInstances] = useState<number[]>([1]); // Track upload instances
  const [pendingFiles, setPendingFiles] = useState<{[key: number]: File[]}>({}); // Track pending files by instance ID
  const [uploadedFileInstances, setUploadedFileInstances] = useState<{[key: number]: UploadedFileMeta}>({}); // Track uploaded files by instance ID
  const [uploadImage] = useUploadImageMutation();
  const [setSCTReviewYes] = useSetSCTReviewYesMutation();
  const [sendToDrafting] = useSendToDraftingMutation();
  const [updateSCTRevision] = useUpdateSCTRevisionMutation();
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
      revisionType: "",
      reason: "",
      files: [],
    },
    mode: "onChange", // Validate on change
  });

  const handleFileSelection = (fileList: FileList, instanceId: number) => {
    const files = Array.from(fileList);
    
    // Store files locally without uploading
    setPendingFiles(prev => ({
      ...prev,
      [instanceId]: files
    }));
    
    // Create temporary file metadata for display
    const tempFiles: UploadedFileMeta[] = files.map(file => ({
      id: `temp_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    
    // Mark this instance as having selected files
    setUploadedFileInstances(prev => ({
      ...prev,
      [instanceId]: tempFiles[0] // Show first file in the instance
    }));
    
    toast.success(`${files.length} file(s) selected`);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, instanceId: number) => {
    if (!e.target.files?.length) return;
    handleFileSelection(e.target.files, instanceId);
    e.target.value = ""; // Reset input
  };

  const handleSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);
    try {

      const currentSctId = sctId;

      // Make sure we have a valid SCT ID before proceeding
      if (!currentSctId) {
        toast.error("No Sales Check Task available. Please refresh the page and try again.");
        return;
      }

      // Upload pending files and collect file IDs
      let fileIds: string | undefined;
      const allUploadedFiles: UploadedFileMeta[] = [];
      
      // Upload all pending files
      for (const [instanceId, files] of Object.entries(pendingFiles)) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const response = await uploadImage(formData).unwrap();
          
          // Handle the response structure - check if it's wrapped or direct
          const fileData = response.data ? response.data : response;
          
          const uploadedFile: UploadedFileMeta = {
            id: fileData.id.toString(),
            name: file.name,
            size: file.size,
            filename: fileData.name || fileData.filename,
            url: fileData.url,
            type: file.type,
          };
          
          allUploadedFiles.push(uploadedFile);
        }
      }
      
      if (allUploadedFiles.length > 0) {
        fileIds = allUploadedFiles.map(file => file.id).join(',');
        setUploadedFiles(allUploadedFiles);
      }
      
      // Also include any existing file IDs from props if available
      const existingFileIds = form.getValues("files")?.map((file: any) => file.id).join(',') || '';
      if (existingFileIds && fileIds) {
        fileIds = `${existingFileIds},${fileIds}`;
      } else if (existingFileIds && !fileIds) {
        fileIds = existingFileIds;
      }

      // First, set review needed to yes with revision reason and file IDs
      await setSCTReviewYes({
        sct_id: currentSctId,
        revision_reason: values.reason,
        file_ids: fileIds
      }).unwrap();

      // Update SCT revision with revision type and status
      await updateSCTRevision({
        sct_id: currentSctId,
        data: {
          revision_type: values.revisionType,
          is_revision_completed: false, // Revision is sent back, not completed yet
          draft_note: values.reason
        }
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
      navigate('/job/draft-review')
    } catch (error) {
      console.error("Failed to submit revision:", error);
      toast.error("Failed to submit revision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debugging: Log form state changes
  // useEffect(() => {
  //   console.log("Form state:", {
  //     isValid: form.formState.isValid,
  //     errors: form.formState.errors,
  //     isDirty: form.formState.isDirty,
  //     sctId: sctId,
  //     reasonValue: form.getValues("reason"),
  //     reasonLength: form.getValues("reason")?.length || 0
  //   });
  // }, [form.formState, sctId, form.watch("reason")]);

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
            {/* Revision Type */}
            <div className="max-w-[500px]">
              <FormField
                control={form.control}
                name="revisionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select revision type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cad">CAD</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Upload files</FormLabel>
              {uploadInstances.map((instanceId) => (
                <div key={instanceId} className="mb-3">
                  {uploadedFileInstances[instanceId] ? (
                    // Show selected file
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded">
                          <img src='/images/app/upload.svg' className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                            {uploadedFileInstances[instanceId].name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFileInstances[instanceId].size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Remove selected file
                          setUploadedFileInstances(prev => {
                            const newInstances = { ...prev };
                            delete newInstances[instanceId];
                            return newInstances;
                          });
                          setPendingFiles(prev => {
                            const newPending = { ...prev };
                            delete newPending[instanceId];
                            return newPending;
                          });
                        }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    // Show upload input
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-start h-12 border border-dashed rounded-md hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 text-sm underline text-primary px-3">
                          <img src='/images/app/upload.svg' className="w-[27px] h-[21px]" />
                          Select files
                        </div>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileInputChange(e, instanceId)}
                          className="hidden"
                        />
                      </div>
                    </label>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="dashed"
                className="flex items-center gap-2 h-12 w-full"
                onClick={() => setUploadInstances(prev => [...prev, Math.max(...prev) + 1])}
              >
                <Plus className="w-4 h-4" />
                Add another upload
              </Button>

              {isSubmitting && (
                <p className="text-xs text-muted-foreground pt-1">Submitting revision...</p>
              )}

              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Uploaded files:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-800 truncate">{file.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
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