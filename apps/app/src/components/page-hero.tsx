import { motion } from "motion/react";
import { asset } from "#/lib/asset";

export function PageHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 pt-16 pb-12 text-center sm:px-6"
    >
      <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="h-24 w-auto" />
      <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">{title}</h1>
      <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold tracking-widest text-primary uppercase">
        {subtitle}
      </span>
    </motion.section>
  );
}
