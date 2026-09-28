/* What the contact form can be about. Shared by the form, the action and the pages. */
export const contactKinds = ["general", "report", "data", "complaint", "appeal", "defamation", "copyright", "accessibility", "partnership"] as const;
export type ContactKind = (typeof contactKinds)[number];
