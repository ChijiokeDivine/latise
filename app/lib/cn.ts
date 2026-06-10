// app/lib/cn.ts
// Location: latise/app/lib/cn.ts
// Tiny classnames utility — avoids adding clsx dependency.
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}