/*
  UK parcel size and weight limits, taken from the carriers' own pages.
  Checked 28 September 2026. Carriers change these, so the page always tells
  people to check the linked guide before buying postage. Sizes in cm,
  weights in kg. Prices are deliberately not stored: they change too often.
*/

export const PARCELS_CHECKED = "28 September 2026";

export type Carrier = "Royal Mail" | "Parcelforce" | "Evri";

export type Service = {
  id: string;
  carrier: Carrier;
  format: string;
  services: string;
  maxWeight: number;
  /* Box rule: the item's three sides, sorted, must each fit these, sorted. */
  box?: [number, number, number];
  /* Length and girth rule: longest side, and longest side plus girth. */
  lengthGirth?: { maxLength: number; maxTotal: number };
  note?: string;
  sizeUrl: string;
  priceUrl: string;
};

const RM_SIZES = "https://help.royalmail.com/personal/s/article/Size-and-weight-guide";
const RM_PRICES = "https://www.royalmail.com/current-postage-prices";
const EVRI_SIZES = "https://www.evri.com/send/parcel-size-and-weight-guide";
const EVRI_PRICES = "https://www.evri.com/our-services/our-prices";

export const services: Service[] = [
  {
    id: "rm-letter",
    carrier: "Royal Mail",
    format: "Letter",
    services: "1st Class, 2nd Class, Signed For",
    maxWeight: 0.1,
    box: [24, 16.5, 0.5],
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "rm-large-letter",
    carrier: "Royal Mail",
    format: "Large Letter",
    services: "1st Class, 2nd Class, Signed For",
    maxWeight: 0.75,
    box: [35.3, 25, 2.5],
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "rm-large-letter-tracked",
    carrier: "Royal Mail",
    format: "Large Letter (Tracked)",
    services: "Tracked 24, Tracked 48, bought online",
    maxWeight: 1,
    box: [35.3, 25, 2.5],
    note: "Tracked Large Letters bought online can weigh up to 1kg.",
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "rm-small-parcel",
    carrier: "Royal Mail",
    format: "Small Parcel",
    services: "1st Class, 2nd Class, Signed For, Tracked 24, Tracked 48",
    maxWeight: 2,
    box: [45, 35, 16],
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "rm-medium-parcel",
    carrier: "Royal Mail",
    format: "Medium Parcel",
    services: "1st Class, 2nd Class, Signed For, Tracked 24, Tracked 48",
    maxWeight: 20,
    box: [61, 46, 46],
    note: "Priced in weight bands up to 2kg, 10kg and 20kg.",
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "rm-special-delivery",
    carrier: "Royal Mail",
    format: "Special Delivery Guaranteed by 1pm",
    services: "Next working day by 1pm, with compensation cover",
    maxWeight: 20,
    box: [61, 46, 46],
    note: "The 9am version has a 2kg limit.",
    sizeUrl: RM_SIZES,
    priceUrl: RM_PRICES,
  },
  {
    id: "pf-express",
    carrier: "Parcelforce",
    format: "Parcel",
    services: "express24, expressAM, express10, express48",
    maxWeight: 30,
    lengthGirth: { maxLength: 150, maxTotal: 300 },
    note: "Parcelforce is part of Royal Mail. Buy at a Post Office or online.",
    sizeUrl: RM_SIZES,
    priceUrl: "https://www.parcelforce.com/",
  },
  {
    id: "pf-large",
    carrier: "Parcelforce",
    format: "Large Parcel",
    services: "express48large",
    maxWeight: 30,
    lengthGirth: { maxLength: 250, maxTotal: 400 },
    note: "Only at certain Post Office branches. Check before you go.",
    sizeUrl: RM_SIZES,
    priceUrl: "https://www.parcelforce.com/",
  },
  {
    id: "evri-postable",
    carrier: "Evri",
    format: "Postable",
    services: "Delivered through the letterbox",
    maxWeight: 1,
    box: [35, 23, 3],
    note: "Evri says postables should be between 1cm and 3cm deep.",
    sizeUrl: "https://www.evri.com/our-services/postable",
    priceUrl: EVRI_PRICES,
  },
  {
    id: "evri-small",
    carrier: "Evri",
    format: "Small Parcel",
    services: "Standard and Next Day",
    maxWeight: 2,
    box: [45, 35, 16],
    sizeUrl: "https://www.evri.com/our-services/small-parcel",
    priceUrl: EVRI_PRICES,
  },
  {
    id: "evri-parcel",
    carrier: "Evri",
    format: "Parcel",
    services: "Standard and Next Day, up to 15kg",
    maxWeight: 15,
    lengthGirth: { maxLength: 120, maxTotal: 245 },
    note: "Priced by weight: up to 1kg, 2kg, 5kg, 10kg and 15kg.",
    sizeUrl: EVRI_SIZES,
    priceUrl: EVRI_PRICES,
  },
];

/* Royal Mail tubes and rolls: length plus twice the diameter up to 104cm, longest side up to 90cm. */
export const TUBE_RULE = { maxLength: 90, maxLengthPlusTwoDiameters: 104, url: RM_SIZES };

export type Fit = { service: Service; fits: boolean; reason: string | null };

export function checkParcel(dims: [number, number, number], weight: number): Fit[] {
  const [a, b, c] = [...dims].sort((x, y) => y - x);
  return services.map((service) => {
    if (weight > service.maxWeight) return { service, fits: false, reason: `Too heavy. Up to ${formatKg(service.maxWeight)}.` };
    if (service.box) {
      const [x, y, z] = [...service.box].sort((p, q) => q - p);
      if (a > x || b > y || c > z) return { service, fits: false, reason: `Too big. Up to ${x} × ${y} × ${z} cm.` };
    }
    if (service.lengthGirth) {
      const total = a + 2 * (b + c);
      if (a > service.lengthGirth.maxLength) return { service, fits: false, reason: `Too long. Longest side up to ${service.lengthGirth.maxLength} cm.` };
      if (total > service.lengthGirth.maxTotal) {
        return { service, fits: false, reason: `Too big. Length plus girth is ${round(total)} cm, the limit is ${service.lengthGirth.maxTotal} cm.` };
      }
    }
    return { service, fits: true, reason: null };
  });
}

export function checkTube(length: number, diameter: number): { fits: boolean; reason: string | null } {
  if (length > TUBE_RULE.maxLength) return { fits: false, reason: `Too long. Up to ${TUBE_RULE.maxLength} cm.` };
  const total = length + 2 * diameter;
  if (total > TUBE_RULE.maxLengthPlusTwoDiameters) {
    return { fits: false, reason: `Length plus twice the diameter is ${round(total)} cm, the limit is ${TUBE_RULE.maxLengthPlusTwoDiameters} cm.` };
  }
  return { fits: true, reason: null };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatKg(kg: number): string {
  return kg < 1 ? `${Math.round(kg * 1000)}g` : `${kg}kg`;
}
