import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import Popup from "@/components/ui/popup";
import { LoaderCircleIcon } from "lucide-react";
import { Department } from "../DepartmentCard";

// ✅ Schema for validation
const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().min(1, "Description is required"),
});

type DepartmentFormType = z.infer<typeof departmentSchema>;

interface DepartmentFormSheetProps {
  trigger: ReactNode;
  department?: Department; // optional edit data
  onSubmitSuccess?: () => void; // optional callback for parent refresh
}

const DepartmentFormSheet = ({ trigger, department, onSubmitSuccess }: DepartmentFormSheetProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<DepartmentFormType>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // 🟢 Prefill form when editing
  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        description: department.description,
      });
    }
  }, [department, form]);

  const isEditMode = !!department;

  async function onSubmit(values: DepartmentFormType) {
    try {
      setIsSubmitting(true);
      console.log(isEditMode ? "Updating department:" : "Creating department:", values);

      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000));

      setShowPopover(true);
      form.reset();
      setIsSheetOpen(false);
      if (onSubmitSuccess) onSubmitSuccess(); // trigger refresh if parent wants
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    form.reset();
    setIsSheetOpen(false);
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <SheetHeader className="mb-3 border-border pb-3.5 border-b">
                <SheetTitle>{isEditMode ? "Edit department" : "Add new department"}</SheetTitle>
              </SheetHeader>

              <SheetBody className="flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter department name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter department description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>
              </SheetBody>

              <SheetFooter className="py-3.5 px-5 border-border flex justify-end gap-3 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="justify-center"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Saving..."}
                    </span>
                  ) : (
                    isEditMode ? "Save changes" : "Save department"
                  )}
                </Button>

              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Popup
        isOpen={showPopover}
        title={isEditMode ? "Department updated successfully" : "Department added successfully"}
        description={
          isEditMode
            ? "You have successfully updated this department."
            : "You have added a new department successfully."
        }
      >
        <div className="flex flex-col items-center mt-4">
          <Button className="px-8" onClick={() => setShowPopover(false)}>
            Close
          </Button>
        </div>
      </Popup>
    </>
  );
};

export default DepartmentFormSheet;
