import { query } from "../db";
import { Contact, IdentifyResponse } from "../types/contact";

export const identifyContact = async (
  email: string | null,
  phoneNumber: string | null
): Promise<IdentifyResponse> => {
  if (!email && !phoneNumber) {
    throw new Error("Either email or phoneNumber must be provided");
  }

  console.log(email, phoneNumber);

  // Finding all contacts matching the provided email or phone number.
  const queryParams: any[] = [];
  const conditions: string[] = [];
  if (email) {
    queryParams.push(email);
    conditions.push(`email = $${queryParams.length}`);
  }
  if (phoneNumber) {
    queryParams.push(phoneNumber);
    conditions.push(`phoneNumber = $${queryParams.length}`);
  }

  const initialMatchingContactsResult = await query(
    `SELECT 
     id,
     email,
     phoneNumber AS "phoneNumber",
     linkedId AS "linkedId",
     linkPrecedence AS "linkPrecedence",
     createdAt AS "createdAt",
     updatedAt AS "updatedAt",
     deletedAt AS "deletedAt"
   FROM Contact
   WHERE (${conditions.join(" OR ")}) AND deletedAt IS NULL
   ORDER BY createdAt ASC`,
    queryParams
  );
  let matchingContacts: Contact[] = initialMatchingContactsResult.rows; // Contacts found by initial email/phone match

  // Scenario 1: If no existing contacts found matching the request, them we will create a new primary contact with the provided details
  if (matchingContacts.length === 0) {
    const { rows: newPrimaryRows } = await query(
      `INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING 
       id,
       email,
       phoneNumber AS "phoneNumber",
       linkedId AS "linkedId",
       linkPrecedence AS "linkPrecedence",
       createdAt AS "createdAt",
       updatedAt AS "updatedAt",
       deletedAt AS "deletedAt"`,
      [email, phoneNumber, "primary"]
    );
    console.log(newPrimaryRows);
    const newPrimaryContact = newPrimaryRows[0] as Contact;
    return {
      contact: {
        primaryContactId: newPrimaryContact.id,
        emails: [newPrimaryContact.email].filter(Boolean) as string[],
        phoneNumbers: [newPrimaryContact.phoneNumber].filter(
          Boolean
        ) as string[],
        secondaryContactIds: [],
      },
    };
  }

  // Scenario 2: If existing contacts found

  // Step 2a: Identifying all unique primary contact ids from the initial matches
  const primaryContactIds = new Set<number>();
  matchingContacts.forEach((c) => {
    if (c.linkPrecedence === "primary") {
      primaryContactIds.add(c.id);
    } else if (c.linkedId) {
      primaryContactIds.add(c.linkedId);
    }
  });

  // Step 2b: Fetch all contacts related to these primary ids
  let allRelatedContacts: Contact[] = [];
  if (primaryContactIds.size > 0) {
    const { rows } = await query(
      `WITH RECURSIVE contact_family AS (
        SELECT * FROM Contact WHERE id = ANY($1::int[]) AND deletedAt IS NULL
        UNION ALL
        SELECT c.* FROM Contact c
        INNER JOIN contact_family cf ON c.linkedId = cf.id AND c.deletedAt IS NULL
      )
      SELECT 
    id,
    email,
    phoneNumber AS "phoneNumber",
    linkedId AS "linkedId",
    linkPrecedence AS "linkPrecedence",
    createdAt AS "createdAt",
    updatedAt AS "updatedAt",
    deletedAt AS "deletedAt"
  FROM contact_family
  ORDER BY createdAt ASC;`,
      [Array.from(primaryContactIds)]
    );
    allRelatedContacts = rows;
  } else {
    // If no primary ids were found from initial matches then we create a new primary contact and link the initially matched secondary contacts to it
    const { rows: newPrimaryRows } = await query(
      `INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING 
       id,
       email,
       phoneNumber AS "phoneNumber",
       linkedId AS "linkedId",
       linkPrecedence AS "linkPrecedence",
       createdAt AS "createdAt",
       updatedAt AS "updatedAt",
       deletedAt AS "deletedAt"`,
      [email, phoneNumber, "primary"]
    );
    const newPrimaryContact = newPrimaryRows[0] as Contact;
    for (const mc of matchingContacts) {
      // Linking existing matched contacts
      if (mc.id !== newPrimaryContact.id) {
        await query(
          "UPDATE Contact SET linkedId = $1, linkPrecedence = $2, updatedAt = NOW() WHERE id = $3",
          [newPrimaryContact.id, "secondary", mc.id]
        );
      }
    }
    allRelatedContacts = [
      newPrimaryContact,
      ...matchingContacts.map((mc) => ({
        ...mc,
        linkedId: newPrimaryContact.id,
        linkPrecedence: "secondary" as "secondary",
      })),
    ];
  }

  // Step 2c: findinf the oldest contact among all primary contacts found for the ultimate primary contact
  let ultimatePrimaryContact = allRelatedContacts
    .filter((c) => c.linkPrecedence === "primary")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

  // If no primary contact was identified the we create a new primary contact and make it the ultimate primary
  if (!ultimatePrimaryContact) {
    const { rows: newPrimaryRows } = await query(
      `INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING 
       id,
       email,
       phoneNumber AS "phoneNumber",
       linkedId AS "linkedId",
       linkPrecedence AS "linkPrecedence",
       createdAt AS "createdAt",
       updatedAt AS "updatedAt",
       deletedAt AS "deletedAt"`,
      [email, phoneNumber, "primary"]
    );
    ultimatePrimaryContact = newPrimaryRows[0] as Contact;
    for (const relatedContact of allRelatedContacts) {
      if (relatedContact.id !== ultimatePrimaryContact.id) {
        await query(
          "UPDATE Contact SET linkedId = $1, linkPrecedence = $2, updatedAt = NOW() WHERE id = $3",
          [ultimatePrimaryContact.id, "secondary", relatedContact.id]
        );
      }
    }
    allRelatedContacts.push(ultimatePrimaryContact);
  }

  // Step 2d: If multiple primary contacts were found and are now linked to the ultimatePrimaryContact,
  // we change them to 'secondary' and update their children to point to the ultimatePrimaryContact
  for (const contact of allRelatedContacts) {
    if (
      contact.linkPrecedence === "primary" &&
      contact.id !== ultimatePrimaryContact.id
    ) {
      await query(
        "UPDATE Contact SET linkedId = $1, linkPrecedence = $2, updatedAt = NOW() WHERE id = $3",
        [ultimatePrimaryContact.id, "secondary", contact.id]
      );
      contact.linkedId = ultimatePrimaryContact.id;
      contact.linkPrecedence = "secondary";

      await query(
        "UPDATE Contact SET linkedId = $1, updatedAt = NOW() WHERE linkedId = $2",
        [ultimatePrimaryContact.id, contact.id]
      );
    }
  }

  // Step 2e: we will re-fetch all contacts that are definitively part of the ultimate primary contact's group to get latest info
  const { rows: finalConsolidatedContactsRows } = await query(
    `SELECT 
     id,
     email,
     phoneNumber AS "phoneNumber",
     linkedId AS "linkedId",
     linkPrecedence AS "linkPrecedence",
     createdAt AS "createdAt",
     updatedAt AS "updatedAt",
     deletedAt AS "deletedAt"
   FROM Contact
   WHERE (id = $1 OR linkedId = $1)
     AND deletedAt IS NULL
   ORDER BY createdAt ASC`,
    [ultimatePrimaryContact.id]
  );
  const finalConsolidatedContactsMap = new Map<number, Contact>();
  finalConsolidatedContactsMap.set(
    ultimatePrimaryContact.id,
    ultimatePrimaryContact
  );
  finalConsolidatedContactsRows.forEach((c) =>
    finalConsolidatedContactsMap.set(c.id, c)
  );
  const finalConsolidatedContacts = Array.from(
    finalConsolidatedContactsMap.values()
  ).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Step 2f: Collect all unique emails and phone numbers from the consolidated set
  const allEmails = new Set<string>();
  const allPhoneNumbers = new Set<string>();
  finalConsolidatedContacts.forEach((c) => {
    if (c.email) allEmails.add(c.email);
    if (c.phoneNumber) allPhoneNumbers.add(c.phoneNumber);
  });
  // we need to also include the email/phone from the current request in these sets, as they might be new and not yet in the database
  if (email) allEmails.add(email);
  if (phoneNumber) allPhoneNumbers.add(phoneNumber);

  // Step 2g: Determining if a new secondary contact needs to be created
  let createNewSecondary = false;
  const currentRequestEmailExistsInGroup = email
    ? finalConsolidatedContacts.some((c) => c.email === email)
    : true;
  const currentRequestPhoneExistsInGroup = phoneNumber
    ? finalConsolidatedContacts.some((c) => c.phoneNumber === phoneNumber)
    : true;

  if (email && !currentRequestEmailExistsInGroup) {
    createNewSecondary = true;
  }
  if (phoneNumber && !currentRequestPhoneExistsInGroup) {
    createNewSecondary = true;
  }

  if (email && phoneNumber) {
    const pairExists = finalConsolidatedContacts.some(
      (c) => c.email === email && c.phoneNumber === phoneNumber
    );
    if (!pairExists) {
      createNewSecondary = true;
    }
  }

  if (createNewSecondary) {
    const { rows: newSecondaryRows } = await query(
      `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt) VALUES ($1, $2, $3, $4, NOW(), NOW()) 
      RETURNING 
       id,
       email,
       phoneNumber AS "phoneNumber",
       linkedId AS "linkedId",
       linkPrecedence AS "linkPrecedence",
       createdAt AS "createdAt",
       updatedAt AS "updatedAt",
       deletedAt AS "deletedAt"`,
      [email, phoneNumber, ultimatePrimaryContact.id, "secondary"]
    );
    const newSecondaryContact = newSecondaryRows[0] as Contact;
    finalConsolidatedContacts.push(newSecondaryContact);
    if (newSecondaryContact.email) allEmails.add(newSecondaryContact.email);
    if (newSecondaryContact.phoneNumber)
      allPhoneNumbers.add(newSecondaryContact.phoneNumber);
  }

  //Finally, preparing the response
  const emailsResponse = [
    ultimatePrimaryContact.email,
    ...Array.from(allEmails).filter(
      (e) => e !== ultimatePrimaryContact.email && e !== null
    ),
  ].filter(Boolean) as string[];

  const phoneNumbersResponse = [
    ultimatePrimaryContact.phoneNumber,
    ...Array.from(allPhoneNumbers).filter(
      (p) => p !== ultimatePrimaryContact.phoneNumber && p !== null
    ),
  ].filter(Boolean) as string[];

  const secondaryContactIds = finalConsolidatedContacts
    .filter((c) => c.id !== ultimatePrimaryContact.id) // excludeing the primary contact itself
    .map((c) => c.id)
    .sort((a, b) => a - b);

  return {
    contact: {
      primaryContactId: ultimatePrimaryContact.id,
      emails: [...new Set(emailsResponse)],
      phoneNumbers: [...new Set(phoneNumbersResponse)],
      secondaryContactIds: Array.from(new Set(secondaryContactIds)),
    },
  };
};
