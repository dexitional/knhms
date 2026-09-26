import { asset } from "#/lib/asset";

// Dark QR modules stay near-black (set server-side in server/api/lib/qr.ts),
// never brand orange — orange-on-white has meaningfully lower contrast and
// would hurt scan reliability. The brand color instead appears only here, as
// a decorative border/ribbon around the code, never inside the scannable
// matrix itself. The crest overlay in the center relies on error-correction
// level "H" (set server-side) to stay scannable despite the occlusion.
export function RegistrationQrCard({ svg }: { svg: string }) {
  return (
    <div className="glass-panel relative mx-auto flex w-fit flex-col items-center gap-4 rounded-3xl border-2 border-primary/40 p-6 shadow-xl sm:p-8">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase shadow-md">
        Scan to Register
      </div>

      <div className="relative size-64 rounded-2xl bg-white p-3 shadow-inner sm:size-72">
        <div
          className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-background p-1 shadow-md sm:size-16">
          <img src={asset("logo.png")} alt="" className="h-full w-full rounded-full object-cover" />
        </div>
      </div>

      <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
        Open your phone's camera, point it at the code, and follow the link to complete your hall
        registration.
      </p>
    </div>
  );
}
