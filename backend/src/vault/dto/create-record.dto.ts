import { z } from 'zod';

export const CreateRecordSchema = z.object({
  category: z.enum(['BANK', 'CRYPTO', 'INSURANCE', 'INVESTMENT', 'DIGITAL_LEGACY', 'LEGAL', 'PROPERTY', 'PERSONAL']),
  encryptedPayload: z.string(),
  payloadIv: z.string(),
  maskedPreview: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type CreateRecordDto = z.infer<typeof CreateRecordSchema>;
