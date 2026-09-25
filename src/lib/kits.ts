export const kitKinds = [
  { id: "printer", label: "Label printer" },
  { id: "scales", label: "Scales" },
  { id: "packaging", label: "Packaging" },
  { id: "shipping", label: "Postage and couriers" },
  { id: "storage", label: "Storage" },
  { id: "camera", label: "Photos" },
  { id: "software", label: "Software" },
  { id: "other", label: "Other" },
] as const;

export type KitKind = (typeof kitKinds)[number]["id"];
