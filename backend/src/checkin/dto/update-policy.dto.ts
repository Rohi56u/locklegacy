import { z } from 'zod';

export const UpdatePolicySchema = z.object({
  frequencyDays: z.number().int().refine(v => [30, 60, 90].includes(v)),
  gracePeriodDays: z.number().int().refine(v => [7, 14, 30].includes(v)),
  notificationChannels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  escalationEnabled: z.boolean(),
});

export type UpdatePolicyDto = z.infer<typeof UpdatePolicySchema>;
