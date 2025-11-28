// Time parsing utilities for testing
export const getCallDateTimeISO = (callDateStr?: string, callTimeStr?: string): string => {
  console.log('🔍 [DEBUG] getCallDateTimeISO called with:', { callDateStr, callTimeStr });

  if (!callDateStr || callDateStr.trim() === '') {
    console.log('🔍 [DEBUG] No date provided, using now');
    return new Date().toISOString();
  }

  // Parse mm/dd/yyyy format
  const parts = callDateStr.split('/');
  if (parts.length !== 3) {
    console.warn('Invalid date format, using today:', callDateStr);
    return new Date().toISOString();
  }

  const [month, day, year] = parts.map(p => parseInt(p, 10));
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    console.warn('Invalid date numbers, using today:', callDateStr);
    return new Date().toISOString();
  }

  // Create date object at midnight local time
  const date = new Date(year, month - 1, day); // month is 0-indexed
  if (isNaN(date.getTime())) {
    console.warn('Invalid date, using today:', callDateStr);
    return new Date().toISOString();
  }

  // Default time values - use current time if no time provided
  let hours = new Date().getHours(), minutes = new Date().getMinutes();
  console.log('🔍 [DEBUG] Initial time values:', { hours, minutes });

  // If time is provided, parse it
  if (callTimeStr && callTimeStr.trim() !== '') {
    const timeParts = callTimeStr.split(':');
    console.log('🔍 [DEBUG] Time parts:', timeParts);
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
      console.log('🔍 [DEBUG] Parsed time:', { hours, minutes });

      // Validate time values
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn('Invalid time format, using current time:', callTimeStr);
        hours = new Date().getHours();
        minutes = new Date().getMinutes();
      }
    } else {
      console.log('No valid time format, using current time');
    }
  } else {
    console.log('No time provided, using current time');
  }

  // Set the time on the date object
  date.setHours(hours, minutes, 0, 0);
  const isoString = date.toISOString();
  console.log('🔍 [DEBUG] Final date and ISO:', { date: date.toString(), isoString });

  return isoString;
};