import { Router, Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/contactService";
import { identifyInput, identifySchema } from "../schemas/identifySchema";

const router = Router();

/**
 * @swagger
 * /api/identify:
 *   post:
 *     summary: Identify or consolidate contact information.
 *     description: |
 *       This endpoint processes incoming contact information (email and/or phone number).
 *       It identifies if the contact already exists or creates a new one.
 *       If existing contacts are found to be related (e.g., same email with different phone or vice-versa),
 *       they are consolidated by linking them to a "primary" contact.
 *       The response includes the primary contact's ID, all associated emails and phone numbers (with the primary's listed first),
 *       and a list of secondary contact IDs that were consolidated.
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IdentifyInput'
 *           examples:
 *             example1:
 *               summary: Example 1 - Lorraine (New contact)
 *               value:
 *                 email: "lorraine@hillvalley.edu"
 *                 phoneNumber: "123456"
 *             example2:
 *               summary: Example 2 - McFly (New contact, links to Lorraine via phone)
 *               value:
 *                 email: "mcfly@hillvalley.edu"
 *                 phoneNumber: "123456"
 *             example3:
 *               summary: Example 3 - George (New contact)
 *               value:
 *                 email: "george@hillvalley.edu"
 *                 phoneNumber: "919191"
 *             example4:
 *               summary: Example 4 - Biff (New contact)
 *               value:
 *                 email: "biffsucks@hillvalley.edu"
 *                 phoneNumber: "717171"
 *             example5:
 *               summary: Example 5 - George (Existing, links to Biff via phone)
 *               value:
 *                 email: "george@hillvalley.edu"
 *                 phoneNumber: "717171"
 *     responses:
 *       200:
 *         description: Successful identification or consolidation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contact:
 *                   type: object
 *                   properties:
 *                     primaryContactId:
 *                       type: integer
 *                       description: The ID of the primary contact.
 *                     emails:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: email
 *                       description: All unique emails associated with the contact, with the primary email listed first, followed by other emails in chronological order.
 *                     phoneNumbers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: All unique phone numbers associated with the contact, with the primary phone number listed first, followed by other numbers in chronological order.
 *                     secondaryContactIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: An array of IDs of contacts that were consolidated into this primary contact. These are ordered chronologically.
 *       400:
 *         description: Invalid request body (e.g., missing email and phoneNumber, or invalid format).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   description: Details of the validation errors.
 *       500:
 *         description: Internal server error.
 */

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
