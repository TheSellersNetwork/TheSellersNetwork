/*
  Copy for the Vinted label cropper page (/tools/vinted-label-cropper). Every
  fact about Vinted's carriers comes from Vinted's own UK Help Centre, or the
  carrier's own help page, linked from `source`. Checked 30 September 2026.
  Vinted changes carriers and label options, so check the linked pages when
  editing this. FAQ answers are plain text: the same words are shown on the
  page and sent in the FAQPage JSON-LD, which must match.
*/

export const VINTED_CHECKED = "30 September 2026";

export const vintedLabelPage = {
  path: "/tools/vinted-label-cropper",
  /* Under 60 characters, used as an absolute title so the site name is not added. */
  title: "Free Vinted label cropper: print Vinted labels on 4x6",
  description: "Crop a Vinted Evri or InPost label PDF or screenshot to a 4x6 thermal label, A6, or 2 or 4 to an A4 sheet. Free, and nothing leaves your device.",
  h1: "Vinted label cropper",
  intro:
    "Add the printable label PDF or a screenshot from your Vinted sale. The label is found and cropped out of the page, ready to print on a 4x6 inch thermal label, A6 or 100 x 150 mm, or 2 or 4 to an A4 sheet. Free, no sign-up, and your buyer's name and address never leave your device.",
};

export type Step = { title: string; detail: string };

export const vintedPrintSteps: Step[] = [
  {
    title: "Choose the printable label",
    detail: "In the conversation with the buyer, press Get shipping label. For Evri and InPost you can choose a printable label or a digital QR code; choose printable. Vinted says the label type cannot be changed later, so decide first. Save the PDF from the app or from the email Vinted sends.",
  },
  {
    title: "Add it here",
    detail: "Drop the PDF on the box above, choose it, or paste a screenshot. The label is found on the page and a crop box is drawn round it.",
  },
  {
    title: "Check the crop",
    detail: "Make sure the box covers the whole label: the barcode, the address and any code. Drag the box or its corners if anything is cut off.",
  },
  {
    title: "Pick your label size and download",
    detail: "4 x 6 inch for most thermal printers, or A6, 100 x 150 mm, or 2 or 4 to an A4 sheet of sticky labels. You get one PDF, or a zip with one PDF for each label.",
  },
  {
    title: "Print at actual size",
    detail: "Open the PDF, set the paper size to your label size in the print window and in the printer's own settings, and choose Actual size or 100%, not Fit to page.",
  },
  {
    title: "Check it before you stick it on",
    detail: "The barcode should be sharp and complete. Stick the label flat on the largest side of the parcel, and keep a copy of the label until the order is complete.",
  },
];

export type CarrierNote = { name: string; label: string; detail: string; source: { href: string; label: string }[] };

export const vintedCarriers: CarrierNote[] = [
  {
    name: "Evri",
    label: "Printable label or QR code",
    detail:
      "You can choose a printable label to print at home, or a digital label: a QR code that is used to print the label at the drop-off point. Vinted says most Evri parcelshops have a Print In Store device, but to check the drop-off point before you go. Send from an Evri parcelshop or locker.",
    source: [{ href: "https://www.vinted.co.uk/help/706", label: "Vinted: Evri shipping" }],
  },
  {
    name: "InPost",
    label: "Printable label or QR code",
    detail:
      "You can choose a printable label to print at home and attach, or a digital label: a QR code you scan at the locker, or show in an InPost shop where the staff print and stick on the label. Vinted lists InPost within mainland England, Scotland and Wales.",
    source: [{ href: "https://www.vinted.co.uk/help/953", label: "Vinted: InPost shipping" }],
  },
  {
    name: "Royal Mail",
    label: "QR code only, nothing to print",
    detail:
      "Vinted gives you a QR code in the app and by email. Scan it at the drop-off point or show it to the staff, who print the label. Use a Post Office, Collect+ parcel shop, locker or customer service point. Vinted says not to use a postbox: Royal Mail cannot register the collection and you get no tracking.",
    source: [{ href: "https://www.vinted.co.uk/help/528-royal-mail-standard-2nd-class-shipping", label: "Vinted: Royal Mail shipping" }],
  },
  {
    name: "DPD",
    label: "QR code only, nothing to print",
    detail: "You get a QR code. Show it to the staff at a DPD drop-off point and they print the label for the parcel.",
    source: [{ href: "https://www.vinted.co.uk/help/1101", label: "Vinted: DPD shipping" }],
  },
  {
    name: "Relay",
    label: "QR code only, nothing to print",
    detail: "You get a QR code in the app and by email. Show it to the staff at the Relay drop-off point and they print the label.",
    source: [{ href: "https://www.vinted.co.uk/help/1418", label: "Vinted: Relay shipping" }],
  },
  {
    name: "Yodel and InPost",
    label: "Follow the InPost option",
    detail:
      "Yodel is not on Vinted's current list of UK carriers. InPost bought Yodel in April 2025, and InPost says Yodel by InPost moved fully under the InPost brand from 17 July. If your sale shows InPost, the InPost notes above apply.",
    source: [
      { href: "https://www.vinted.co.uk/help/234-shipping-methods", label: "Vinted: shipping on Vinted" },
      { href: "https://inpost.co.uk/yodel-help", label: "InPost: Yodel help" },
    ],
  },
];

export type Faq = { question: string; answer: string };

export const vintedFaqs: Faq[] = [
  {
    question: "Can I print a Vinted label on a thermal printer?",
    answer:
      "Yes, when your sale gives you a printable label, which Evri and InPost do. If the label sits on a bigger page, crop it out first so it prints full size on your 4x6 label instead of shrunk down, then print at Actual size or 100%.",
  },
  {
    question: "Do I need a printer to send a Vinted parcel?",
    answer:
      "No. Royal Mail, DPD and Relay give you a QR code and the drop-off point prints the label. Evri and InPost let you choose a QR code instead of a printable label. You only need a printer if you choose a printable label.",
  },
  {
    question: "What size is a Vinted shipping label?",
    answer:
      "Vinted's help pages do not publish a label size, so check the file you download. Most thermal printers take 4 x 6 inch labels (101.6 x 152.4 mm). A6 is 105 x 148 mm. This tool scales the cropped label to fit whichever size you pick, keeping its shape.",
  },
  {
    question: "Why does my Vinted label print tiny, cut off or on two pages?",
    answer:
      "Usually the page in the file is a different size from your label, and the print window shrinks it to fit or spills it onto a second label. Crop the label to your label size here, set the same paper size in the print window, and print at Actual size or 100%.",
  },
  {
    question: "Can I crop a screenshot of my Vinted label?",
    answer:
      "Yes. PNG, JPEG and WebP pictures work, and you can paste a screenshot straight onto the page. A screenshot is only as sharp as your screen, so use the PDF when you have it. iPhone HEIC photos are not supported; take a screenshot instead.",
  },
  {
    question: "Can I crop several Vinted labels at once?",
    answer: "Yes. Add up to 200 pages in one go, from as many files as you like, and download them as one PDF or as a zip with a PDF for each label.",
  },
  {
    question: "Is my buyer's address safe?",
    answer:
      "The files are read and cropped in your browser and nothing is uploaded to us or anyone else. Your label size and margin choices are remembered in this browser only.",
  },
  {
    question: "Can I send a Vinted order with my own label?",
    answer:
      "No. Vinted says sending an order without a Vinted-generated label can get the order cancelled automatically and give you automatic negative feedback. Crop and print the label Vinted gives you for that order.",
  },
  {
    question: "Is this tool made by Vinted?",
    answer: "No. It is a free tool from The Sellers Network, a forum for UK resellers. It is not affiliated with or endorsed by Vinted.",
  },
];
