import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
