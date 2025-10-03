import { z } from 'zod';

export const getSigninSchema = () => {
  return z.object({
    username: z
      .string()
      // .email({ message: 'Please enter a valid email address.' })
      .min(1, { message: 'User name is required.' }),
    password: z.string().min(1, { message: 'Password is required.' }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
