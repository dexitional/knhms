import type { ComponentType, SVGProps } from "react"
import {
  Backpack,
  Bath,
  BedDouble,
  BookOpen,
  Bus,
  Calendar,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Flashlight,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  KeyRound,
  Laptop,
  Lock,
  MapPin,
  Megaphone,
  Phone,
  PlugZap,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stethoscope,
  Users,
  Utensils,
  Wallet,
} from "lucide-react"
import type { FreshmenIconName } from "#/lib/freshmen"

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// Icon names stored with Freshmen guides and items (lib/freshmen.ts).
export const FRESHMEN_ICONS: Record<FreshmenIconName, Icon> = {
  backpack: Backpack,
  "book-open": BookOpen,
  "clipboard-check": ClipboardCheck,
  users: Users,
  house: House,
  wallet: Wallet,
  laptop: Laptop,
  "key-round": KeyRound,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  "shield-check": ShieldCheck,
  megaphone: Megaphone,
  calendar: Calendar,
  "map-pin": MapPin,
  phone: Phone,
  "bed-double": BedDouble,
  lock: Lock,
  bath: Bath,
  flashlight: Flashlight,
  utensils: Utensils,
  "plug-zap": PlugZap,
  shirt: Shirt,
  bus: Bus,
  sparkles: Sparkles,
  "circle-help": CircleHelp,
  "file-text": FileText,
  "id-card": IdCard,
}

export function freshmenIcon(name: string | null | undefined, fallback: Icon = Sparkles): Icon {
  return (name && (FRESHMEN_ICONS as Record<string, Icon>)[name]) || fallback
}
