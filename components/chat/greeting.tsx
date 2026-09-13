"use client";

import { motion } from "framer-motion";
import { useHydrated } from "@/hooks/use-hydrated";
import { greetingText } from "@/lib/greeting";

/**
 * "Good evening, Ayan" on the empty chat screen. The time of day comes from
 * the student's own clock, so the words are filled in once the page runs in
 * the browser. The fade-in hides that moment.
 */
export function Greeting({ name }: { name: string }) {
  const hydrated = useHydrated();

  return (
    <motion.h1
      animate={{ opacity: 1, y: 0 }}
      className="min-h-8 px-4 text-center font-semibold text-2xl text-foreground tracking-tight md:min-h-9 md:text-3xl"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {hydrated ? greetingText(new Date().getHours(), name) : null}
    </motion.h1>
  );
}
