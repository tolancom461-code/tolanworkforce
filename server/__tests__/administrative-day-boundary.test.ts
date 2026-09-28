import { describe, expect, it, vi } from "vitest";

// attendance-logic imports the DB helper, but these boundary tests do not use DB access.
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import {
  getAdministrativeDayRange,
  getAdministrativeWorkDate,
} from "../attendance-logic";

describe("administrative day boundary transition", () => {
  describe("getAdministrativeWorkDate", () => {
    it("uses the legacy 05:00 boundary before 2026-09-17", () => {
      expect(getAdministrativeWorkDate(new Date("2026-09-16T04:39:59+03:00"))).toBe("2026-09-15");
      expect(getAdministrativeWorkDate(new Date("2026-09-16T04:50:00+03:00"))).toBe("2026-09-15");
      expect(getAdministrativeWorkDate(new Date("2026-09-16T04:59:59+03:00"))).toBe("2026-09-15");
      expect(getAdministrativeWorkDate(new Date("2026-09-16T05:00:00+03:00"))).toBe("2026-09-16");
    });

    it("uses the 04:40 boundary from 2026-09-17 onward", () => {
      expect(getAdministrativeWorkDate(new Date("2026-09-17T04:39:59+03:00"))).toBe("2026-09-16");
      expect(getAdministrativeWorkDate(new Date("2026-09-17T04:40:00+03:00"))).toBe("2026-09-17");
      expect(getAdministrativeWorkDate(new Date("2026-09-17T04:50:00+03:00"))).toBe("2026-09-17");
    });
  });

  describe("getAdministrativeDayRange", () => {
    it("keeps a normal historical day on 05:00 to 05:00", () => {
      const range = getAdministrativeDayRange("2026-09-15");
      expect(range.boundary).toBe("05:00");
      expect(range.start.toISOString()).toBe("2026-09-15T02:00:00.000Z");
      expect(range.endExclusive.toISOString()).toBe("2026-09-16T02:00:00.000Z");
    });

    it("ends 2026-09-16 at the new 04:40 boundary to avoid transition overlap", () => {
      const day16 = getAdministrativeDayRange("2026-09-16");
      const day17 = getAdministrativeDayRange("2026-09-17");

      expect(day16.boundary).toBe("05:00");
      expect(day16.start.toISOString()).toBe("2026-09-16T02:00:00.000Z");
      expect(day16.endExclusive.toISOString()).toBe("2026-09-17T01:40:00.000Z");

      expect(day17.boundary).toBe("04:40");
      expect(day17.start.toISOString()).toBe("2026-09-17T01:40:00.000Z");
      expect(day16.endExclusive.getTime()).toBe(day17.start.getTime());
    });

    it("keeps post-transition days on 04:40 to 04:40", () => {
      const range = getAdministrativeDayRange("2026-09-18");
      expect(range.boundary).toBe("04:40");
      expect(range.start.toISOString()).toBe("2026-09-18T01:40:00.000Z");
      expect(range.endExclusive.toISOString()).toBe("2026-09-19T01:40:00.000Z");
    });
  });
});
