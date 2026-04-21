import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
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
import { Upload, Plus, Check, X, Eye, Download } from "lucide-react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useUploadImageMutation } from "@/store/api/auth";
import { UploadedFileMeta } from "@/types/uploads";
import {
  useGetSalesCTByFabIdQuery,
  useSetSCTReviewYesMutation,
  useSendToDraftingMutation,
  useUpdateSCTRevisionMutation,
  useCreateRevisionMutation
} from "@/store/api/job";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const revisionSchema = z.object({
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
  onSubmit: (data: RevisionData) => void;
  sctId?: number;
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
  onSubmit,
  sctId,
  fabSalesPerson,
}: RevisionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadInstances, setUploadInstances] = useState<number[]>([1]);
  const [pendingFiles, setPendingFiles] = useState<{[key: number]: File[]}>({});
  const [uploadedFileInstances, setUploadedFileInstances] = useState<{[key: number]: UploadedFileMeta}>({});
  const [uploadImage] = useUploadImageMutation();
  const [setSCTReviewYes] = useSetSCTReviewYesMutation();
  const [sendToDrafting] = useSendToDraftingMutation();
  const [updateSCTRevision] = useUpdateSCTRevisionMutation();
  const [createRevision] = useCreateRevisionMutation();
  const navigate = useNavigate();
  
  // Get current user from Redux store
  const currentUser = useSelector((state: any) => state.user.user);

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      revisionType: "",
      reason: "",
      files: [],
    },
    mode: "onChange",
  });

  const handleFileSelection = (fileList: FileList, instanceId: number) => {
    const files = Array.from(fileList);
    
    setPendingFiles(prev => ({
      ...prev,
      [instanceId]: files
    }));
    
    const tempFiles: UploadedFileMeta[] = files.map(file => ({
      id: `temp_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    
    setUploadedFileInstances(prev => ({
      ...prev,
      [instanceId]: tempFiles[0]
    }));
    
    toast.success(`${files.length} file(s) selected`);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, instanceId: number) => {
    if (!e.target.files?.length) return;
    handleFileSelection(e.target.files, instanceId);
    e.target.value = "";
  };

  // Function to handle file viewing/downloading
  const handleViewFile = (file?: UploadedFileMeta, pendingFile?: File) => {
    if (pendingFile) {
      // For pending files (not uploaded yet)
      const fileUrl = URL.createObjectURL(pendingFile);
      window.open(fileUrl, '_blank');
      
      // Clean up the blob URL after 1 minute to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } else if (file?.url) {
      // For uploaded files (on server)
      window.open(file.url, '_blank');
    } else {
      toast.error("File not available for viewing");
    }
  };

  const handleSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);
    try {
      const currentSctId = sctId;

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
      
      // Include existing file IDs if available
      const existingFileIds = form.getValues("files")?.map((file: any) => file.id).join(',') || '';
      if (existingFileIds && fileIds) {
        fileIds = `${existingFileIds},${fileIds}`;
      } else if (existingFileIds && !fileIds) {
        fileIds = existingFileIds;
      }

      // Create revision - THIS SHOULD ALWAYS BE CALLED
      await createRevision({
        fab_id: Number(fabId),
        revision_type: values.revisionType,
        requested_by: currentUser?.id,
        revision_notes: values.reason
      }).unwrap();

      // Then, set review needed to yes with revision reason and file IDs
      await setSCTReviewYes({
        sct_id: currentSctId,
        revision_reason: values.reason,
        revision_type: values.revisionType,
        file_ids: fileIds
      }).unwrap();

      // Then, send to drafting with notes
      await sendToDrafting({
        fab_id: Number(fabId),
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
      // toast.error("Failed to submit revision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger validation when SCT ID becomes available
  useEffect(() => {
    if (sctId) {
      form.trigger();
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
          <div>
            <p className="text-text-foreground">Sales person</p>
            <p className="font-semibold leading-[28px] text-base text-text">
              {fabSalesPerson || 'Not assigned'}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-5">
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
                      <SelectContent className="max-h-[200px] overflow-y-auto">
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