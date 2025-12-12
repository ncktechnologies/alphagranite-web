import { useRef, useState } from "react";
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
import { Upload, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddFilesToDraftingMutation } from '@/store/api/job';
import { UploadedFileMeta } from "@/types/uploads";
import { toast } from "sonner";
import { z } from "zod";
import { Drafting } from '@/store/api/job';
import { useNavigate } from "react-router";

const revisionSchema = z.object({
  revisionType: z.string().min(1, "Select revision type"),
  complete: z.boolean().optional(), // Make this optional
});

type RevisionData = z.infer<typeof revisionSchema>;

export const RevisionForm = ({
  onSubmit,
  onClose,
  revisionReason: propRevisionReason,
  draftingData,
}: {
  onSubmit: (data: RevisionData & { files?: UploadedFileMeta[]; complete: boolean }) => void; // Specify complete as always boolean
  onClose: () => void;
  revisionReason?: string;
  draftingData?: Drafting; // Drafting data for file uploads
}) => {

  const revisionReason = propRevisionReason;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addFilesToDrafting, { isLoading: isUploadingFiles }] = useAddFilesToDraftingMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    mode: 'onChange',
    defaultValues: {
      revisionType: "",
    },
  });

  const uploadSelectedFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const uploaded: UploadedFileMeta[] = [];

    // Check if we have drafting data
    if (!draftingData?.id) {
      toast.error("Drafting data not available");
      return;
    }

    try {
      const response = await addFilesToDrafting({
        drafting_id: draftingData.id,
        files: files
      }).unwrap();

      console.log('File upload response:', response);

      // Process the response to get uploaded file metadata
      if (response?.data && Array.isArray(response.data)) {
        const newUploadedFiles = response.data.map((fileData: any) => ({
          id: fileData.id.toString(),
          name: fileData.name,
          size: fileData.size,
          filename: fileData.filename,
          url: fileData.url,
          type: fileData.type,
        }));
        
        setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
        toast.success("Files uploaded successfully");
      }
    } catch (error) {
      console.error("Failed to upload files:", error);
      toast.error("Failed to upload files");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      await uploadSelectedFiles(e.target.files);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFormSubmit = async (values: RevisionData) => {
  
    setIsSubmitting(true);
    
    try {
      const submissionData = {
        ...values,
        // Convert undefined complete to false for submission
        complete: values.complete || false,
        files: uploadedFiles
      };
      
      console.log('Submitting data:', submissionData);
      await onSubmit(submissionData);
      toast.success("Revision submitted successfully");
      navigate("/job/revision"); // Refresh the page to reflect changes
    } catch (error) {
      console.error("Failed to submit revision:", error);
     
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
            {/* Display revision reason */}
            {revisionReason && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h3 className="font-medium text-sm mb-1">Revision Reason:</h3>
                <p className="text-sm text-gray-600">{revisionReason}</p>
              </div>
            )}
            
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
            {/* Upload Revision */}
            <div className="space-y-2 max-w-[500px]">
              <FormLabel>Upload revision</FormLabel>
              <div className="flex items-center gap-6">
                <label className="flex-1 cursor-pointer">
                  <InputWrapper className="flex items-center justify-start h-12 border-dashed">
                    <div className="flex items-center gap-2 text-sm uderline text-primary">
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

              {isUploadingFiles && (
                <p className="text-xs text-muted-foreground pt-1">Uploading files...</p>
              )}

              {uploadedFiles.length > 0 && (
                <ul className="pt-2 space-y-1 text-sm text-muted-foreground">
                  {uploadedFiles.map((file, i) => (
                    <li key={i}>• {file.name}</li>
                  ))}
                </ul>
              )}
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
                      />
                      <span 
                        className="font-medium text-sm cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          field.onChange(!field.value);
                        }}
                      >
                        Revision complete
                      </span>
                    </div>
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
                disabled={isSubmitting || !form.formState.isValid}
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