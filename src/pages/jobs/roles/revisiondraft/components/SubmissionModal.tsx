import { useRef, useState } from "react";
import { z } from "zod";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { InputWrapper } from "@/components/ui/input";
import { Upload, Plus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useUploadImageMutation } from "@/store/api/auth";
import { UploadedFileMeta } from "@/types/uploads";
import { toast } from "sonner";

const revisionSchema = z.object({
  revisionType: z.string().min(1, "Select revision type"),
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
  complete: z.boolean().default(false),
});

type RevisionData = z.infer<typeof revisionSchema>;

export const RevisionForm = ({
  onSubmit,
}: {
  onSubmit: (data: RevisionData) => void;
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadImage, { isLoading: isUploadingFiles }] = useUploadImageMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      revisionType: "",
      files: [],
      complete: false,
    },
  });

  const uploadSelectedFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const uploaded: UploadedFileMeta[] = [];

    for (const file of files) {
      try {
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
      } catch (error) {
        console.error("Failed to upload file:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);
    try {
      onSubmit(values);
    } catch (error) {
      console.error("Failed to submit revision:", error);
      toast.error("Failed to submit revision");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-10">
      <CardHeader className="border-b">
        <CardTitle>Revision</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => field.onChange(!field.value)}
                    >
                      <Checkbox checked={field.value} />
                      <span className="font-medium text-sm">
                        Revision complete
                      </span>
                    </div>
                  </div>
                </FormItem>
              )}
            />
            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" className="w-[127px]">
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
      </CardContent>
    </Card>
  );
};