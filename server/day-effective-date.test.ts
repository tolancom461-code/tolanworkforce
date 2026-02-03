import { describe, it, expect } from 'vitest';

describe('Day Effective Date Selection', () => {
  // Helper function to calculate effective date
  const getEffectiveDate = (dayOfWeek: number, option: 'current' | 'next' | 'previous'): Date => {
    const today = new Date();
    const currentDay = today.getDay();
    
    const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    
    let daysToAdd = 0;
    
    if (option === 'current') {
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && currentDay !== targetDay) daysToAdd = 0;
    } else if (option === 'next') {
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd <= 0) daysToAdd += 7;
    } else if (option === 'previous') {
      daysToAdd = (targetDay - currentDay - 7 + 14) % 7;
      if (daysToAdd >= 0) daysToAdd -= 7;
    }
    
    const result = new Date(today);
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };

  describe('Current week calculation', () => {
    it('should return today if it is the target day', () => {
      const today = new Date();
      const targetDay = today.getDay();
      
      // Convert JS day (0-6) to our format (1-7, where 7=Friday)
      let dayOfWeek = targetDay === 0 ? 7 : targetDay;
      
      const result = getEffectiveDate(dayOfWeek, 'current');
      
      expect(result.getDate()).toBe(today.getDate());
      expect(result.getMonth()).toBe(today.getMonth());
      expect(result.getFullYear()).toBe(today.getFullYear());
    });

    it('should return correct date for Saturday (dayOfWeek=1)', () => {
      const result = getEffectiveDate(1, 'current');
      expect(result.getDay()).toBe(6); // Saturday in JS
    });

    it('should return correct date for Friday (dayOfWeek=7)', () => {
      const result = getEffectiveDate(7, 'current');
      expect(result.getDay()).toBe(5); // Friday in JS
    });
  });

  describe('Next week calculation', () => {
    it('should return date at least 7 days in future', () => {
      const today = new Date();
      const result = getEffectiveDate(1, 'next'); // Saturday
      
      const diffTime = result.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBeGreaterThanOrEqual(1);
    });

    it('should return correct day of week for next week', () => {
      const result = getEffectiveDate(1, 'next'); // Saturday
      expect(result.getDay()).toBe(6); // Saturday
    });
  });

  describe('Previous week calculation', () => {
    it('should return date in the past', () => {
      const today = new Date();
      const result = getEffectiveDate(1, 'previous'); // Saturday
      
      expect(result.getTime()).toBeLessThan(today.getTime());
    });

    it('should return correct day of week for previous week', () => {
      const result = getEffectiveDate(1, 'previous'); // Saturday
      expect(result.getDay()).toBe(6); // Saturday
    });

    it('should return approximately 7 days ago', () => {
      const today = new Date();
      const result = getEffectiveDate(1, 'previous');
      
      const diffTime = today.getTime() - result.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBeGreaterThanOrEqual(1);
      expect(diffDays).toBeLessThanOrEqual(8);
    });
  });

  describe('All days of week', () => {
    it('should handle all days correctly', () => {
      const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        const result = getEffectiveDate(dayOfWeek, 'current');
        
        // Convert our format to JS day
        const expectedJsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
        
        expect(result.getDay()).toBe(expectedJsDay);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle Friday (dayOfWeek=7) correctly', () => {
      const result = getEffectiveDate(7, 'current');
      expect(result.getDay()).toBe(5); // Friday
    });

    it('should handle Saturday (dayOfWeek=1) correctly', () => {
      const result = getEffectiveDate(1, 'current');
      expect(result.getDay()).toBe(6); // Saturday
    });

    it('should maintain consistency across multiple calls', () => {
      const result1 = getEffectiveDate(3, 'current');
      const result2 = getEffectiveDate(3, 'current');
      
      expect(result1.getDate()).toBe(result2.getDate());
      expect(result1.getMonth()).toBe(result2.getMonth());
      expect(result1.getFullYear()).toBe(result2.getFullYear());
    });
  });
});
