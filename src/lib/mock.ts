/**
 * Mock SEEPEX day-ahead prices (€/MWh) — used when ENTSOE_API_KEY is not set.
 * Profile based on a typical Serbian summer day.
 */
export const MOCK_SEEPEX: number[] = [
  72,
  68,
  65,
  63,
  62,
  65, // 00–06  off-peak
  78,
  96,
  112,
  118,
  115,
  110, // 06–12 morning ramp + midday
  105,
  100,
  98,
  97,
  100,
  108, // 12–18 midday + evening build
  115,
  108,
  98,
  90,
  82,
  76, // 18–24 evening peak, decline
];

/**
 * Real CBC (MarginalPrice BA→RS) from NOSBiH auction for June 4, 2026.
 * Values converted from KM to EUR (÷ 1.95583 fixed peg).
 * Used as fallback if the live fetch fails.
 */
export const MOCK_CBC: number[] = [
  43.52,
  43.52,
  43.52,
  43.52,
  43.52,
  43.52, // 00–06  (85.11 KM)
  3.86,
  43.52,
  13.06,
  10.74,
  10.74,
  10.74, // 06–12
  10.74,
  10.74,
  5.22,
  5.22,
  20.45,
  20.45, // 12–18
  11.53,
  11.53,
  11.51,
  11.51,
  3.86,
  3.86, // 18–24
];
