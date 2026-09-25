"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/* Dark mode from day one. The class strategy matches the shadcn dark variant. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
