"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lädt die Seite regelmäßig neu, solange die Zahlung noch bestätigt wird. */
export default function AutoRefresh({ seconds = 3, maxTries = 40 }: { seconds?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries > maxTries) return clearInterval(id);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, maxTries]);
  return null;
}
