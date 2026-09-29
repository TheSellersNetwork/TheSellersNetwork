"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Opens the browser's print dialog, where "Save as PDF" is one of the printers. Hidden in the printout itself. */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-8 print:hidden" onClick={() => window.print()} data-testid="print-button">
      <Printer data-icon="inline-start" aria-hidden="true" />
      Print or save as PDF
    </Button>
  );
}
