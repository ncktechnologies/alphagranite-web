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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarInput } from '@/partials/common/avatar-input';
import Popup from "@/components/ui/popup";
import { LoaderCircleIcon } from "lucide-react";
import type { Employee } from "@/store/api/employee";
import { useCreateEmployeeMutation, useUpdateEmployeeMutation, useGetDepartmentsQuery, useGetRolesQuery } from "@/store/api";
import { toast } from "sonner";

// Schema for validation
const employeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").optional().or(z.string().length(0)),
  department: z.string().min(1, "Please select a department"),
  home_address: z.string().optional(),
  phone: z.string().optional().refine(
    (val) => !val || val.length === 0 || /^[\d\s\-\+\(\)]+$/.test(val),
    { message: 'Please enter a valid phone number' }
  ),
  gender: z.string().optional(),
  role_id: z.string().optional(),
});

type EmployeeFormType = z.infer<typeof employeeSchema>;

interface EmployeeFormSheetProps {
  trigger: ReactNode;
  employee?: Employee;
  mode?: 'create' | 'edit' | 'view';
  onSubmitSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EmployeeFormSheet = ({
  trigger,
  employee,
  mode = 'create',
  onSubmitSuccess,
  open: controlledOpen,
  onOpenChange
}: EmployeeFormSheetProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const isSheetOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsSheetOpen = onOpenChange || setInternalOpen;

  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();
  const { data: departmentsData, isLoading: departmentsLoading } = useGetDepartmentsQuery();
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();

  const isSubmitting = isCreating || isUpdating;
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';

  const form = useForm<EmployeeFormType>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      department: "",
      home_address: "",
      phone: "",
      gender: "",
      role_id: "",
    },
  });

  // Prefill form when editing or viewing - FIXED VERSION
  useEffect(() => {
    if (isSheetOpen && employee) {
      console.log('Employee data for form:', employee);
      console.log('Available departments:', departmentsData?.items);

      // Use employee.department (which contains the ID) instead of employee.department_id
      const resetData = {
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        department: employee.department ? String(employee.department) : "",
        home_address: employee.home_address || "",
        phone: employee.phone || "",
        gender: employee.gender || "",
        role_id: employee.role_id ? String(employee.role_id) : "",
      };

      console.log('Form reset data:', resetData);
      form.reset(resetData);
    } else if (isSheetOpen && !employee) {
      // Reset to empty for create mode
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        department: "",
        home_address: "",
        phone: "",
        gender: "",
        role_id: "",
      });
    }
  }, [employee, form, isSheetOpen, departmentsData]);

  // Debug current form values
  useEffect(() => {
    if (isSheetOpen) {
      const subscription = form.watch((value) => {
        console.log('Current form values:', value);
      });
      return () => subscription.unsubscribe();
    }
  }, [isSheetOpen, form]);

  async function onSubmit(values: EmployeeFormType) {
    if (isViewMode) return;

    try {
      // Build FormData with employee data
      const formData = new FormData();
      formData.append('first_name', values.first_name);
      formData.append('last_name', values.last_name);
      if (values.email) {
        formData.append('email', values.email);
      }
      formData.append('department', values.department);
      formData.append('home_address', values.home_address || '');
      formData.append('phone', values.phone || '');

      if (values.gender) {
        formData.append('gender', values.gender);
      }
      if (values.role_id) {
        formData.append('role_id', values.role_id);
      }
      if (profileImage) {
        formData.append('profile_image', profileImage);
      }

      if (isEditMode && employee) {
        await updateEmployee({
          id: employee.id,
          data: formData
        }).unwrap();
        toast.success("Employee updated successfully");
      } else {
        await createEmployee(formData).unwrap();
        toast.success("Employee created successfully");
      }

      setShowPopover(true);
      form.reset();
      setProfileImage(null);
      setIsSheetOpen(false);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error: any) {
      const errorMessage = error?.data?.detail || error?.data?.message ||
        `Failed to ${isEditMode ? 'update' : 'create'} employee`;
      toast.error(errorMessage);
    }
  }

  const handleCancel = () => {
    form.reset();
    setProfileImage(null);
    setIsSheetOpen(false);
  };

  const getTitle = () => {
    if (isViewMode) return "View employee";
    if (isEditMode) return "Edit employee";
    return "Add new employee";
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-[calc(100vh-2rem)] rounded-lg p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <SheetHeader className="mb-3 border-border pb-3.5 border-b">
                <SheetTitle>{getTitle()}</SheetTitle>
              </SheetHeader>

              <SheetBody className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-6">


                    {!isViewMode && (
                      <div className="space-y-2">
                        <FormLabel>Upload image</FormLabel>
                        <div className="flex items-center gap-4">
                          <AvatarInput onFileChange={(file) => setProfileImage(file)} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter first name"
                                {...field}
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter last name"
                                {...field}
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter email address"
                                {...field}
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isViewMode || departmentsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    departmentsLoading ? "Loading departments..." : "Select Department"
                                  }>
                                    {departmentsLoading ? "Loading..." : field.value ?
                                      departmentsData?.items?.find(dept => String(dept.id) === field.value)?.name :
                                      "Select Department"
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departmentsData?.items?.map((dept) => (
                                  <SelectItem key={dept.id} value={String(dept.id)}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                                {(!departmentsData?.items || departmentsData.items.length === 0) && !departmentsLoading && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                    No departments available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="home_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Home address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter home address"
                                {...field}
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your phone number"
                                {...field}
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      /> */}

                      <FormField
                        control={form.control}
                        name="role_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isViewMode || rolesLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    rolesLoading ? "Loading roles..." : "Select Role"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {rolesData?.data?.map((role) => (
                                  <SelectItem key={role.id} value={String(role.id)}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                                {(!rolesData?.data || rolesData.data.length === 0) && !rolesLoading && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                    No roles available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <ScrollBar orientation="vertical" />

                </ScrollArea>
              </SheetBody>

              <SheetFooter className="py-3.5 px-5 border-border flex justify-end gap-3 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting && !isViewMode}
                >
                  {isViewMode ? 'Close' : 'Cancel'}
                </Button>
                {!isViewMode && (
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
                      isEditMode ? "Save changes" : "Save employee"
                    )}
                  </Button>
                )}
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Popup
        isOpen={showPopover}
        title={isEditMode ? "Employee updated successfully" : "Employee added successfully"}
        description={
          isEditMode
            ? "You have successfully updated this employee."
            : "You have added a new employee successfully."
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

export default EmployeeFormSheet;