import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { InputWrapper } from "@/components/ui/input";
import { Upload, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddFilesToDraftingMutation } from '@/store/api/job';
import { UploadedFileMeta } from "@/types/uploads";
import { toast } from "sonner";
import { z } from "zod";
import { Drafting } from '@/store/api/job';
import { useNavigate } from "react-router";
import { TimeTrackingComponent } from './TimeTrackingComponent'; // Add this import

const revisionSchema = z.object({
  complete: z.boolean(),
});

type RevisionData = z.infer<typeof revisionSchema>;

// Local File Upload Component for Revisions
const RevisionFileUpload = ({
  draftingId,
  onUploadSuccess,
  onFileRemove,
  existingFiles = [],
  disabled = false
}: {
  draftingId?: number;
  onUploadSuccess: (files: UploadedFileMeta[]) => void;
  onFileRemove: (fileId: string) => void;
  existingFiles?: UploadedFileMeta[];
  disabled?: boolean;
}) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadSuccess, setLastUploadSuccess] = useState(false);
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLastUploadSuccess(false); // Reset success state on new selection
      const newFiles = Array.from(e.target.files);
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!draftingId || pendingFiles.length === 0) {
      toast.error("Drafting ID is required or no files to upload");
      return;
    }

    setIsUploading(true);
    try {
      const response = await addFilesToDrafting({
        drafting_id: draftingId,
        files: pendingFiles
      }).unwrap();

      console.log('File upload response:', response);

      // Handle the response based on your API structure
      const filesArray = response.data?.files || [];

      if (filesArray.length > 0) {
        const newUploadedFiles = filesArray.map((fileData: any) => ({
          id: fileData.id.toString(),
          name: fileData.filename,
          size: fileData.size,
          filename: fileData.filename,
          url: fileData.file_url,
          type: fileData.mime_type,
        }));

        setPendingFiles([]); // Clear pending files immediately
        setLastUploadSuccess(true);
        onUploadSuccess(newUploadedFiles);

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Reset success state after 3 seconds
        setTimeout(() => setLastUploadSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to upload files:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Select Files
        </Button>
        {pendingFiles.length > 0 && (
          <Button
            type="button"
            onClick={uploadFiles}
            disabled={isUploading || !draftingId || lastUploadSuccess}
            className={`${lastUploadSuccess ? 'bg-blue-600' : 'bg-green-600 hover:bg-green-700'} text-white transition-colors`}
          >
            {isUploading ? 'Uploading...' : lastUploadSuccess ? 'Files Uploaded' : `Upload ${pendingFiles.length} file(s)`}
          </Button>
        )}
      </div>

      {/* Pending files list */}
      {pendingFiles.length > 0 && (
        <div className="border rounded-lg p-3">
          <h4 className="font-medium mb-2">Pending Uploads ({pendingFiles.length})</h4>
          <ul className="space-y-2">
            {pendingFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm truncate max-w-xs">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePendingFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing files list */}
      {existingFiles.length > 0 && (
        <div className="border rounded-lg p-3">
          <h4 className="font-medium mb-2">Uploaded Files ({existingFiles.length})</h4>
          <ul className="space-y-2">
            {existingFiles.map((file) => (
              <li key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm truncate max-w-xs">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div >
  );
};
export const RevisionForm = ({
  onSubmit,
  onClose,
  revisionReason: propRevisionReason,
  draftingData,
  isRevision = false, // Add revision flag
  originalDraftingId, // Add original drafting ID
  totalTime = 0, // Add time tracking props
  isDrafting = false,
  isPaused = false,
  hasEnded = false,
  onTimeUpdate,
  onStart,
  onPause,
  onResume,
  onEnd,
}: {
  onSubmit: (data: RevisionData & { files?: UploadedFileMeta[]; complete: boolean }) => void;
  onClose: () => void;
  revisionReason?: string;
  draftingData?: Drafting;
  isRevision?: boolean; // Revision flag
  originalDraftingId?: number; // Original drafting ID
  // Time tracking props
  totalTime?: number;
  isDrafting?: boolean;
  isPaused?: boolean;
  hasEnded?: boolean;
  onTimeUpdate?: (time: number) => void;
  onStart?: (startDate: Date, is_revision?: boolean, original_drafting_id?: number) => void | Promise<void>;
  onPause?: (data?: { note?: string }) => void | Promise<void>;
  onResume?: (data?: { note?: string }) => void | Promise<void>;
  onEnd?: (endDate: Date) => void | Promise<void>;
}) => {

  const revisionReason = propRevisionReason;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevisionComplete, setIsRevisionComplete] = useState(false);
  const [addFilesToDrafting, { isLoading: isUploadingFiles }] = useAddFilesToDraftingMutation();
  const navigate = useNavigate();

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    mode: 'onChange',
    defaultValues: {
      complete: false,
    },
  });

  // Watch the complete field to update state
  const completeValue = form.watch('complete');

  useEffect(() => {
    setIsRevisionComplete(completeValue);
  }, [completeValue]);

  // Function to handle file uploads using the local component
  const handleFileUploadSuccess = (newFiles: UploadedFileMeta[]) => {
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) uploaded successfully`);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleFormSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);

    try {
      // If the revision is complete, end the session first
      if (values.complete && onEnd) {
        await onEnd(new Date()); // End the current session
      }

      const submissionData = {
        ...values,
        files: uploadedFiles
      };

      console.log('Submitting data:', submissionData);
      await onSubmit(submissionData);
    } catch (error) {
      console.error("Failed to submit revision:", error);
      // Error is already handled/toasted in onSubmit (details.tsx)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card className="mt-10">
          <CardHeader className="border-b">
            <CardTitle>Revision</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Time Tracking Component - Add this section */}
            {isRevision && (
              <div className="mb-6">
                <TimeTrackingComponent
                  isDrafting={isDrafting || false}
                  isPaused={isPaused || false}
                  totalTime={totalTime}
                  isRevision={true}
                  originalDraftingId={originalDraftingId}
                  onStart={onStart || (() => { })}
                  onPause={onPause || (() => { })}
                  onResume={onResume || (() => { })}
                  onEnd={onEnd || (() => { })}
                  onTimeUpdate={onTimeUpdate || (() => { })}
                  hasEnded={hasEnded || false}
                  pendingFilesCount={0}
                  uploadedFilesCount={uploadedFiles.length}
                />
              </div>
            )}

            {/* Display revision reason */}
            {revisionReason && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h3 className="font-medium text-sm mb-1">Revision Reason:</h3>
                <p className="text-sm text-gray-600">{revisionReason}</p>
              </div>
            )}

            {/* File Upload Section - Using local RevisionFileUpload component */}
            <div className="mb-6">
              <FormLabel className="block mb-2 font-medium">Upload revision files</FormLabel>
              <RevisionFileUpload
                draftingId={draftingData?.id} // Pass the drafting ID to link files
                onUploadSuccess={handleFileUploadSuccess}
                onFileRemove={handleFileRemove}
                existingFiles={uploadedFiles}
                disabled={!draftingData?.id} // Disable if no drafting ID
              />
            </div>

            <FormField
              control={form.control}
              name="complete"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block mb-2 font-medium">
                    Status
                  </FormLabel>
                  <div className="">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={uploadedFiles.length === 0} // Disable until files are uploaded
                      />
                      <span
                        className={`font-medium text-sm cursor-pointer ${uploadedFiles.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}
                        onClick={(e) => {
                          if (uploadedFiles.length > 0) {
                            e.preventDefault();
                            field.onChange(!field.value);
                          }
                        }}
                      >
                        Revision complete
                      </span>
                    </div>
                    {uploadedFiles.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Upload files before marking as complete
                      </p>
                    )}
                  </div>
                </FormItem>
              )}
            />
            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-[127px]"
                onClick={() => {
                  form.reset();
                  setUploadedFiles([]);
                  onClose();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid || uploadedFiles.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Submitting..." : "Submit revision"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};