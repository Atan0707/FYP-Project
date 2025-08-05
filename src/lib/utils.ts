import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes email address by converting to lowercase and trimming whitespace
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Converts a name to title case (first letter of each word capitalized)
 */
export function toTitleCase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Trims whitespace from input strings
 */
export function trimInput(input: string): string {
  return input.trim();
}