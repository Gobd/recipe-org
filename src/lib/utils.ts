import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Dewey decimal number by combining all numbers before the last dot
 * and keeping only the last dot to separate the category from the recipe number.
 *
 * Example: "011.22.001" becomes "01122.001"
 *
 * @param deweyDecimal The Dewey decimal string to format
 * @returns The formatted Dewey decimal string
 */
export function formatDeweyDecimal(deweyDecimal: string): string {
  if (!deweyDecimal) return deweyDecimal;

  const parts = deweyDecimal.split('.');
  if (parts.length <= 1) return deweyDecimal;

  // Combine all parts except the last one (which is the recipe number)
  const categoryNumbers = parts.slice(0, -1).join('');
  const recipeNumber = parts[parts.length - 1];

  return `${categoryNumbers}.${recipeNumber}`;
}
