/**
 * Utility functions for formatting duration and time-related data
 */

/**
 * Format seconds into MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string like "3:25" for 3 minutes 25 seconds
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into human readable format
 * @param seconds - Duration in seconds
 * @returns Human readable string like "3 min 25 sec" or "1 hr 5 min"
 */
export function formatDurationHuman(seconds: number): string {
  if (seconds <= 0) return '0 seconds';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    const parts = [];
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes} min${remainingMinutes > 1 ? 's' : ''}`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds} sec${remainingSeconds > 1 ? 's' : ''}`);
    return parts.join(' ');
  } else {
    const parts = [];
    if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds} sec${remainingSeconds > 1 ? 's' : ''}`);
    return parts.join(' ');
  }
}

/**
 * Convert minutes to seconds
 * @param minutes - Duration in minutes
 * @returns Duration in seconds
 */
export function minutesToSeconds(minutes: number): number {
  return Math.floor(minutes * 60);
}

/**
 * Convert seconds to minutes (rounded to nearest whole minute)
 * @param seconds - Duration in seconds
 * @returns Duration in minutes
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Parse duration from mm:ss format to seconds
 * @param durationString - Duration in mm:ss format (e.g., "4:05", "1:30")
 * @returns Number of seconds
 */
export function parseDuration(durationString: string): number {
  // Clean the input - remove any extra spaces
  const cleanInput = durationString.trim();
  
  // Check if the input matches mm:ss format
  const timePattern = /^(\d{1,3}):([0-5]?[0-9])$/;
  const match = cleanInput.match(timePattern);
  
  if (!match) {
    return 0; // Invalid format, return 0
  }
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  
  return minutes * 60 + seconds;
}

/**
 * Validate if a duration string is in correct mm:ss format
 * @param durationString - Duration to validate
 * @returns true if valid mm:ss format, false otherwise
 */
export function isValidDuration(durationString: string): boolean {
  const cleanInput = durationString.trim();
  const timePattern = /^(\d{1,3}):([0-5]?[0-9])$/;
  return timePattern.test(cleanInput);
}