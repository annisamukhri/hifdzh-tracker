import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns true if the user's local day-of-week is Monday (getDay() === 1)
export function isMonday(date: Date): boolean {
  return date.getDay() === 1
}

// Validates a daily target input string.
// Returns an error message string, or null if the value is valid.
export function validateTarget(value: string): string | null {
  if (!value || !value.trim()) {
    return 'Please enter a number'
  }
  const trimmed = value.trim()
  // Must be a whole number (no decimals, no non-numeric chars)
  if (!/^-?\d+$/.test(trimmed)) {
    return 'Must be a whole number'
  }
  const num = parseInt(trimmed, 10)
  if (num < 1) {
    return 'Must be at least 1'
  }
  return null
}
