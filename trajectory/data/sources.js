// Source catalog of the sky planner. Every user sees these sources; each user's own
// additions and removals are saved in their browser, separately from this file, so
// a change here reaches everyone on their next visit.
//
// One record per source. The array below is plain JSON (double quotes, no comments
// inside, no comma after the last record), so other programs can read or write it,
// for example an export from a source database.
//
//   name   unique name (it identifies the source in each user's saved settings)
//   ra     right ascension, J2000 [deg]
//   dec    declination, J2000 [deg]
//   fBat   Swift-BAT 14-195 keV energy flux [1e-11 erg cm^-2 s^-1], or null
//   fLat   Fermi-LAT 4FGL-DR2 energy flux [1e-11 erg cm^-2 s^-1], or null
//   note   optional remark, shown when hovering over the source name
//
// Records may carry extra fields; the page keeps them and ignores them.
// Flux values: Tsuji et al. 2021, ApJ 916, 28, Tables 1 and 2.

const SOURCE_CATALOG = [
  {"name": "Crab",         "ra":  83.633, "dec":  22.015, "fBat": 2300, "fLat": 16,   "note": "F_LAT: synchrotron nebula component only"},
  {"name": "Vela",         "ra": 128.836, "dec": -45.176, "fBat": 18,   "fLat": 940},
  {"name": "Geminga",      "ra":  98.476, "dec":  17.770, "fBat": null, "fLat": null},
  {"name": "PSR B0656+14", "ra": 104.950, "dec":  14.239, "fBat": null, "fLat": null},
  {"name": "PSR B1055-52", "ra": 164.496, "dec": -52.450, "fBat": null, "fLat": null},
  {"name": "PSR B1509-58", "ra": 228.481, "dec": -59.136, "fBat": 26,   "fLat": 5.3,  "note": "F_LAT of MSH 15-52 (extended)"},
  {"name": "PSR B1951+32", "ra": 298.3,   "dec":  32.89,  "fBat": 0.92, "fLat": 15},
  {"name": "Cyg X-1",      "ra": 299.590, "dec":  35.202, "fBat": 1700, "fLat": 0.65},
  {"name": "LS 5039",      "ra": 276.6,   "dec": -14.85,  "fBat": 3.3,  "fLat": 27},
  {"name": "LSI +61 303",  "ra":  40.16,  "dec":  61.24,  "fBat": 3.2,  "fLat": 47},
  {"name": "3C 273",       "ra": 187.278, "dec":   2.052, "fBat": 42,   "fLat": 11},
  {"name": "3C 279",       "ra": 194.1,   "dec":  -5.799, "fBat": 3.9,  "fLat": 45},
  {"name": "3C 454.3",     "ra": 343.491, "dec":  16.148, "fBat": 16,   "fLat": 100},
  {"name": "CTA 102",      "ra": 338.2,   "dec":  11.71,  "fBat": 3.0,  "fLat": 49},
  {"name": "4C +21.35",    "ra": 186.2,   "dec":  21.4,   "fBat": 2.5,  "fLat": 20},
  {"name": "PKS 0208-512", "ra":  32.692, "dec": -51.017, "fBat": null, "fLat": null},
  {"name": "PKS 0528+134", "ra":  82.74,  "dec":  13.57,  "fBat": 1.8,  "fLat": 2.2},
  {"name": "PKS 1622-297", "ra": 246.6,   "dec": -29.86,  "fBat": 1.6,  "fLat": 3.9},
  {"name": "Cen A",        "ra": 201.365, "dec": -43.019, "fBat": 130,  "fLat": 6.3},
  {"name": "Galactic Ctr", "ra": 266.417, "dec": -29.008, "fBat": 11,   "fLat": 42}
];
