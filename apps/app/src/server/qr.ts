import { createServerFn } from "@tanstack/react-start";
import { getRegistrationQrSvg } from "./api/lib/qr.js";

export const getRegistrationQr = createServerFn({ method: "GET" }).handler(async () => {
  const svg = await getRegistrationQrSvg();
  return { svg };
});
