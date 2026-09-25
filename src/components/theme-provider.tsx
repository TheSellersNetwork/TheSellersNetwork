"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/* Dark mode from day one. The class strategy matches the shadcn dark variant. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="tsn-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
