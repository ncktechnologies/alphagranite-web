import { z } from 'zod';

// Schema for requesting a password reset with email/username
export const getResetRequestSchema = () => {
  return z.object({
    email: z
      .string()
      .min(1, { message: 'Username is required.' }),
  });
};

// Schema for setting a new password
export const getNewPasswordSchema = () => {
  return z
    .object({
      currentPassword: z
        .string()
        .min(1, { message: 'Current password is required.' }),
      password: z
        .string()
        .min(8, { message: 'Password must be at least 8 characters.' })
        .regex(/[A-Z]/, {
          message: 'Password must contain at least one uppercase letter.',
        })
        .regex(/[0-9]/, {
          message: 'Password must contain at least one number.',
        }),
      confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password.' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
};

export type ResetRequestSchemaType = z.infer<
  ReturnType<typeof getResetRequestSchema>
>;
export type NewPasswordSchemaType = z.infer<
  ReturnType<typeof getNewPasswordSchema>
>;