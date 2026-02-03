import { describe, it, expect } from 'vitest';

describe('Dynamic Shift Integration - Formulas Verification', () => {
  describe('Minute Cost Calculation', () => {
    it('should calculate minute cost correctly', () => {
      const dailyWage = 150;
      const workMinutes = 480; // 8 hours

      const minuteCost = dailyWage / workMinutes;

      expect(minuteCost).toBeCloseTo(0.3125, 4);
    });

    it('should handle different daily wages', () => {
      const testCases = [
        { wage: 100, minutes: 480, expected: 0.2083 },
        { wage: 150, minutes: 480, expected: 0.3125 },
        { wage: 200, minutes: 480, expected: 0.4167 },
        { wage: 180, minutes: 540, expected: 0.3333 }, // 9 hours
      ];

      testCases.forEach(({ wage, minutes, expected }) => {
        const minuteCost = wage / minutes;
        expect(minuteCost).toBeCloseTo(expected, 4);
      });
    });
  });

  describe('Late Penalty Calculation', () => {
    it('should calculate late penalty with correct formula', () => {
      // Formula: penalty = minuteCost × lateMinutes × penaltyRate
      const dailyWage = 150;
      const workMinutes = 480;
      const lateMinutes = 30;
      const penaltyRate = 0.5;

      const minuteCost = dailyWage / workMinutes;
      const penalty = minuteCost * lateMinutes * penaltyRate;

      expect(penalty).toBeCloseTo(4.6875, 2);
      expect(Math.round(penalty * 100) / 100).toBe(4.69);
    });

    it('should verify penalty with different rates', () => {
      const dailyWage = 150;
      const workMinutes = 480;
      const lateMinutes = 30;

      const testCases = [
        { rate: 0.5, expected: 4.69 },
        { rate: 1.0, expected: 9.38 },
        { rate: 1.5, expected: 14.06 },
        { rate: 2.0, expected: 18.75 },
      ];

      testCases.forEach(({ rate, expected }) => {
        const minuteCost = dailyWage / workMinutes;
        const penalty = minuteCost * lateMinutes * rate;
        const rounded = Math.round(penalty * 100) / 100;

        expect(rounded).toBeCloseTo(expected, 2);
      });
    });

    it('should handle zero late minutes', () => {
      const minuteCost = 0.3125;
      const lateMinutes = 0;
      const penaltyRate = 0.5;

      const penalty = minuteCost * lateMinutes * penaltyRate;

      expect(penalty).toBe(0);
    });

    it('should handle zero penalty rate', () => {
      const minuteCost = 0.3125;
      const lateMinutes = 30;
      const penaltyRate = 0;

      const penalty = minuteCost * lateMinutes * penaltyRate;

      expect(penalty).toBe(0);
    });
  });

  describe('Early Leave Penalty Calculation', () => {
    it('should calculate early leave penalty correctly', () => {
      const dailyWage = 150;
      const workMinutes = 480;
      const earlyLeaveMinutes = 30;
      const penaltyRate = 0.5;

      const minuteCost = dailyWage / workMinutes;
      const penalty = minuteCost * earlyLeaveMinutes * penaltyRate;

      expect(penalty).toBeCloseTo(4.6875, 2);
      expect(Math.round(penalty * 100) / 100).toBe(4.69);
    });

    it('should verify early leave penalty with different rates', () => {
      const dailyWage = 150;
      const workMinutes = 480;
      const earlyLeaveMinutes = 30;

      const testCases = [
        { rate: 0.5, expected: 4.69 },
        { rate: 1.0, expected: 9.38 },
        { rate: 1.5, expected: 14.06 },
        { rate: 2.0, expected: 18.75 },
      ];

      testCases.forEach(({ rate, expected }) => {
        const minuteCost = dailyWage / workMinutes;
        const penalty = minuteCost * earlyLeaveMinutes * rate;
        const rounded = Math.round(penalty * 100) / 100;

        expect(rounded).toBeCloseTo(expected, 2);
      });
    });
  });

  describe('Daily Deductions Calculation', () => {
    it('should calculate total daily deductions correctly', () => {
      const latePenalty = 4.69;
      const earlyLeavePenalty = 4.69;

      const totalDeductions = latePenalty + earlyLeavePenalty;

      expect(totalDeductions).toBeCloseTo(9.38, 2);
    });

    it('should handle only late penalty', () => {
      const latePenalty = 4.69;
      const earlyLeavePenalty = 0;

      const totalDeductions = latePenalty + earlyLeavePenalty;

      expect(totalDeductions).toBeCloseTo(4.69, 2);
    });

    it('should handle only early leave penalty', () => {
      const latePenalty = 0;
      const earlyLeavePenalty = 4.69;

      const totalDeductions = latePenalty + earlyLeavePenalty;

      expect(totalDeductions).toBeCloseTo(4.69, 2);
    });

    it('should handle no penalties', () => {
      const latePenalty = 0;
      const earlyLeavePenalty = 0;

      const totalDeductions = latePenalty + earlyLeavePenalty;

      expect(totalDeductions).toBe(0);
    });
  });

  describe('Daily Net Amount Calculation', () => {
    it('should calculate daily net amount correctly', () => {
      // Formula: netAmount = baseAmount - deductions + bonuses
      const baseAmount = 150;
      const deductions = 9.38;
      const bonuses = 0;

      const netAmount = baseAmount - deductions + bonuses;

      expect(netAmount).toBeCloseTo(140.62, 2);
    });

    it('should handle with bonuses', () => {
      const baseAmount = 150;
      const deductions = 9.38;
      const bonuses = 50;

      const netAmount = baseAmount - deductions + bonuses;

      expect(netAmount).toBeCloseTo(190.62, 2);
    });

    it('should handle perfect attendance', () => {
      const baseAmount = 150;
      const deductions = 0;
      const bonuses = 0;

      const netAmount = baseAmount - deductions + bonuses;

      expect(netAmount).toBe(150);
    });

    it('should handle with high deductions', () => {
      const baseAmount = 150;
      const deductions = 100;
      const bonuses = 0;

      const netAmount = baseAmount - deductions + bonuses;

      expect(netAmount).toBe(50);
    });
  });

  describe('Monthly Payroll Calculation', () => {
    it('should calculate monthly net amount correctly', () => {
      // Formula: totalNetAmount = Σ(baseAmount) - Σ(deductions) + Σ(bonuses) + bonusesFromOverrides - deductionsFromOverrides
      const totalBaseAmount = 4500; // 30 days × 150
      const totalDeductions = 200;
      const totalBonuses = 100;
      const bonusesFromOverrides = 50;
      const deductionsFromOverrides = 25;

      const totalNetAmount =
        totalBaseAmount -
        totalDeductions +
        totalBonuses +
        bonusesFromOverrides -
        deductionsFromOverrides;

      expect(totalNetAmount).toBe(4425);
    });

    it('should handle without overrides', () => {
      const totalBaseAmount = 4500;
      const totalDeductions = 200;
      const totalBonuses = 100;

      const totalNetAmount = totalBaseAmount - totalDeductions + totalBonuses;

      expect(totalNetAmount).toBe(4400);
    });

    it('should handle with only bonus overrides', () => {
      const totalBaseAmount = 4500;
      const totalDeductions = 200;
      const totalBonuses = 100;
      const bonusesFromOverrides = 100;

      const totalNetAmount =
        totalBaseAmount - totalDeductions + totalBonuses + bonusesFromOverrides;

      expect(totalNetAmount).toBe(4500);
    });

    it('should handle with only deduction overrides', () => {
      const totalBaseAmount = 4500;
      const totalDeductions = 200;
      const totalBonuses = 100;
      const deductionsFromOverrides = 100;

      const totalNetAmount =
        totalBaseAmount - totalDeductions + totalBonuses - deductionsFromOverrides;

      expect(totalNetAmount).toBe(4300);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle full day with late and early leave', () => {
      // Scenario: Worker with dynamic shift
      // Shift: 09:00 - 18:00 (9 hours)
      // Check-in: 09:15 (15 minutes late)
      // Check-out: 17:45 (15 minutes early)
      // Daily wage: 180

      const dailyWage = 180;
      const workMinutes = 540; // 9 hours
      const lateMinutes = 15;
      const earlyLeaveMinutes = 15;
      const latePenaltyRate = 0.5;
      const earlyLeavePenaltyRate = 0.5;

      const minuteCost = dailyWage / workMinutes;
      const latePenalty = minuteCost * lateMinutes * latePenaltyRate;
      const earlyLeavePenalty =
        minuteCost * earlyLeaveMinutes * earlyLeavePenaltyRate;
      const totalDeductions = latePenalty + earlyLeavePenalty;
      const netAmount = dailyWage - totalDeductions;

      expect(minuteCost).toBeCloseTo(0.3333, 4);
      expect(latePenalty).toBeCloseTo(2.5, 2);
      expect(earlyLeavePenalty).toBeCloseTo(2.5, 2);
      expect(totalDeductions).toBeCloseTo(5.0, 2);
      expect(netAmount).toBeCloseTo(175.0, 2);
    });

    it('should handle perfect attendance', () => {
      // Scenario: Worker with perfect attendance
      // Shift: 08:00 - 17:00
      // Check-in: 07:50 (early)
      // Check-out: 17:10 (late)
      // Daily wage: 150

      const dailyWage = 150;
      const lateMinutes = 0; // No late
      const earlyLeaveMinutes = 0; // No early leave

      const latePenalty = 0;
      const earlyLeavePenalty = 0;
      const totalDeductions = latePenalty + earlyLeavePenalty;
      const netAmount = dailyWage - totalDeductions;

      expect(totalDeductions).toBe(0);
      expect(netAmount).toBe(150);
    });

    it('should handle severe penalties', () => {
      // Scenario: Worker with severe penalties
      // Shift: 08:00 - 17:00 (8 hours)
      // Check-in: 09:00 (60 minutes late)
      // Check-out: 16:00 (60 minutes early)
      // Daily wage: 150
      // Penalty rate: 1.0 (100%)

      const dailyWage = 150;
      const workMinutes = 480;
      const lateMinutes = 60;
      const earlyLeaveMinutes = 60;
      const penaltyRate = 1.0;

      const minuteCost = dailyWage / workMinutes;
      const latePenalty = minuteCost * lateMinutes * penaltyRate;
      const earlyLeavePenalty = minuteCost * earlyLeaveMinutes * penaltyRate;
      const totalDeductions = latePenalty + earlyLeavePenalty;
      const netAmount = dailyWage - totalDeductions;

      expect(minuteCost).toBeCloseTo(0.3125, 4);
      expect(latePenalty).toBeCloseTo(18.75, 2);
      expect(earlyLeavePenalty).toBeCloseTo(18.75, 2);
      expect(totalDeductions).toBeCloseTo(37.5, 2);
      expect(netAmount).toBeCloseTo(112.5, 2);
    });

    it('should handle monthly calculation with mixed days', () => {
      // Scenario: Monthly calculation with different daily results
      // 20 perfect days: 20 × 150 = 3000
      // 5 days with penalties: 5 × (150 - 10) = 700
      // 5 days with bonuses: 5 × (150 + 20) = 850

      const perfectDays = 20;
      const penaltyDays = 5;
      const bonusDays = 5;

      const baseAmountPerfect = perfectDays * 150;
      const baseAmountPenalty = penaltyDays * 150;
      const baseAmountBonus = bonusDays * 150;
      const totalBaseAmount =
        baseAmountPerfect + baseAmountPenalty + baseAmountBonus;

      const deductionsPenalty = penaltyDays * 10;
      const bonusesBonus = bonusDays * 20;

      const totalNetAmount =
        totalBaseAmount - deductionsPenalty + bonusesBonus;

      expect(totalBaseAmount).toBe(5250);
      expect(totalNetAmount).toBe(5300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small penalties', () => {
      const minuteCost = 0.0001;
      const minutes = 1;
      const penaltyRate = 0.1;

      const penalty = minuteCost * minutes * penaltyRate;
      const rounded = Math.round(penalty * 100) / 100;

      expect(rounded).toBe(0);
    });

    it('should handle very large wages', () => {
      const dailyWage = 10000;
      const workMinutes = 480;

      const minuteCost = dailyWage / workMinutes;

      expect(minuteCost).toBeCloseTo(20.8333, 4);
    });

    it('should handle very small wages', () => {
      const dailyWage = 10;
      const workMinutes = 480;

      const minuteCost = dailyWage / workMinutes;

      expect(minuteCost).toBeCloseTo(0.0208, 4);
    });

    it('should handle rounding consistency', () => {
      // Test that rounding is consistent
      const value1 = Math.round(4.6875 * 100) / 100;
      const value2 = Math.round(4.6875 * 100) / 100;

      expect(value1).toBe(value2);
      expect(value1).toBe(4.69);
    });
  });

  describe('Formula Verification Against Examples', () => {
    it('should verify example 1: Standard 8-hour shift with 30 minutes late', () => {
      // Given:
      // - Daily wage: 150
      // - Work minutes: 480 (8 hours)
      // - Late minutes: 30
      // - Penalty rate: 0.5

      // Expected:
      // - Minute cost: 0.3125
      // - Late penalty: 4.69
      // - Net amount: 145.31

      const dailyWage = 150;
      const workMinutes = 480;
      const lateMinutes = 30;
      const penaltyRate = 0.5;

      const minuteCost = dailyWage / workMinutes;
      const latePenalty = minuteCost * lateMinutes * penaltyRate;
      const netAmount = dailyWage - latePenalty;

      expect(Math.round(minuteCost * 10000) / 10000).toBe(0.3125);
      expect(Math.round(latePenalty * 100) / 100).toBe(4.69);
      expect(Math.round(netAmount * 100) / 100).toBe(145.31);
    });

    it('should verify example 2: 9-hour shift with 15 minutes late and 15 minutes early', () => {
      // Given:
      // - Daily wage: 180
      // - Work minutes: 540 (9 hours)
      // - Late minutes: 15
      // - Early leave minutes: 15
      // - Penalty rate: 0.5

      // Expected:
      // - Minute cost: 0.3333
      // - Late penalty: 2.50
      // - Early leave penalty: 2.50
      // - Total deductions: 5.00
      // - Net amount: 175.00

      const dailyWage = 180;
      const workMinutes = 540;
      const lateMinutes = 15;
      const earlyLeaveMinutes = 15;
      const penaltyRate = 0.5;

      const minuteCost = dailyWage / workMinutes;
      const latePenalty = minuteCost * lateMinutes * penaltyRate;
      const earlyLeavePenalty =
        minuteCost * earlyLeaveMinutes * penaltyRate;
      const totalDeductions = latePenalty + earlyLeavePenalty;
      const netAmount = dailyWage - totalDeductions;

      expect(Math.round(minuteCost * 10000) / 10000).toBeCloseTo(0.3333, 4);
      expect(Math.round(latePenalty * 100) / 100).toBe(2.5);
      expect(Math.round(earlyLeavePenalty * 100) / 100).toBe(2.5);
      expect(Math.round(totalDeductions * 100) / 100).toBe(5.0);
      expect(Math.round(netAmount * 100) / 100).toBe(175.0);
    });
  });
});
