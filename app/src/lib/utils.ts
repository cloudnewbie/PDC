import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Prefix a public/ asset with the Vite base path (needed when deployed under /PDC/). */
export function assetUrl(path: string) {
  return import.meta.env.BASE_URL.replace(/\/$/, "") + path
}
