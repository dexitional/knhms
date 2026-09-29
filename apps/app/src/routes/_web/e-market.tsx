import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Star,
  Store,
  Bike,
  Clock,
  UtensilsCrossed,
} from 'lucide-react'
import type {
  FoodMenuItemRow,
  FoodVendorRow,
  MarketCategoryRow,
  MarketProductRow,
} from '@knh/db'
import { getMarketCatalog } from '#/server/market'
import { asset } from '#/lib/asset'
import { SellerLogo } from '#/components/seller-logo'
import {
  AUDIENCE_LABELS,
  discountPercent,
  formatCedis,
  marketIcon,
} from '#/lib/market'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'

export const Route = createFileRoute('/_web/e-market')({
  loader: () => getMarketCatalog(),
  component: EMarketPage,
})

// Public listings carry the seller's logo (sellers.logo_url) when they have one.
type Product = MarketProductRow & { seller_logo_url?: string | null }
type Category = MarketCategoryRow
type Vendor = FoodVendorRow & { menu: Array<FoodMenuItemRow> }
type Audience = 'all' | 'students' | 'staff'
type Sort = 'popular' | 'price-asc' | 'price-desc' | 'discount'

// Placeholder tints for products without an uploaded image, picked per
// category so a row of placeholders doesn't read as one grey block.
const TINTS = [
  'bg-orange-50 text-orange-500',
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-violet-50 text-violet-600',
  'bg-rose-50 text-rose-500',
  'bg-amber-50 text-amber-600',
  'bg-teal-50 text-teal-600',
  'bg-indigo-50 text-indigo-600',
]

function tintFor(categoryId: number) {
  return TINTS[categoryId % TINTS.length]!
}

function imageSrc(url: string) {
  return /^https?:\/\//.test(url) ? url : asset(url)
}

function EMarketPage() {
  const { categories, products, vendors } = Route.useLoaderData()
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [audience, setAudience] = useState<Audience | 'any'>('any')
  const [sort, setSort] = useState<Sort>('popular')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const catalogRef = useRef<HTMLElement>(null)

  const featured = products.filter((p) => p.is_featured)
  const topDeals = (featured.length ? featured : products).slice(0, 12)
  const spotlight = [...products]
    .sort(
      (a, b) =>
        discountPercent(b.price, b.old_price) -
        discountPercent(a.price, a.old_price),
    )
    .slice(0, 3)
  const budget = [...products].sort((a, b) => a.price - b.price).slice(0, 6)
  const bannerCategories = categories.slice(0, 3)

  const query = search.trim().toLowerCase()
  const catalog = products
    .filter(
      (p) =>
        (categoryId == null || p.category_id === categoryId) &&
        (audience === 'any' ||
          p.audience === audience ||
          p.audience === 'all') &&
        (!query ||
          [p.name, p.description, p.seller_name].some((f) =>
            f?.toLowerCase().includes(query),
          )),
    )
    .sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price
      if (sort === 'price-desc') return b.price - a.price
      if (sort === 'discount')
        return (
          discountPercent(b.price, b.old_price) -
          discountPercent(a.price, a.old_price)
        )
      return 0 // server order: featured first, then admin display order
    })

  const showCatalog = (next?: { categoryId?: number | null; sort?: Sort }) => {
    if (next && 'categoryId' in next) setCategoryId(next.categoryId ?? null)
    if (next?.sort) setSort(next.sort)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeCategory =
    categoryId != null ? categoryById.get(categoryId) : null

  return (
    <div className="bg-secondary/60 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 py-4 text-sm text-muted-foreground"
          >
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={cn(
                'hover:text-primary',
                !activeCategory && 'font-medium text-foreground',
              )}
            >
              E-Market
            </button>
            {activeCategory && (
              <>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <span className="font-medium text-foreground">
                  {activeCategory.name}
                </span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/seller/register"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Store className="size-4" /> Sell on the E-Market
            </Link>
            <Link
              to="/seller/login"
              className="font-medium text-muted-foreground hover:text-primary"
            >
              Seller login
            </Link>
          </div>
        </div>

        {products.length === 0 && vendors.length === 0 ? (
          <div className="rounded-lg bg-card p-12 text-center shadow-sm">
            <Store className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">
              The E-Market is being stocked
            </p>
            <p className="text-sm text-muted-foreground">
              Please check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Featured strip */}
            <article className="flex flex-col gap-4 rounded-lg bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:gap-0 lg:py-6">
              <div className="shrink-0 lg:px-4">
                <div className="relative flex aspect-[1111/500] w-full flex-col justify-center overflow-hidden rounded bg-gradient-to-br from-primary to-[color-mix(in_srgb,var(--primary)_55%,var(--foreground))] px-6 py-5 text-primary-foreground lg:w-72">
                  <img
                    src={asset('logo.png')}
                    alt=""
                    className="absolute -right-4 -bottom-6 h-32 w-auto opacity-20"
                  />
                  <span className="absolute top-2 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                    Featured
                  </span>
                  <p className="text-xs font-semibold tracking-widest uppercase opacity-90">
                    KNH E-Market
                  </p>
                  <p className="mt-1 text-xl leading-tight font-black">
                    Campus deals for students & staff
                  </p>
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:px-2">
                {spotlight.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className="flex rounded-md p-2 text-left transition-colors hover:bg-secondary/60"
                  >
                    <div className="relative shrink-0">
                      <ProductImage
                        product={p}
                        category={categoryById.get(p.category_id)}
                        className="size-20 rounded"
                      />
                      <DiscountBadge
                        product={p}
                        className="absolute -top-1 -right-1 text-[10px]"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col pl-3">
                      <p className="line-clamp-2 text-xs text-foreground">
                        {p.name}
                      </p>
                      <p className="flex items-baseline gap-1.5 pt-1.5 text-sm font-bold text-foreground">
                        {formatCedis(p.price)}
                        {p.old_price != null && (
                          <span className="text-[10px] font-normal text-muted-foreground line-through">
                            {formatCedis(p.old_price)}
                          </span>
                        )}
                      </p>
                      {p.rating != null && (
                        <Stars rating={p.rating} className="mt-auto pt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => showCatalog({ sort: 'discount' })}
                className="flex shrink-0 items-center gap-1 self-end px-4 text-sm font-semibold text-primary hover:underline lg:self-center"
              >
                Discover more <ArrowRight className="size-5" />
              </button>
            </article>

            {/* Category banners */}
            {bannerCategories.length > 0 && (
              <section className="grid grid-cols-3 gap-2 rounded-lg bg-card p-2 shadow-sm">
                {bannerCategories.map((c) => {
                  const Icon = marketIcon(c.icon)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => showCatalog({ categoryId: c.id })}
                      className={cn(
                        'group relative flex aspect-[3/2] flex-col justify-end overflow-hidden rounded p-3 text-left transition-shadow hover:shadow-lg sm:p-5',
                        tintFor(c.id),
                      )}
                    >
                      <Icon
                        className="absolute top-3 right-3 size-10 opacity-80 transition-transform group-hover:scale-110 sm:size-16"
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-tight font-bold text-foreground sm:text-lg">
                        {c.name}
                      </span>
                      <span className="mt-1 hidden text-xs font-semibold sm:block">
                        Shop now →
                      </span>
                    </button>
                  )
                })}
              </section>
            )}

            {/* Top Deals carousel */}
            <ProductCarousel
              title="Top Deals"
              products={topDeals}
              categoryById={categoryById}
              onSelect={setSelected}
              onSeeAll={() =>
                showCatalog({ categoryId: null, sort: 'discount' })
              }
            />

            {/* Budget row */}
            <section className="overflow-hidden rounded-lg bg-card shadow-sm">
              <SectionHeader
                title="Shop smart, spend less"
                onSeeAll={() =>
                  showCatalog({ categoryId: null, sort: 'price-asc' })
                }
              />
              <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-4 lg:grid-cols-6">
                {budget.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    category={categoryById.get(p.category_id)}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>

            {/* Food vendors */}
            {vendors.length > 0 && (
              <section
                id="food-vendors"
                className="scroll-mt-20 overflow-hidden rounded-lg bg-card shadow-sm"
              >
                <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 px-4 py-2">
                  <h2 className="flex items-center gap-2 text-xl font-medium text-foreground">
                    <UtensilsCrossed
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                    Food Vendors
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tap a vendor to see their menu and order
                  </p>
                </header>
                <div className="grid gap-3 p-3 pt-0 sm:grid-cols-2 lg:grid-cols-4">
                  {vendors.map((v) => (
                    <VendorCard
                      key={v.id}
                      vendor={v}
                      onSelect={setSelectedVendor}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Full catalogue */}
            <section
              ref={catalogRef}
              className="scroll-mt-20 overflow-hidden rounded-lg bg-card shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="text-xl font-medium text-foreground">
                  {activeCategory?.name ?? 'All Products'}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({catalog.length})
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products..."
                      aria-label="Search products"
                      className="h-9 w-48 rounded-md border border-border bg-background pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    aria-label="Sort products"
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="popular">Sort: Popularity</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="discount">Biggest Discount</option>
                  </select>
                </div>
              </header>

              <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Filter by category"
                >
                  <Chip
                    active={categoryId == null}
                    onClick={() => setCategoryId(null)}
                  >
                    All
                  </Chip>
                  {categories.map((c) => {
                    const Icon = marketIcon(c.icon)
                    return (
                      <Chip
                        key={c.id}
                        active={categoryId === c.id}
                        onClick={() => setCategoryId(c.id)}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                        {c.name}
                      </Chip>
                    )
                  })}
                </div>
                <div
                  className="flex flex-wrap items-center gap-2 text-sm"
                  role="group"
                  aria-label="Filter by who it's for"
                >
                  <span className="text-muted-foreground">For:</span>
                  {(['any', 'students', 'staff'] as const).map((a) => (
                    <Chip
                      key={a}
                      active={audience === a}
                      onClick={() => setAudience(a)}
                    >
                      {a === 'any' ? 'Everyone' : AUDIENCE_LABELS[a]}
                    </Chip>
                  ))}
                </div>
              </div>

              {catalog.length === 0 ? (
                <p className="px-4 py-12 text-center text-muted-foreground">
                  No products match your filters.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {catalog.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      category={categoryById.get(p.category_id)}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <VendorMenuDialog
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />
      <ProductDialog
        product={selected}
        category={selected ? categoryById.get(selected.category_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string
  onSeeAll: () => void
}) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-3 px-4">
      <h2 className="truncate text-xl font-medium text-foreground">{title}</h2>
      <button
        type="button"
        onClick={onSeeAll}
        className="flex shrink-0 items-center gap-1 py-1 text-sm font-semibold text-primary hover:underline"
      >
        See All <ArrowRight className="size-5" />
      </button>
    </header>
  )
}

function ProductCarousel({
  title,
  products,
  categoryById,
  onSelect,
  onSeeAll,
}: {
  title: string
  products: Array<Product>
  categoryById: Map<number, Category>
  onSelect: (p: Product) => void
  onSeeAll: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const updateEdges = () => {
    const el = trackRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  useEffect(updateEdges, [products.length])

  const scroll = (dir: 1 | -1) =>
    trackRef.current?.scrollBy({
      left: dir * trackRef.current.clientWidth * 0.8,
      behavior: 'smooth',
    })

  if (products.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title={title} onSeeAll={onSeeAll} />
      <div className="group relative px-1">
        <div
          ref={trackRef}
          onScroll={updateEdges}
          tabIndex={0}
          aria-label={`${title} products`}
          className="flex snap-x snap-mandatory gap-1 overflow-x-auto py-1 outline-none [scrollbar-width:none] focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="w-[calc(50%-2px)] shrink-0 snap-start sm:w-[calc(25%-3px)] lg:w-[calc(100%/6-4px)]"
            >
              <ProductCard
                product={p}
                category={categoryById.get(p.category_id)}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
        <CarouselButton
          direction="prev"
          disabled={atStart}
          onClick={() => scroll(-1)}
        />
        <CarouselButton
          direction="next"
          disabled={atEnd}
          onClick={() => scroll(1)}
        />
      </div>
    </section>
  )
}

function CarouselButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous' : 'Next'}
      className={cn(
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/60 text-background shadow transition-opacity hover:bg-foreground/80 disabled:pointer-events-none disabled:opacity-0 sm:flex',
        direction === 'prev' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

function ProductCard({
  product,
  category,
  onSelect,
}: {
  product: Product
  category?: Category
  onSelect: (p: Product) => void
}) {
  return (
    <article className="h-full">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="relative flex h-full w-full flex-col rounded p-2 text-left transition-shadow outline-none hover:z-10 hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ProductImage
          product={product}
          category={category}
          className="aspect-square w-full rounded"
        />
        <p className="mt-2 line-clamp-2 text-sm text-foreground">
          {product.name}
        </p>
        <p className="mt-1 text-base font-bold text-foreground">
          {formatCedis(product.price)}
        </p>
        {product.old_price != null && (
          <p className="text-xs text-muted-foreground line-through">
            {formatCedis(product.old_price)}
          </p>
        )}
        {product.audience !== 'all' && (
          <span className="mt-1 w-fit rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            For {AUDIENCE_LABELS[product.audience]}
          </span>
        )}
        <DiscountBadge
          product={product}
          className="absolute top-3 right-3 text-xs"
        />
      </button>
    </article>
  )
}

function DiscountBadge({
  product,
  className,
}: {
  product: Product
  className?: string
}) {
  const pct = discountPercent(product.price, product.old_price)
  if (!pct) return null
  return (
    <span
      className={cn(
        'rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary',
        className,
      )}
    >
      -{pct}%
    </span>
  )
}

function ProductImage({
  product,
  category,
  className,
}: {
  product: Product
  category?: Category
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const Icon = marketIcon(category?.icon ?? 'shopping-bag')

  if (!product.image_url || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          tintFor(product.category_id),
          className,
        )}
        aria-hidden="true"
      >
        <Icon className="size-1/3 min-h-6 min-w-6" strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      src={imageSrc(product.image_url)}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('bg-white object-contain', className)}
    />
  )
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <div
      className={cn('relative w-fit', className)}
      role="img"
      aria-label={`${rating} out of 5`}
    >
      <div className="flex text-border">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="size-3.5 fill-current" />
        ))}
      </div>
      <div
        className="absolute inset-0 flex overflow-hidden text-amber-400"
        style={{ width: `${pct}%` }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="size-3.5 shrink-0 fill-current" />
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

// Anonymous analytics for sellers (views and order clicks). sendBeacon
// survives the page navigating away (tel: links, WhatsApp tabs) and never
// blocks or errors in front of the shopper.
type MarketEvent =
  | { type: 'product_view'; productId: number }
  | { type: 'vendor_view'; vendorId: number }
  | { type: 'order_click'; channel: 'whatsapp' | 'call'; productId?: number; vendorId?: number }

function track(event: MarketEvent) {
  try {
    const body = JSON.stringify(event)
    const sent = navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }))
    if (!sent) {
      void fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Analytics must never get in the way.
  }
}

// "+233 (0) 24 123 4567" / "024 123 4567" → "233241234567" for wa.me links.
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\(0\)/g, '').replace(/\D/g, '')
  return digits.startsWith('0') ? `233${digits.slice(1)}` : digits
}

function ProductDialog({
  product,
  category,
  onClose,
}: {
  product: Product | null
  category?: Category
  onClose: () => void
}) {
  const productId = product?.id
  useEffect(() => {
    if (productId) track({ type: 'product_view', productId })
  }, [productId])

  return (
    <Dialog open={product != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {product && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative">
              <ProductImage
                product={product}
                category={category}
                className="aspect-square w-full rounded-lg border border-border"
              />
              <DiscountBadge
                product={product}
                className="absolute top-3 right-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-3">
              <DialogHeader className="text-left">
                {category && (
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                    {category.name}
                  </p>
                )}
                <DialogTitle className="text-xl leading-snug">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Product details and seller contact
                </DialogDescription>
              </DialogHeader>
              {product.rating != null && <Stars rating={product.rating} />}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCedis(product.price)}
                </span>
                {product.old_price != null && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCedis(product.old_price)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-secondary px-2 py-1 font-medium capitalize">
                  {product.item_condition}
                </span>
                <span className="rounded bg-secondary px-2 py-1 font-medium">
                  For {AUDIENCE_LABELS[product.audience]}
                </span>
              </div>
              {product.description && (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {product.description}
                </p>
              )}
              <div className="mt-auto rounded-lg border border-border p-3 text-sm">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Seller
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {product.seller_name && (
                    <SellerLogo
                      logoUrl={product.seller_logo_url ?? null}
                      name={product.seller_name}
                      className="size-12"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {product.seller_name}
                    </p>
                    {product.seller_location && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        {product.seller_location}
                      </p>
                    )}
                  </div>
                </div>
                {product.seller_phone && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a
                        href={`https://wa.me/${toWhatsAppNumber(product.seller_phone)}?text=${encodeURIComponent(`Hi, I'm interested in "${product.name}" on the KNH E-Market.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track({ type: 'order_click', channel: 'whatsapp', productId: product.id })}
                      >
                        <MessageCircle /> WhatsApp Seller
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`tel:+${toWhatsAppNumber(product.seller_phone)}`}
                        onClick={() => track({ type: 'order_click', channel: 'call', productId: product.id })}
                      >
                        <Phone /> Call
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function VendorLogo({
  vendor,
  className,
}: {
  vendor: Vendor
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!vendor.logo_url || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-primary/10 text-primary',
          className,
        )}
        aria-hidden="true"
      >
        <UtensilsCrossed className="size-1/2" strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      src={imageSrc(vendor.logo_url)}
      alt={`${vendor.name} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('bg-white object-contain', className)}
    />
  )
}

function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        isOpen
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-secondary text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          isOpen ? 'bg-emerald-500' : 'bg-muted-foreground',
        )}
      />
      {isOpen ? 'Open' : 'Closed'}
    </span>
  )
}

function VendorCard({
  vendor,
  onSelect,
}: {
  vendor: Vendor
  onSelect: (v: Vendor) => void
}) {
  const available = vendor.menu.filter((i) => i.is_available)
  const fromPrice = available.length
    ? Math.min(...available.map((i) => i.price))
    : null
  const highlights = available.slice(0, 3).map((i) => i.name)

  return (
    <button
      type="button"
      onClick={() => onSelect(vendor)}
      className={cn(
        'flex h-full flex-col rounded-lg border border-border p-4 text-left transition-shadow outline-none hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50',
        !vendor.is_open && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-3">
        <VendorLogo vendor={vendor} className="size-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug text-foreground">
              {vendor.name}
            </h3>
            <OpenBadge isOpen={vendor.is_open === 1} />
          </div>
          {vendor.cuisine && (
            <p className="text-xs font-medium text-primary">{vendor.cuisine}</p>
          )}
        </div>
      </div>
      {highlights.length > 0 && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {highlights.join(' · ')}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-muted-foreground">
        {fromPrice != null && (
          <span className="font-semibold text-foreground">
            From {formatCedis(fromPrice)}
          </span>
        )}
        {vendor.delivers === 1 && (
          <span className="inline-flex items-center gap-1">
            <Bike className="size-3.5 text-primary" /> Delivers
          </span>
        )}
        {vendor.location && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{vendor.location}</span>
          </span>
        )}
      </div>
    </button>
  )
}

function VendorMenuDialog({
  vendor,
  onClose,
}: {
  vendor: Vendor | null
  onClose: () => void
}) {
  const vendorId = vendor?.id
  useEffect(() => {
    if (vendorId) track({ type: 'vendor_view', vendorId })
  }, [vendorId])

  // Group by section, keeping the admin's item order within each.
  const sections = new Map<string, Array<FoodMenuItemRow>>()
  for (const item of vendor?.menu ?? []) {
    sections.set(item.section, [...(sections.get(item.section) ?? []), item])
  }

  return (
    <Dialog open={vendor != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {vendor && (
          <div className="flex flex-col gap-5">
            <DialogHeader className="text-left">
              <div className="flex items-start gap-4">
                <VendorLogo
                  vendor={vendor}
                  className="size-16 shrink-0 rounded-xl border border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-xl">{vendor.name}</DialogTitle>
                    <OpenBadge isOpen={vendor.is_open === 1} />
                  </div>
                  {vendor.cuisine && (
                    <p className="text-sm font-medium text-primary">
                      {vendor.cuisine}
                    </p>
                  )}
                  <DialogDescription
                    className={cn(!vendor.description && 'sr-only')}
                  >
                    {vendor.description ?? `Menu for ${vendor.name}`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {vendor.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" /> {vendor.location}
                </span>
              )}
              {vendor.opening_hours && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />{' '}
                  {vendor.opening_hours}
                </span>
              )}
              {vendor.delivers === 1 && (
                <span className="inline-flex items-center gap-1.5">
                  <Bike className="size-4 text-primary" /> Delivers on campus
                </span>
              )}
            </div>

            {vendor.phone && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href={`https://wa.me/${toWhatsAppNumber(vendor.phone)}?text=${encodeURIComponent(`Hi ${vendor.name}, I'd like to order from your menu on the KNH E-Market.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track({ type: 'order_click', channel: 'whatsapp', vendorId: vendor.id })}
                  >
                    <MessageCircle /> Order on WhatsApp
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`tel:+${toWhatsAppNumber(vendor.phone)}`}
                    onClick={() => track({ type: 'order_click', channel: 'call', vendorId: vendor.id })}
                  >
                    <Phone /> Call
                  </a>
                </Button>
              </div>
            )}

            {sections.size === 0 ? (
              <p className="rounded-lg bg-secondary/60 p-6 text-center text-sm text-muted-foreground">
                This vendor hasn't added a menu yet.
              </p>
            ) : (
              [...sections].map(([section, items]) => (
                <section key={section}>
                  <h3 className="mb-2 border-b border-border pb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {section}
                  </h3>
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 py-2.5',
                          !item.is_available && 'opacity-60',
                        )}
                      >
                        {item.image_url && (
                          <img
                            src={imageSrc(item.image_url)}
                            alt=""
                            loading="lazy"
                            className="size-14 shrink-0 rounded-md object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {item.name}
                            {!item.is_available && (
                              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                Sold out
                              </span>
                            )}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold text-foreground">
                          {formatCedis(item.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
