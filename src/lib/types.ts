export interface HourlyPrice {
  hour: number; // 0–23
  label: string; // "00:00", "01:00", …
  seepex: number | null; // €/MWh  day-ahead price
  cbc: number | null; // €/MWh  cross-border cost BA→RS
  efektivna: number | null; // €/MWh  = seepex * 0.85 - cbc
}

export interface PricesResponse {
  date: string; // YYYY-MM-DD (delivery day)
  fetchedAt: string; // ISO timestamp
  hours: HourlyPrice[];
  seepexAvailable: boolean;
  cbcAvailable: boolean;
}
