import { Router, Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/contactService";
import { z } from "zod";

const router = Router();

const identifySchema = z
  .object({
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\d+$/).min(1).optional(), //ensures string only contains numbers
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "Either email or phoneNumber must be provided",
  });

type identifyInput = z.infer<typeof identifySchema>;

router.post(
  "/identify",
  async (req: Request, res: Response, next: NextFunction) => {
    const validationResult = identifySchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({ errors: validationResult.error.format() });
      return;
    }

    const { email, phoneNumber }: identifyInput = validationResult.data;

    try {
      const result = await identifyContact(email ?? null, phoneNumber ?? null);
      res.status(200).json(result);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }
);

export default router;
