#!/usr/bin/env python3
"""
First orbits of the SJTU Compton camera satellite after launch.

Orbit (from the satellite provider):
    circular, 525 km, inclination 97.5 deg, LTDN 10:30  (sun-synchronous)

What the script does
--------------------
1. Finds the launch time on LAUNCH_DATE: the moment the launch site lies in
   the orbital plane on a southbound (descending) pass, which is how SSO
   launches from JSLC fly.
2. Propagates the orbit for N_ORBITS revolutions (circular orbit + J2).
3. Flags when the satellite is in Earth's shadow and inside the SAA.
4. Prints an event list and saves two figures:
      compton_sat_first_orbits_map.png       ground track
      compton_sat_first_orbits_timeline.png  latitude vs time with SAA/eclipse

Simplifications (state them if you show the plots)
-----------------------------------------------------
* "Launch" = the satellite is already in orbit directly above the site.
  A real rocket reaches orbit ~10-20 min after liftoff and a few thousand km
  downrange, so treat the first ~15 min of orbit 1 as schematic.
* The SAA is an approximate ellipse. Replace it with the polygon from your
  satellite provider or an AP9 flux contour.
* Cylindrical Earth shadow (no penumbra), low-precision solar ephemeris.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
import matplotlib.patheffects as pe

# =========================
# user settings
# =========================
ALT_KM      = 525.0
INC_DEG     = 97.5
LTDN_HOURS  = 10.5                 # 10:30
LAUNCH_DATE = datetime(2026, 10, 1, tzinfo=timezone.utc)   # UTC date; time of day is computed

# Jiuquan Satellite Launch Center (Ejin Banner, Inner Mongolia)
SITE_NAME, SITE_LAT, SITE_LON = "QingDao", 36.5, 120
# Jiuquan city, if you really want it (about 200 km from the launch center):
# SITE_NAME, SITE_LAT, SITE_LON = "Jiuquan city", 39 + 44/60 + 2/3600, 98 + 29/60 + 38/3600

N_ORBITS        = 3
STEP_S          = 10
LABEL_EVERY_MIN = 10               # time tick labels on the map

# approximate SAA ellipse at ~500 km (centre lon/lat, semi-axes in deg)
SAA = dict(lon=-50.0, lat=-26.0, a=45.0, b=18.0)

SHOW_CUTOFF = False                # Stormer cutoff-rigidity contours on the map

OUT_DIR = Path.cwd()
BJT = timezone(timedelta(hours=8))  # Beijing time

# =========================
# constants
# =========================
MU     = 398600.4418
RE     = 6378.137
RE_MAG = 6371.2
J2     = 1.08263e-3
POLE_LAT, POLE_LON = 80.8, -72.8    # IGRF-14 dipole pole, 2025

COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#e87ba4"]


# =========================
# time and sun
# =========================
def julian_date(dt):
    return dt.timestamp() / 86400.0 + 2440587.5


def gmst_deg(jd):
    return (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360.0


def mean_sun_ra_deg(jd):
    return (280.460 + 0.9856474 * (jd - 2451545.0)) % 360.0


def sun_unit_vector(jd):
    """Unit vector to the true sun in ECI (J2000-ish), shape (3, N)."""
    d = np.asarray(jd) - 2451545.0
    g = np.deg2rad((357.528 + 0.9856003 * d) % 360.0)
    L = (280.460 + 0.9856474 * d) % 360.0
    lam = np.deg2rad(L + 1.915 * np.sin(g) + 0.020 * np.sin(2 * g))
    eps = np.deg2rad(23.439 - 4e-7 * d)
    return np.array([np.cos(lam), np.cos(eps) * np.sin(lam), np.sin(eps) * np.sin(lam)])


def wrap180(x):
    return (np.asarray(x) + 180.0) % 360.0 - 180.0


# =========================
# orbit
# =========================
def orbit_rates():
    a = RE + ALT_KM
    n = np.sqrt(MU / a**3)
    i = np.deg2rad(INC_DEG)
    k = (RE / a) ** 2
    raan_dot = -1.5 * n * J2 * k * np.cos(i)
    u_dot = n * (1.0 + 0.75 * J2 * k * (6.0 - 8.0 * np.sin(i) ** 2))
    return a, i, raan_dot, u_dot


def raan_deg(jd):
    """RAAN that keeps the descending node at LTDN (mean local solar time)."""
    return mean_sun_ra_deg(jd) + (LTDN_HOURS - 12.0) * 15.0 + 180.0


def find_launch(date, lat_site, lon_site):
    """Time when the site is in the orbital plane on a descending pass."""
    _, i, _, _ = orbit_rates()
    s = np.sin(np.deg2rad(lat_site)) / np.sin(i)
    if abs(s) > 1:
        raise ValueError("launch site latitude is above the orbit's maximum latitude")
    u_site = np.pi - np.arcsin(s)                     # descending half of the orbit
    dra = np.rad2deg(np.arctan2(np.cos(i) * np.sin(u_site), np.cos(u_site)))

    day0 = date.replace(hour=0, minute=0, second=0, microsecond=0)
    jd0 = julian_date(day0)

    def mismatch(sec):
        jd = jd0 + np.asarray(sec) / 86400.0
        return wrap180(raan_deg(jd) + dra - gmst_deg(jd) - lon_site)

    secs = np.arange(0, 86400 + 60, 60, dtype=float)
    f = mismatch(secs)
    k = np.where((f[:-1] > 0) & (f[1:] <= 0) & (f[:-1] - f[1:] < 10))[0][0]
    lo, hi = secs[k], secs[k + 1]
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if mismatch(mid) > 0 else (lo, mid)
    return day0 + timedelta(seconds=0.5 * (lo + hi)), u_site


def propagate(t0, u0):
    a, i, raan_dot, u_dot = orbit_rates()
    period = 2 * np.pi / u_dot
    t = np.arange(0, N_ORBITS * period + STEP_S, STEP_S, dtype=float)

    jd0 = julian_date(t0)
    u = u0 + u_dot * t
    raan = np.deg2rad(raan_deg(jd0)) + raan_dot * t

    x = np.cos(raan) * np.cos(u) - np.sin(raan) * np.sin(u) * np.cos(i)
    y = np.sin(raan) * np.cos(u) + np.cos(raan) * np.sin(u) * np.cos(i)
    z = np.sin(u) * np.sin(i)

    jd = jd0 + t / 86400.0
    lon = wrap180(np.rad2deg(np.arctan2(y, x)) - gmst_deg(jd))
    lat = np.rad2deg(np.arcsin(z))
    r = a * np.vstack([x, y, z])
    orbit_no = np.minimum((t // period).astype(int) + 1, N_ORBITS)
    return dict(t=t, jd=jd, lat=lat, lon=lon, r=r, period=period, orbit=orbit_no)


# =========================
# conditions along the track
# =========================
def in_shadow(r, jd):
    s = sun_unit_vector(jd)
    proj = np.sum(r * s, axis=0)
    perp = np.linalg.norm(r - proj * s, axis=0)
    return (proj < 0) & (perp < RE)


def in_saa(lat, lon):
    dx = wrap180(lon - SAA["lon"]) / SAA["a"]
    dy = (lat - SAA["lat"]) / SAA["b"]
    return dx**2 + dy**2 <= 1.0


def stormer_cutoff_gv(lat, lon):
    phi, lam = np.deg2rad(lat), np.deg2rad(lon)
    phip, lamp = np.deg2rad(POLE_LAT), np.deg2rad(POLE_LON)
    sm = np.sin(phi) * np.sin(phip) + np.cos(phi) * np.cos(phip) * np.cos(lam - lamp)
    lam_m = np.arcsin(np.clip(sm, -1, 1))
    return 14.9 * np.cos(lam_m) ** 4 / ((RE + ALT_KM) / RE_MAG) ** 2


def runs(mask):
    """(start, end) index pairs of contiguous True runs."""
    m = np.concatenate([[False], mask, [False]]).astype(int)
    d = np.diff(m)
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0] - 1))


def split_segments(lon, mask):
    """Index arrays of contiguous True runs, also broken at the dateline."""
    idx = np.where(mask)[0]
    if idx.size == 0:
        return []
    brk = np.where((np.diff(idx) > 1) | (np.abs(np.diff(lon[idx])) > 180))[0]
    return np.split(idx, brk + 1)


# =========================
# report
# =========================
def fmt(t0, sec):
    dt = t0 + timedelta(seconds=float(sec))
    return f"{dt:%H:%M:%S} UTC / {dt.astimezone(BJT):%H:%M:%S} BJT  (T+{sec / 60:6.1f} min)"


def print_report(t0, trk, shadow, saa):
    t = trk["t"]
    print(f"Launch site     : {SITE_NAME} ({SITE_LAT:.3f} N, {SITE_LON:.3f} E)")
    print(f"Launch (ideal)  : {t0:%Y-%m-%d} {fmt(t0, 0)}")
    lmst = (t0.hour + t0.minute / 60 + t0.second / 3600 + SITE_LON / 15) % 24
    print(f"Local mean time at site: {int(lmst):02d}:{int(lmst % 1 * 60):02d}")
    print(f"Orbital period  : {trk['period'] / 60:.2f} min\n")

    events = []
    for s, e in runs(shadow):
        events.append((t[s], "enter Earth shadow"))
        events.append((t[e], "exit Earth shadow  "
                       f"({(t[e] - t[s]) / 60:.1f} min)"))
    for s, e in runs(saa):
        events.append((t[s], "enter SAA"))
        events.append((t[e], f"exit SAA  ({(t[e] - t[s]) / 60:.1f} min)"))
    asc = np.where((trk["lat"][:-1] < 0) & (trk["lat"][1:] >= 0))[0]
    for k in asc:
        events.append((t[k], f"ascending node, lon {trk['lon'][k]:7.1f}"))
    for n in range(1, N_ORBITS + 1):
        events.append(((n - 1) * trk["period"], f"--- start of orbit {n} ---"))
    for sec, text in sorted(events, key=lambda e: e[0]):
        if sec <= t[-1]:
            print(f"{fmt(t0, sec)}  {text}")

    print()
    for n in range(1, N_ORBITS + 1):
        m = trk["orbit"] == n
        print(f"Orbit {n}: sunlit {np.mean(~shadow[m]) * 100:5.1f} %, "
              f"in SAA {np.mean(saa[m]) * 100:5.1f} %")


# =========================
# figures
# =========================
def plot_map(t0, trk, shadow, saa):
    import cartopy.crs as ccrs
    import cartopy.feature as cfeature
    pc = ccrs.PlateCarree()

    fig = plt.figure(figsize=(13, 7))
    ax = plt.axes(projection=pc)
    ax.set_global()
    ax.add_feature(cfeature.OCEAN, facecolor="aliceblue", zorder=0)
    ax.add_feature(cfeature.LAND, facecolor="whitesmoke", zorder=1)
    ax.add_feature(cfeature.COASTLINE, edgecolor="grey", linewidth=0.5, zorder=2)
    ax.add_feature(cfeature.BORDERS, edgecolor="lightgrey", linewidth=0.3, zorder=2)
    gl = ax.gridlines(crs=pc, draw_labels=True, linewidth=0.5, color="gray",
                      alpha=0.5, linestyle="--")
    gl.top_labels = gl.right_labels = False
    gl.xlocator = plt.FixedLocator(np.arange(-180, 181, 30))
    gl.ylocator = plt.FixedLocator(np.arange(-90, 91, 30))
    gl.xlabel_style = gl.ylabel_style = {"size": 8}

    th = np.linspace(0, 2 * np.pi, 200)
    ax.fill(SAA["lon"] + SAA["a"] * np.cos(th), SAA["lat"] + SAA["b"] * np.sin(th),
            facecolor="red", alpha=0.15, edgecolor="red", linestyle="--",
            transform=pc, zorder=3)

    if SHOW_CUTOFF:
        LON, LAT = np.meshgrid(np.linspace(-180, 180, 361), np.linspace(-90, 90, 181))
        cs = ax.contour(LON, LAT, stormer_cutoff_gv(LAT, LON), levels=[1, 3, 6, 9, 12],
                        colors="black", linewidths=0.4, transform=pc, zorder=3)
        ax.clabel(cs, fmt="%g GV", fontsize=6)

    lon, lat, t = trk["lon"], trk["lat"], trk["t"]
    for n in range(1, N_ORBITS + 1):
        m = trk["orbit"] == n
        c = COLORS[(n - 1) % len(COLORS)]
        for seg in split_segments(lon, m & ~shadow):
            ax.plot(lon[seg], lat[seg], color=c, lw=2, transform=pc, zorder=4,
                    solid_capstyle="round")
        for seg in split_segments(lon, m & shadow):
            ax.plot(lon[seg], lat[seg], color=c, lw=2, ls=(0, (2, 2)),
                    transform=pc, zorder=4)

    tick = np.where(np.isclose(t % (LABEL_EVERY_MIN * 60), 0))[0][1:]
    ax.scatter(lon[tick], lat[tick], s=8, color="k", transform=pc, zorder=5)
    for k in tick:
        ax.text(lon[k] + 2, lat[k], f"{t[k] / 60:.0f}", fontsize=6.5, transform=pc,
                va="center", zorder=6,
                path_effects=[pe.withStroke(linewidth=2, foreground="white")])

    ax.scatter(SITE_LON, SITE_LAT, marker="*", s=180, color="gold", edgecolor="k",
               transform=pc, zorder=7)
    ax.text(SITE_LON + 3, SITE_LAT + 2, SITE_NAME, fontsize=8, transform=pc, zorder=7,
            path_effects=[pe.withStroke(linewidth=2, foreground="white")])

    handles = [Line2D([], [], color=COLORS[(n - 1) % len(COLORS)], lw=2,
                      label=f"Orbit {n}") for n in range(1, N_ORBITS + 1)]
    handles += [Line2D([], [], color="gray", lw=2, ls=(0, (2, 2)), label="In Earth shadow"),
                Patch(facecolor="red", alpha=0.15, edgecolor="red", ls="--",
                      label="SAA (approx.)"),
                Line2D([], [], marker="o", color="k", ls="", ms=3,
                       label=f"Minutes since launch (every {LABEL_EVERY_MIN})"),
                Line2D([], [], marker="*", color="gold", mec="k", ls="", ms=12,
                       label="Launch site")]
    ax.legend(handles=handles, loc="lower left", fontsize=8, framealpha=0.9)
    ax.set_title(f"First {N_ORBITS} orbits: {ALT_KM:.0f} km, i = {INC_DEG}°, LTDN 10:30  |  "
                 f"launch {t0:%Y-%m-%d %H:%M} UTC ({t0.astimezone(BJT):%H:%M} BJT)",
                 fontsize=10)

    out = OUT_DIR / "compton_sat_first_orbits_map.png"
    fig.savefig(out, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved figure to {out}")


def plot_timeline(t0, trk, shadow, saa):
    t_min = trk["t"] / 60
    fig, ax = plt.subplots(figsize=(13, 3.8))
    for s, e in runs(shadow):
        ax.axvspan(t_min[s], t_min[e], color="gray", alpha=0.25, lw=0)
    for s, e in runs(saa):
        ax.axvspan(t_min[s], t_min[e], color="red", alpha=0.25, lw=0)
    for n in range(1, N_ORBITS + 1):
        m = trk["orbit"] == n
        ax.plot(t_min[m], trk["lat"][m], color=COLORS[(n - 1) % len(COLORS)], lw=2,
                label=f"Orbit {n}")
        ax.axvline((n - 1) * trk["period"] / 60, color="k", lw=0.5, ls=":")
    ax.axhline(SITE_LAT, color="goldenrod", lw=0.8, ls="--")
    ax.set_xlim(0, t_min[-1])
    ax.set_ylim(-90, 90)
    ax.set_yticks(np.arange(-90, 91, 30))
    ax.set_xlabel(f"Minutes since launch ({t0:%Y-%m-%d %H:%M} UTC)")
    ax.set_ylabel("Latitude [deg]")
    ax.grid(alpha=0.3)
    handles, _ = ax.get_legend_handles_labels()
    handles += [Patch(color="gray", alpha=0.25, label="Earth shadow"),
                Patch(color="red", alpha=0.25, label="SAA (approx.)"),
                Line2D([], [], color="goldenrod", ls="--", label=f"{SITE_NAME} latitude")]
    ax.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, -0.18),
              fontsize=8, ncol=len(handles), frameon=False)

    out = OUT_DIR / "compton_sat_first_orbits_timeline.png"
    fig.savefig(out, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved figure to {out}")


def main():
    t0, u0 = find_launch(LAUNCH_DATE, SITE_LAT, SITE_LON)
    trk = propagate(t0, u0)
    shadow = in_shadow(trk["r"], trk["jd"])
    saa = in_saa(trk["lat"], trk["lon"])
    print_report(t0, trk, shadow, saa)
    plot_timeline(t0, trk, shadow, saa)
    plot_map(t0, trk, shadow, saa)


if __name__ == "__main__":
    main()