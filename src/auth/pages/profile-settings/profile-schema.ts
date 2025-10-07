import { z } from 'zod';

export const getCompleteProfileSchema = () => {
  return z.object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    department: z.string().min(1, { message: 'Please select a department.' }),
      gender: z.string().min(1, { message: 'Please select your gender.' }),
  });
};

export type CompleteProfileSchemaType = z.infer<ReturnType<typeof getCompleteProfileSchema>>;
