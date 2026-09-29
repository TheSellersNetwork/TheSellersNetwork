/*
  Label size helper. The printer settings are general printing advice that
  holds for any PDF label. Platform notes only say what the platform's own
  help page says (checked on the date below); where a page could not be read
  or does not cover printing, we say what to look for instead.
*/

export const LABELS_CHECKED = "30 September 2026";

export type PrinterId = "thermal" | "a6" | "a4-two" | "a4-single";
export type LabelPlatformId = "click-drop" | "ebay" | "vinted" | "amazon" | "evri" | "inpost";

export type Printer = { id: PrinterId; label: string; paper: string; settings: { name: string; value: string }[]; watch: string };

export const printers: Printer[] = [
  {
    id: "thermal",
    label: "Thermal label printer, 4x6 in (100x150mm)",
    paper: "100 x 150mm (4 x 6in) labels",
    settings: [
      { name: "Label or paper size", value: "4 x 6in or 100 x 150mm, set in the printer's own settings as well as in the print window" },
      { name: "Scaling", value: "Actual size, or 100%. Not fit to page" },
      { name: "Orientation", value: "Portrait" },
      { name: "Label format on the platform", value: "The 4x6 or thermal option, where there is one" },
    ],
    watch: "If the platform only gives you a whole A4 page, printing it on a 4x6 label either cuts it off or shrinks it until the barcode may not scan. Look for a 4x6 or thermal option first.",
  },
  {
    id: "a6",
    label: "A6 labels (105x148mm)",
    paper: "A6 labels, 105 x 148mm",
    settings: [
      { name: "Label or paper size", value: "A6, set in the printer's settings and in the print window" },
      { name: "Scaling", value: "Actual size, or 100%" },
      { name: "Orientation", value: "Portrait" },
      { name: "Label format on the platform", value: "The 4x6 or thermal option, where there is one. A6 is a few millimetres different from 4x6, so check the edges print before you do a batch" },
    ],
    watch: "Print one test label on plain paper first and hold it against a blank label to check nothing is cut off.",
  },
  {
    id: "a4-two",
    label: "A4 sheets with 2 labels",
    paper: "A4 sheets of 2 half-page sticky labels",
    settings: [
      { name: "Paper size", value: "A4" },
      { name: "Scaling", value: "Actual size, or 100%. Not fit to page" },
      { name: "Orientation", value: "Portrait, unless the platform's label is on its side" },
      { name: "Label format on the platform", value: "A 2-per-page or half-page A4 option, where there is one" },
    ],
    watch: "Check where the label sits on the page in the print preview. It needs to line up with one of the two labels on the sheet, or it will print across both.",
  },
  {
    id: "a4-single",
    label: "Plain A4 paper, one label",
    paper: "Plain A4 paper, cut out and taped on",
    settings: [
      { name: "Paper size", value: "A4" },
      { name: "Scaling", value: "Actual size, or 100%" },
      { name: "Orientation", value: "Portrait" },
      { name: "Label format on the platform", value: "The standard A4 option" },
    ],
    watch: "Cut close to the edge and attach it flat, so the barcode is not creased, folded round a corner or covered.",
  },
];

export type LabelPlatform = { id: LabelPlatformId; name: string; help: { title: string; href: string }; says: string[]; lookFor: string; verified: boolean };

export const labelPlatforms: LabelPlatform[] = [
  {
    id: "click-drop",
    name: "Royal Mail Click & Drop",
    help: { title: "Click & Drop help: choosing your label format", href: "https://help.parcel.royalmail.com/hc/en-gb/articles/115004866953-Choosing-your-label-format" },
    says: [],
    lookFor: "We could not read Royal Mail's help page when we checked, so we do not quote it. In Click & Drop, look in the settings for the label format or print templates and choose the size that matches your labels before you print.",
    verified: false,
  },
  {
    id: "ebay",
    name: "eBay",
    help: { title: "eBay: buying and printing postage labels", href: "https://www.ebay.co.uk/help/selling/posting-items/labels-packaging-tips/buying-printing-postage-labels?id=4157" },
    says: ["You can print several labels together with eBay's bulk label tool.", "You can choose to fit your labels on a single sheet of A4 paper to save on printing."],
    lookFor: "eBay's help page does not list label sizes. When you print a label, look for a printer or label format setting and choose the size that matches your labels.",
    verified: true,
  },
  {
    id: "vinted",
    name: "Vinted",
    help: { title: "Vinted: shipping label not received or not working", href: "https://www.vinted.co.uk/help/154-shipping-label-not-received" },
    says: ["Your Vinted inbox tells you how to send each order, including whether the label is digital or needs printing.", "If you cannot print at home, see if you can get the label at the drop-off point."],
    lookFor: "Vinted's help does not give a label size. Open the label from the order and check its page size in the print window; if it is a whole page, print at actual size on A4.",
    verified: true,
  },
  {
    id: "amazon",
    name: "Amazon Buy Shipping",
    help: { title: "Amazon Seller Central (sign in, then search help for Buy Shipping)", href: "https://sellercentral.amazon.co.uk/" },
    says: [],
    lookFor: "Amazon's help is behind the Seller Central sign-in, so we could not check it. When you buy a label, look for the label format or print settings on the confirmation page and choose the size that matches your labels.",
    verified: false,
  },
  {
    id: "evri",
    name: "Evri",
    help: { title: "Evri: can I use a thermal printer to print my label?", href: "https://international.evri.com/help-centre/parcels/question/documentation/can-i-use-a-thermal-printer-to-print-my-label" },
    says: ["Evri provides both A4 labels and thermal printer sized (4x6) labels.", "You download the label from your account or from the link Evri gives you."],
    lookFor: "Look for the label or printer setting in your Evri account and choose the thermal size if you use a 4x6 printer.",
    verified: true,
  },
  {
    id: "inpost",
    name: "InPost",
    help: { title: "InPost: how to send a parcel", href: "https://inpost.co.uk/how-to-send-a-parcel" },
    says: ["A digital label bought from the InPost app or website is a QR code and does not need printing.", "If you have an InPost barcode label, print it and attach it securely. InPost lockers do not have printers."],
    lookFor: "InPost's help page does not give a printed label size. Open the label and check its page size in the print window before you choose paper.",
    verified: true,
  },
];

export function labelAdvice(printerId: PrinterId, platformId: LabelPlatformId) {
  const printer = printers.find((p) => p.id === printerId) ?? printers[0];
  const platform = labelPlatforms.find((p) => p.id === platformId) ?? labelPlatforms[0];
  return { printer, platform };
}
