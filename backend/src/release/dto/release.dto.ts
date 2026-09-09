import { z } from 'zod';

export const ApproveReleaseSchema = z.object({
  scope: z.string().default('ASSET_METADATA_AND_CLAIM_CHECKLIST'),
  notes: z.string().optional(),
});

export type ApproveReleaseDto = z.infer<typeof ApproveReleaseSchema>;

export const ExecuteReleaseSchema = z.object({
  scope: z.string().default('ASSET_METADATA_AND_CLAIM_CHECKLIST'),
  watermarkId: z.string().optional(),
  downloadLimit: z.number().int().min(1).max(10).default(3),
  expiryHours: z.number().int().min(1).max(72).default(48),
});

export type ExecuteReleaseDto = z.infer<typeof ExecuteReleaseSchema>;
