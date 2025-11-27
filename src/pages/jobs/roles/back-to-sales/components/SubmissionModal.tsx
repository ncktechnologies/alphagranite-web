import { useRef, useState } from "react";
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
import { InputWrapper } from "@/components/ui/input";
import { Upload, Plus, Check } from "lucide-react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useUploadImageMutation } from "@/store/api/auth";
import { UploadedFileMeta } from "@/types/uploads";
import { useUpdateSCTRevisionMutation } from "@/store/api";

const revisionSchema = z.object({
  salesPerson: z.string().min(1, "Sales person is required"),
  reason: z.string().min(1, "Revision reason is required"),
  files: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
        url: z.string().optional(),
        filename: z.string().optional(),
      })
    )
    .optional(),
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
  salesPerson: string;
  onSubmit: (data: RevisionData) => void;
  sctId?: number; // Add SCT ID for revision update
}

export const RevisionModal = ({
  open,
  onClose,
  fabId,
  jobNumber,
  fabType,
  totalSqFt,
  pieces,
  salesPerson,
  onSubmit,
  sctId,
}: RevisionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadImage] = useUploadImageMutation();
  const [updateSCTRevision] = useUpdateSCTRevisionMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate()
  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      salesPerson,
      reason: "",
      files: [],
    },
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
      
      // If we have an SCT ID, update the revision
      if (sctId) {
        await updateSCTRevision({
          sct_id: sctId,
          data: {
            is_revision_completed: false,
            draft_note: values.reason,
            revision_type: "sales" // Default to sales revision type
          }
        }).unwrap();
      }
      
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
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-5">
            {/* Sales Person */}
            <FormField
              control={form.control}
              name="salesPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales person</FormLabel>
                  <FormControl>
                    <InputWrapper className="bg-muted/70 cursor-not-allowed">
                      <div className="flex items-center gap-2 px-3 py-2 w-full">
                        <img
                          src="/images/avatars/mike.jpg"
                          alt="Sales person"
                          className="size-6 rounded-full"
                        />
                        <span className="text-sm font-medium">{field.value}</span>
                      </div>
                    </InputWrapper>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <InputWrapper className="flex items-center justify-start h-12 border-dashed">
                    <div className="flex items-center gap-2 text-sm uderline text-primary">
                      {/* <Upload className="w-4 h-4" /> */}
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
                  </InputWrapper>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit revision"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};