import { z } from 'zod';

export const CreateClaimSchema = z.object({
  escalationCaseId: z.string().uuid(),
  claimantId: z.string().uuid(),
});

export type CreateClaimDto = z.infer<typeof CreateClaimSchema>;

export const SubmitEvidenceSchema = z.object({
  deceasedName: z.string().min(1),
  dateOfDeath: z.string(),
  certificateNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  notes: z.string().optional(),
});

export type SubmitEvidenceDto = z.infer<typeof SubmitEvidenceSchema>;

export const ReviewClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
  reviewerNotes: z.string().optional(),
});

export type ReviewClaimDto = z.infer<typeof ReviewClaimSchema>;
