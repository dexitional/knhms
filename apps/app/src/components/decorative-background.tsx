// Every "picture/effect" here is CSS gradients and hand-authored inline SVG,
// not a generated or photographic image (no image-generation tool is
// available in this project) — the shield/star/banner shapes deliberately
// echo the hall crest's own vocabulary (see files/logo.png).
export function DecorativeBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Blurred gradient orbs */}
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/25 blur-[100px]" />
      <div className="absolute top-1/3 -right-32 size-[32rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 size-[24rem] rounded-full bg-foreground/10 blur-[110px]" />

      {/* Faint large shield-and-star motif echoing the crest */}
      <svg
        className="absolute top-1/2 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
        viewBox="0 0 200 240"
        fill="none"
      >
        <path
          d="M100 4 L190 34 V120 C190 180 150 220 100 236 C50 220 10 180 10 120 V34 Z"
          stroke="#0D0D0D"
          strokeWidth="3"
        />
        <path
          d="M100 40 L118 92 L174 92 L128 124 L146 178 L100 146 L54 178 L72 124 L26 92 L82 92 Z"
          fill="#0D0D0D"
        />
      </svg>

      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
