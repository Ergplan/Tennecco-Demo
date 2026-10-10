import { cn } from "./cn"

/** jouleWise, as set in its own site header: "joule" light, "Wise" bold. */
export function JouleWise({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline text-[17px] tracking-tight", onDark ? "text-white" : "text-fg", className)} aria-label="jouleWise">
      <span className="font-light">joule</span>
      <span className="font-bold">Wise</span>
      <span className={cn("ml-0.5 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full", onDark ? "bg-[#7fd1a8]" : "bg-green")} aria-hidden />
    </span>
  )
}

/** A typographic Tenneco name in the corporate blue (text only, not the registered logo). */
export function TennecoName({ className, onDark, sub }: { className?: string; onDark?: boolean; sub?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("text-[17px] font-extrabold uppercase tracking-[0.12em]", onDark ? "text-white" : "text-brand")}>Tenneco</span>
      {sub && <span className={cn("font-mono text-[10px] uppercase tracking-[0.16em]", onDark ? "text-white/60" : "text-faint")}>{sub}</span>}
    </span>
  )
}
