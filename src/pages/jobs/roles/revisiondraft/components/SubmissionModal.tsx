import { useState } from "react";
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

const revisionSchema = z.object({
  revisionType: z.string().min(1, "Select revision type"),
  files: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RevisionData>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      revisionType: "",
      files: [],
      complete: false,
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    form.setValue(
      "files",
      updatedFiles.map((f, i) => ({
        id: String(i),
        name: f.name,
        size: f.size,
      }))
    );
    form.setValue("complete", true);
  };

  const handleSubmit = async (values: RevisionData) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    onSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Card className="mt-10">
      {/* <h2 className="text-base font-semibold mb-5">Revision</h2> */}
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
                      {/* <Upload className="w-4 h-4" /> */}
                      <img src='/images/app/upload.svg' className="w-[27px] h-[21px]" />

                      Upload file
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </InputWrapper>
                </label>

                <Button
                  type="button"
                  variant="dashed"
                  className="flex flex-1 items-center gap-2 h-12"
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>


              {uploadedFiles.length > 0 && (
                <ul className="pt-2 space-y-1 text-sm text-muted-foreground">
                  {uploadedFiles.map((file, i) => (
                    <li key={i}>• {file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Revision Complete */}
            {/* <div className="flex items-center gap-2 pt-2">
              <AnimatePresence mode="wait">
                {form.watch("complete") ? (
                  <motion.div
                    key="complete"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Check2 className="w-4 h-4 text-green-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="incomplete"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-sm text-muted-foreground">
                Revision complete
              </span>
            </div> */}
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
                      onClick={() => field.onChange("complete")}
                    >
                      <Checkbox completed={field.value === "complete"} />
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
