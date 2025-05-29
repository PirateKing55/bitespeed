import { Router, Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/contactService";
import { identifyInput, identifySchema } from "../schemas/identifySchema";

const router = Router();

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
