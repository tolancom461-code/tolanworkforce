// Helper functions for schedule management

/**
 * Get the start of the week (Saturday) for a given date
 * Week is Saturday (1) to Friday (7) in this system
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Convert to our system: 1 = Saturday, 2 = Sunday, ..., 7 = Friday
  // JavaScript: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want Saturday to be the start, so:
  // If today is Saturday (6), weekStart = today
  // If today is Sunday (0), weekStart = yesterday
  // If today is Monday (1), weekStart = 6 days ago
  // etc.
  
  const daysToSubtract = day === 6 ? 0 : (day + 1) % 7;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  
  return d;
}

/**
 * Get the end of the week (Friday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Friday
  end.setHours(23, 59, 59, 999);
  
  return end;
}

/**
 * Format date range for display (e.g., "2026-02-07 إلى 2026-02-13")
 */
export function formatWeekRange(date: Date): string {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };
  
  return `${formatDate(start)} إلى ${formatDate(end)}`;
}

/**
 * Get all weeks from a start date to end date
 */
export function getWeeksInRange(startDate: Date, endDate: Date): Array<{ start: Date; end: Date; label: string }> {
  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  let current = new Date(startDate);
  current = getWeekStart(current);
  
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    weeks.push({
      start: weekStart,
      end: weekEnd,
      label: formatWeekRange(weekStart),
    });
    
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}
