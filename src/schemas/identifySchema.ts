import { z } from "zod";

/**
 * @swagger
 * components:
 *   schemas:
 *     IdentifyInput:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the contact.
 *         phoneNumber:
 *           type: string
 *           pattern: "^\\d+$"
 *           description: Phone number of the contact (digits only).
 *       example:
 *         email: "example@example.com"
 *         phoneNumber: "1234567890"
 */

export const identifySchema = z
  .object({
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\d+$/).min(1).optional(), //ensures string only contains numbers
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "Either email or phoneNumber must be provided",
  });

export type identifyInput = z.infer<typeof identifySchema>;
