/**
 * Mock SEEPEX day-ahead prices (€/MWh) — used when ENTSOE_API_KEY is not set.
 * Profile based on a typical Serbian summer day.
 */
export const MOCK_SEEPEX: number[] = [
  72, 68, 65, 63, 62, 65,  // 00–06  off-peak
  78, 96, 112, 118, 115, 110, // 06–12 morning ramp + midday
  105, 100, 98, 97, 100, 108, // 12–18 midday + evening build
  115, 108, 98, 90, 82, 76,  // 18–24 evening peak, decline
];

/**
 * Real CBC (MarginalPrice BA→RS) from NOSBiH auction for June 4, 2026.
 * Used as fallback if the live fetch fails.
 */
export const MOCK_CBC: number[] = [
  85.11, 85.11, 85.11, 85.11, 85.11, 85.11, // 00–06
   7.55, 85.11, 25.55, 21.00, 21.00, 21.00,  // 06–12
  21.00, 21.00, 10.22, 10.22, 40.00, 40.00,  // 12–18
  22.55, 22.55, 22.52, 22.52,  7.55,  7.55,  // 18–24
];
