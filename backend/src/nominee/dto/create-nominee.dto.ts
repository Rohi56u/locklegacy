import { z } from 'zod';

export const CreateNomineeSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  role: z.enum(['NOMINEE', 'EXECUTOR', 'PROFESSIONAL_REVIEWER']),
});

export type CreateNomineeDto = z.infer<typeof CreateNomineeSchema>;
