// One icon per concept, so a stage, role, source or principle looks the same everywhere.

import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Cloud,
  Cookie,
  Database,
  Droplets,
  Factory,
  FileCheck2,
  FileText,
  Flame,
  FolderLock,
  Gavel,
  HardHat,
  HeartHandshake,
  Info,
  Landmark,
  LayoutGrid,
  Leaf,
  ListChecks,
  MapPinned,
  Package,
  PaintBucket,
  PlugZap,
  Recycle,
  Scale,
  Server,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Sprout,
  Users,
  Wallet,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
  Car,
} from "lucide-react"
import type { SourceKey, Stage, StakeholderRole } from "@/esgos/lib/types"
import type { Category } from "@/esgos/lib/questionEngine"
import type { Principle } from "@/esgos/lib/indicators"
import type { RefEntry } from "@/esgos/lib/reference/types"
import type { ClientProfile } from "@/esgos/lib/clients/types"

export const STAGE_ICON: Record<Stage, LucideIcon> = {
  agent: Sparkles,
  seed: MapPinned,
  boundary: Landmark,
  connect: PlugZap,
  profile: ClipboardList,
  gaps: LayoutGrid,
  plan: ListChecks,
}

// CSS colour for each journey step (defined per theme in globals.css).
export const STAGE_HUE: Record<Stage, string> = {
  agent: "var(--accent)",
  seed: "var(--hue-seed)",
  boundary: "var(--hue-boundary)",
  connect: "var(--hue-connect)",
  profile: "var(--hue-profile)",
  gaps: "var(--hue-gaps)",
  plan: "var(--hue-plan)",
}

export const tint = (hue: string, pct = 12) => `color-mix(in oklab, ${hue} ${pct}%, transparent)`

export const ROLE_ICON: Record<StakeholderRole, LucideIcon> = {
  "Plant head": Factory,
  "EHS manager": HardHat,
  "HR manager": Users,
  "Energy manager": Zap,
  "Maintenance head": Wrench,
  "Finance controller": Wallet,
  "Procurement head": ShoppingCart,
  "Company secretary": Scale,
  "ESG lead": Leaf,
  "Office admin": Building2,
  "IT / ERP owner": Server,
  "Quality head": BadgeCheck,
}

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  operations: Factory,
  heat: Flame,
  water: Droplets,
  waste: Recycle,
  refrigerants: Snowflake,
  people: Users,
  safety: HardHat,
  permits: FileCheck2,
}

export const SOURCE_ICON: Record<SourceKey, LucideIcon> = {
  ergos: Zap,
  hrms: Users,
  erp: Database,
  ehs: HardHat,
  vault: FolderLock,
}

export const SECTOR_ICON: Record<ClientProfile["sector"], LucideIcon> = {
  paints: PaintBucket,
  snacks: Cookie,
  foods: Wheat,
  auto: Car,
}

export const PRINCIPLE_ICON: Record<Principle, LucideIcon> = {
  A: Building2,
  B: Scale,
  P1: ShieldCheck,
  P2: Package,
  P3: Users,
  P5: HeartHandshake,
  P6: Leaf,
  P8: Sprout,
  P9: ShoppingBag,
}

export const FRAMEWORK_ICON: Record<RefEntry["framework"], LucideIcon> = {
  BRSR: FileText,
  "BRSR Core": ShieldCheck,
  "GHG Protocol": Cloud,
  Regulation: Gavel,
  "Emission factor": Factory,
  Applicability: Info,
}

