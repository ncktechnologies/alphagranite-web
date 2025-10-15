import { z } from 'zod';

export const getCompleteProfileSchema = () => {
  return z.object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    department: z.string().min(1, { message: 'Please select a department.' }),
    gender: z.string().min(1, { message: 'Please select your gender.' }),
    phone: z
      .string()
      .optional()
      .refine((val) => !val ||/^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/.test(val), {
        message: 'Please enter a valid phone number.',
      }),  
  }
  );
};

export type CompleteProfileSchemaType = z.infer<ReturnType<typeof getCompleteProfileSchema>>;
