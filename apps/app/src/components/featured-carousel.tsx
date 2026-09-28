import { useCallback, useEffect, useRef, useState } from 'react'
import { asset } from '#/lib/asset'
import { cn } from '#/lib/utils'

export interface FeaturedSlide {
  id: number
  title: string
  excerpt: string
  href?: string // optional link for the title (opens in a new tab)
  category?: string
  categoryHref?: string
  date: string // YYYY-MM-DD
  dateLabel: string // e.g. "Sep 18, 2026"
  image?: string // public/ path or absolute URL
  imageAlt?: string
}

const INTERVAL_MS = 5000
const SWIPE_THRESHOLD_PX = 50

function imageSrc(url: string) {
  return /^https?:\/\//.test(url) ? url : asset(url)
}

const controlClass =
  'group bg-foreground hover:bg-primary text-sm font-semibold p-2 sm:p-3 rounded-full border-solid border border-background/20 transform-gpu motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

// Full-bleed crossfading hero, modelled on the UCC featured-news carousel:
// autoplay every 5s, pause on hover, arrow keys, swipe, prev/next,
// play/pause, and dot navigation.
export function FeaturedCarousel({
  slides,
  label = 'Featured news',
}: {
  slides: Array<FeaturedSlide>
  label?: string
}) {
  const [current, setCurrent] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [hovered, setHovered] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const count = slides.length

  const go = useCallback(
    (index: number) => setCurrent(((index % count) + count) % count),
    [count],
  )
  const next = useCallback(() => go(current + 1), [go, current])
  const previous = useCallback(() => go(current - 1), [go, current])

  // Viewers who prefer reduced motion start paused (they can press play).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setAutoPlay(false)
  }, [])

  useEffect(() => {
    if (!autoPlay || hovered || count < 2) return
    const timer = setTimeout(next, INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [autoPlay, hovered, count, next])

  if (count === 0) return null

  return (
    <div
      className="relative w-full overflow-hidden"
      // Deeper shade of the theme primary for the slide captions.
      style={
        {
          '--caption-tint':
            'color-mix(in srgb, var(--primary) 78%, var(--foreground))',
        } as React.CSSProperties
      }
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      aria-live="polite"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          previous()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          next()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        const end = e.changedTouches[0]?.clientX
        touchStartX.current = null
        if (
          start == null ||
          end == null ||
          Math.abs(end - start) < SWIPE_THRESHOLD_PX
        )
          return
        if (end < start) next()
        else previous()
      }}
    >
      <div className="relative min-h-[42svh] w-full bg-foreground md:min-h-[55svh]">
        {slides.map((slide, i) => {
          const active = i === current
          return (
            <div
              key={slide.id}
              role="tabpanel"
              aria-label={`Slide ${i + 1} of ${count}`}
              inert={!active}
              className={cn(
                'absolute inset-0 transition-opacity duration-1000 ease-in-out',
                active
                  ? 'z-10 opacity-100'
                  : 'pointer-events-none z-0 opacity-0',
              )}
            >
              <div className="absolute bottom-0 z-10 w-full md:w-[70%] lg:w-[60%]">
                <div className="flex flex-col items-start rounded-tr-lg bg-gradient-to-t from-(--caption-tint)/95 via-(--caption-tint)/90 to-transparent py-3 pr-4 pl-4 sm:py-4 sm:pr-5 sm:pl-8 lg:pl-20">
                  <div className="flex items-stretch justify-between gap-5 max-md:ml-2.5">
                    {slide.category &&
                      (slide.categoryHref ? (
                        <a
                          href={slide.categoryHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit rounded-md border border-background bg-background px-2 py-1 text-xs font-semibold text-primary"
                        >
                          {slide.category}
                        </a>
                      ) : (
                        <span className="w-fit rounded-md border border-background bg-background px-2 py-1 text-xs font-semibold text-primary">
                          {slide.category}
                        </span>
                      ))}
                    <time
                      dateTime={slide.date}
                      className="my-auto text-sm leading-4 font-semibold text-background/90"
                    >
                      {slide.dateLabel}
                    </time>
                  </div>
                  {slide.href ? (
                    <a
                      href={slide.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-lg font-bold text-background transition-colors hover:text-foreground max-md:ml-2.5 sm:mt-4 sm:text-xl md:text-2xl lg:text-3xl"
                    >
                      {slide.title}
                    </a>
                  ) : (
                    <h2 className="mt-3 text-lg font-bold text-background max-md:ml-2.5 sm:mt-4 sm:text-xl md:text-2xl lg:text-3xl">
                      {slide.title}
                    </h2>
                  )}
                  <div className="mt-2 mb-1.5 h-[3px] w-[120px] shrink-0 bg-background max-md:ml-2.5 sm:w-[160px]" />
                  <p className="line-clamp-2 text-sm text-pretty text-background/85 sm:text-base lg:text-lg">
                    {slide.excerpt}
                  </p>
                </div>
              </div>
              {slide.image && (
                <img
                  src={imageSrc(slide.image)}
                  alt={slide.imageAlt ?? ''}
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 -z-10 h-full w-full object-cover"
                />
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <>
          {/* Right-aligned navigation + play controls */}
          <div className="absolute right-5 bottom-7 z-10 sm:bottom-16">
            <div className="hidden items-center gap-4 md:flex lg:gap-8">
              <button
                type="button"
                className={controlClass}
                onClick={previous}
                aria-label="Previous slide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-background group-hover:-translate-x-1 group-hover:scale-110 group-active:-translate-x-0.5 motion-safe:transition-transform motion-safe:duration-200"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={controlClass}
                onClick={() => setAutoPlay((v) => !v)}
                aria-label="Toggle autoplay"
                aria-pressed={!autoPlay}
              >
                {autoPlay ? (
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6 text-background group-hover:scale-110 motion-safe:transition-transform motion-safe:duration-200"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                      />
                    </svg>
                    <span className="sr-only">Pause</span>
                  </span>
                ) : (
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6 text-background group-hover:scale-110 group-hover:rotate-3 motion-safe:transition-transform motion-safe:duration-200"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.25v13.5L18.75 12 5.25 5.25z"
                      />
                    </svg>
                    <span className="sr-only">Play</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                className={controlClass}
                onClick={next}
                aria-label="Next slide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-background group-hover:translate-x-1 group-hover:scale-110 group-active:translate-x-0.5 motion-safe:transition-transform motion-safe:duration-200"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Centered dots */}
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-5">
            <div
              className="flex items-center gap-0.5 sm:gap-1"
              role="tablist"
              aria-label="Slide pagination"
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-current={i === current}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    setAutoPlay(false)
                    go(i)
                  }}
                  className="grid h-6 w-6 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-2.5 w-2.5 rounded-full border transition-colors',
                      i === current
                        ? 'border-primary bg-primary'
                        : 'border-background/80 bg-background/40',
                    )}
                  />
                  <span className="sr-only">Slide {i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
