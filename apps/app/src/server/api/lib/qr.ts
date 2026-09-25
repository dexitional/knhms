import QRCode from "qrcode";

// Error correction "H" (~30% of codewords recoverable) is required, not just
// nice-to-have: the landing page overlays the hall crest over the center of
// this code (~20% of its width, via plain CSS layout, not baked into the
// bitmap), and only "H" has enough redundancy to stay reliably scannable
// once that much of the matrix is visually occluded.
//
// Dark modules are rendered in near-black, not the brand orange — orange on
// white has meaningfully lower luminance contrast and would hurt scan
// reliability on cheap phone cameras, which matters a lot for a "every
// student must scan this" flow. The brand orange instead appears only as a
// decorative border/ribbon around the code in the UI, never inside the
// scannable matrix itself.
export async function getRegistrationQrSvg(): Promise<string> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const targetUrl = new URL("/register", appUrl).toString();

  return QRCode.toString(targetUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#0D0D0D", light: "#FAFAFA" },
  });
}
