import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import type { GalleryImage } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog.tsx"
import { SectionHeading, imageSrc } from "./shared"

// Masonry gallery with album filters and a keyboard-friendly lightbox.

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
}

export function GallerySection({ images }: { images: Array<GalleryImage> }) {
  const albums = useMemo(() => [...new Set(images.map((i) => i.album).filter((a): a is string => !!a))], [images])
  const [album, setAlbum] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const visible = images.filter((i) => !album || i.album === album)

  const step = useCallback(
    (dir: 1 | -1) => setOpenIndex((i) => (i === null ? i : (i + dir + visible.length) % visible.length)),
    [visible.length],
  )
  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openIndex, step])

  const current = openIndex === null ? null : visible[openIndex]

  return (
    <section id="gallery" className="scroll-mt-28 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Memories" title="Gallery" lead="Reunions, homecomings, projects and the moments that make KNH home.">
          {albums.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Albums">
              {[null, ...albums].map((a) => (
                <button
                  key={a ?? "all"}
                  type="button"
                  aria-pressed={album === a}
                  onClick={() => setAlbum(a)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-medium transition",
                    album === a ? "border-foreground bg-foreground text-white" : "border-black/10 bg-white hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {a ?? "All"}
                </button>
              ))}
            </div>
          )}
        </SectionHeading>

        {images.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/60",
                  i === 1 ? "aspect-[3/4]" : "aspect-square",
                )}
              >
                {i === 1 && (
                  <div className="px-6 text-center">
                    <Images className="mx-auto size-8 text-primary" />
                    <p className="mt-3 font-bold text-foreground">Photos coming soon</p>
                    <p className="mt-1 text-sm text-muted-foreground">Memories from reunions and projects will appear here.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <motion.div layout className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
            <AnimatePresence mode="popLayout">
              {visible.map((img, i) => (
                <motion.button
                  key={img.id}
                  layout
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => setOpenIndex(i)}
                  className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-secondary focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none"
                  aria-label={img.caption ?? "Open photo"}
                >
                  <img
                    src={imageSrc(img.image_url)}
                    alt={img.caption ?? ""}
                    loading="lazy"
                    className="w-full transition-transform duration-700 group-hover:scale-105"
                  />
                  {(img.caption || img.album) && (
                    <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 to-transparent p-4 text-left text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {img.caption ?? img.album}
                    </span>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Dialog open={current != null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-5xl border-0 bg-black p-0 text-white sm:max-w-5xl [&>button]:hidden">
          {current && (
            <div className="relative">
              <DialogTitle className="sr-only">{current.caption ?? "Photo"}</DialogTitle>
              <img src={imageSrc(current.image_url)} alt={current.caption ?? ""} className="max-h-[80vh] w-full object-contain" />
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70"
              >
                <X className="size-5" />
              </button>
              {visible.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-primary"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-primary"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                <p className="font-medium">{current.caption}</p>
                <p className="text-white/60">
                  {[current.album, formatDate(current.taken_on)].filter(Boolean).join(" · ")} · {(openIndex ?? 0) + 1}/{visible.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
