import { z } from 'zod';

export const getCompleteProfileSchema = () => {
  return z.object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    department: z.string().min(1, { message: 'Please select a department.' }),
    address: z.string().min(1, { message: 'Address is required.' }),
    phone: z
      .string()
      .min(10, { message: 'Phone number must be at least 10 digits.' })
      .max(15, { message: 'Phone number must be less than 15 digits.' }),
    gender: z.string().min(1, { message: 'Please select your gender.' }),
  });
};

export type CompleteProfileSchemaType = z.infer<ReturnType<typeof getCompleteProfileSchema>>;
