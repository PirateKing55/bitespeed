import { z } from "zod";

export const identifySchema = z
  .object({
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\d+$/).min(1).optional(), //ensures string only contains numbers
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "Either email or phoneNumber must be provided",
  });

export type identifyInput = z.infer<typeof identifySchema>;
