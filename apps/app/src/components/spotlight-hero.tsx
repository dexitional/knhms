import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { HubPostRow } from '@knh/db'
import { asset } from '#/lib/asset'
import { cn } from '#/lib/utils'
import { postImageSrc } from '#/components/hub-posts'

const INTERVAL_MS = 6500
const SWIPE_THRESHOLD_PX = 50

// The Home spotlight (same design as the akaweb hero): full-bleed
// crossfading slides from Admin → KNH Hub → Spotlights. Autoplays (paused on
// hover/focus and for reduced motion), with arrows, play/pause, dots,
// keyboard and swipe. The category is the eyebrow, the excerpt the caption
// and the post's link the "Read more" button.
// How a picture fills the banner on wider screens, measured once it loads:
//   cover -- landscape photos fill it, cropped from slightly above centre
//   side  -- near-square / portrait photos sit whole on the right
// On phones every picture shows whole at the top, with the text below.
// Whole pictures float over a blurred copy of themselves.
type Fit = 'cover' | 'side'

export function SpotlightHero({ slides }: { slides: Array<HubPostRow> }) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [fits, setFits] = useState<Record<number, Fit>>({})
  const touchStartX = useRef<number | null>(null)
  const count = slides.length

  const go = useCallback((index: number) => setCurrent(((index % count) + count) % count), [count])
  const next = useCallback(() => go(current + 1), [go, current])
  const previous = useCallback(() => go(current - 1), [go, current])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing || hovered || count < 2) return
    const timer = setTimeout(next, INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [playing, hovered, count, next])

  const measure = (id: number) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (w && h) setFits((f) => ({ ...f, [id]: w / h < 1.25 ? 'side' : 'cover' }))
  }

  // No spotlights yet: a branded welcome banner instead of an empty hero.
  if (count === 0) {
    return (
      <section className="relative isolate overflow-hidden bg-foreground text-white">
        <div className="absolute -top-32 -left-24 -z-10 size-[460px] rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 -bottom-40 -z-10 size-[520px] rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_auto] md:py-28">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Leadership by Example</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-balance md:text-6xl">Kwame Nkrumah Hall</h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              News, events and everything you need for hall life at the University of Cape Coast.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/freshers"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground hover:bg-primary/90"
              >
                Freshers guide <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/news"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-3.5 font-semibold ring-1 ring-white/25 hover:bg-white/20"
              >
                Latest news
              </Link>
            </div>
          </div>
          <img src={asset('logo.png')} alt="" className="hidden h-72 w-auto drop-shadow-2xl md:block" />
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative isolate h-[58svh] min-h-[380px] w-full overflow-hidden bg-foreground md:h-[62svh] md:max-h-[620px] md:min-h-[460px]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Spotlight"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') previous()
        if (e.key === 'ArrowRight') next()
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        const end = e.changedTouches[0]?.clientX
        touchStartX.current = null
        if (start == null || end == null || Math.abs(end - start) < SWIPE_THRESHOLD_PX) return
        if (end < start) next()
        else previous()
      }}
    >
      {slides.map((slide, i) => {
        const active = i === current
        const fit = fits[slide.id] ?? 'cover'
        const image = slide.image_url ? postImageSrc(slide.image_url) : null
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            inert={!active}
            className={cn('absolute inset-0 transition-opacity duration-1000 ease-in-out', active ? 'z-10 opacity-100' : 'z-0 opacity-0')}
          >
            {image ? (
              <>
                {/* Blurred backdrop behind whole (uncropped) pictures. */}
                <img
                  src={image}
                  alt=""
                  aria-hidden="true"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className={cn('absolute inset-0 size-full scale-110 object-cover opacity-70 blur-2xl', fit === 'cover' && 'md:hidden')}
                />
                <img
                  src={image}
                  alt=""
                  onLoad={measure(slide.id)}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  className={cn(
                    'absolute inset-0 size-full object-contain object-top transition-transform duration-[7000ms] ease-out',
                    fit === 'cover' && 'md:object-cover md:object-[center_35%]',
                    fit === 'side' && 'md:object-right',
                    fit === 'cover' && active ? 'md:scale-[1.04]' : 'scale-100',
                  )}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/60" aria-hidden="true">
                <img src={asset('logo.png')} alt="" className="absolute top-1/2 right-[8%] hidden h-2/3 -translate-y-1/2 opacity-15 md:block" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden="true" />

            <div className="relative mx-auto flex h-full max-w-6xl items-end px-4 pb-24 sm:px-6 md:items-center md:pb-0">
              <div
                className={cn(
                  'max-w-2xl text-white transition-all delay-200 duration-700',
                  active ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                )}
              >
                {slide.category && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase">
                    <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
                    {slide.category}
                  </span>
                )}
                {/* The page's main heading; later slides are sub-headings. */}
                {i === 0 ? (
                  <h1 className="mt-4 text-3xl leading-[1.1] font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl">{slide.title}</h1>
                ) : (
                  <h2 className="mt-4 text-3xl leading-[1.1] font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl">{slide.title}</h2>
                )}
                <span className="mt-5 block h-1 w-16 rounded-full bg-primary" aria-hidden="true" />
                {slide.excerpt && <p className="mt-5 line-clamp-3 text-base text-white/85 md:text-lg">{slide.excerpt}</p>}
                {slide.link_url && (
                  <a
                    href={slide.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-foreground shadow-lg transition hover:bg-accent"
                  >
                    Read more
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-6 sm:px-6 md:pb-8">
            <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    go(i)
                  }}
                  aria-label={`Go to slide ${i + 1}: ${slide.title}`}
                  aria-current={i === current}
                  className="group flex h-6 items-center"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-300',
                      i === current ? 'w-10 bg-primary' : 'w-5 bg-white/40 group-hover:bg-white/70',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: 'Previous slide', onClick: previous, icon: ChevronLeft },
                { label: playing ? 'Pause slideshow' : 'Play slideshow', onClick: () => setPlaying((v) => !v), icon: playing ? Pause : Play },
                { label: 'Next slide', onClick: next, icon: ChevronRight },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  onClick={control.onClick}
                  aria-label={control.label}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25 md:size-11"
                >
                  <control.icon className="size-5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
