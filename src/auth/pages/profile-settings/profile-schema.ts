import { z } from 'zod';

export const getCompleteProfileSchema = () => {
  return z.object({
    first_name: z.string().min(1, { message: 'First name is required.' }),
    last_name: z.string().min(1, { message: 'Last name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    department: z.string().min(1, { message: 'Please select a department.' }),
    home_address: z.string().min(1, { message: 'Please enter employees home address.' }),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || val.length === 0 || /^[\d\s\-\+\(\)]+$/.test(val), {
        message: 'Please enter a valid phone number.',
      }),  
  }
  );
};

export type CompleteProfileSchemaType = z.infer<ReturnType<typeof getCompleteProfileSchema>>;
