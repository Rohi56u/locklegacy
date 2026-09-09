import { z } from 'zod';

export const SetupVaultSchema = z.object({
  wrappedDek: z.string(),
  dekIv: z.string(),
  passphraseSalt: z.string(),
  kdfIterations: z.number().int().min(100000).default(600000),
  recoveryWrappedDek: z.string().optional(),
  recoveryDekIv: z.string().optional(),
  recoverySalt: z.string().optional(),
});

export type SetupVaultDto = z.infer<typeof SetupVaultSchema>;
