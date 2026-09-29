#!/usr/bin/env python3
"""
Camera-axis track of the SJTU Compton camera satellite on the celestial sphere.

Orbit : circular, 525 km, i = 97.5 deg, LTDN 10:30 (sun-synchronous)
Pointing assumption : camera axis = local (geocentric) zenith.

Figures (file names include site and date, saved in the current directory)
-----------------------------------------------------------------------
1. sky_track_<SITE>_<YYYYMMDD_HHMM>UTC.png
   First N_ORBITS after launch: 3D celestial sphere + all-sky map with
   minute ticks, FoV band edges, Sun and MeV sources.
2. sky_track_monthly_<SITE>_<YYYYMM>_<N>m.png
   One camera-axis circle per month, starting at LAUNCH_DATE, showing how
   the orbital plane turns with the Sun during the year.

Why one day looks like a single circle: in the inertial (sky) frame the
camera axis sweeps the orbital plane, and a sun-synchronous plane rotates
only ~0.99 deg/day. Earth's rotation moves the ground track, not this circle.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.lines import Line2D

# =========================
# user settings  (change the date here)
# =========================
SITE_NAME, SITE_LAT, SITE_LON = "QingDao", 36.5, 120.0
LAUNCH_DATE = datetime(2026, 11, 1, tzinfo=timezone.utc)   # UTC date; launch time is computed

ALT_KM     = 525.0
INC_DEG    = 97.5
LTDN_HOURS = 10.5

N_ORBITS        = 3
TICK_EVERY_MIN  = 10
N_MONTHS        = 12
FOV_HALF_DEG    = 20

COORDS     = "equatorial"   # all-sky map frame: "equatorial" or "galactic"
VIEW_ELEV  = 20             # 3D view angles [deg]
VIEW_AZIM  = -60

SOURCES = {
    "Crab":         (83.633, 22.015),
    "Cyg X-1":      (299.590, 35.202),
    "Galactic Ctr": (266.417, -29.008),
    "Vela":         (128.836, -45.176),
    "Cen A":        (201.365, -43.019),
    "3C 273":       (187.278, 2.052),
    "3C 454.3":     (343.491, 16.148),
}

OUT_DIR = Path.cwd()
BJT = timezone(timedelta(hours=8))

# =========================
# constants
# =========================
MU, RE, J2 = 398600.4418, 6378.137, 1.08263e-3
R_EQ2GAL = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
                     [ 0.4941094279, -0.4448296300,  0.7469822445],
                     [-0.8676661490, -0.1980763734,  0.4559837762]])
ORBIT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#e87ba4"]


# =========================
# time, sun, orbit
# =========================
def julian_date(dt):
    return dt.timestamp() / 86400.0 + 2440587.5


def gmst_deg(jd):
    return (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360.0


def mean_sun_ra_deg(jd):
    return (280.460 + 0.9856474 * (jd - 2451545.0)) % 360.0


def sun_unit_vector(jd):
    d = np.asarray(jd) - 2451545.0
    g = np.deg2rad((357.528 + 0.9856003 * d) % 360.0)
    L = (280.460 + 0.9856474 * d) % 360.0
    lam = np.deg2rad(L + 1.915 * np.sin(g) + 0.020 * np.sin(2 * g))
    eps = np.deg2rad(23.439 - 4e-7 * d)
    return np.array([np.cos(lam), np.cos(eps) * np.sin(lam), np.sin(eps) * np.sin(lam)])


def wrap180(x):
    return (np.asarray(x) + 180.0) % 360.0 - 180.0


def orbit_rates():
    a = RE + ALT_KM
    n = np.sqrt(MU / a**3)
    i = np.deg2rad(INC_DEG)
    k = (RE / a) ** 2
    raan_dot = -1.5 * n * J2 * k * np.cos(i)
    u_dot = n * (1.0 + 0.75 * J2 * k * (6.0 - 8.0 * np.sin(i) ** 2))
    return i, raan_dot, u_dot


def raan_deg(jd):
    return mean_sun_ra_deg(jd) + (LTDN_HOURS - 12.0) * 15.0 + 180.0


def find_launch(date, lat_site, lon_site):
    """Launch time = site in the orbital plane on a southbound pass."""
    i, _, _ = orbit_rates()
    s = np.sin(np.deg2rad(lat_site)) / np.sin(i)
    u_site = np.pi - np.arcsin(s)
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


def zenith_track(t0, u0, t_sec):
    """Camera-axis unit vectors (N,3) in the equatorial frame, plus orbit normal."""
    i, raan_dot, u_dot = orbit_rates()
    u = u0 + u_dot * t_sec
    raan = np.deg2rad(raan_deg(julian_date(t0))) + raan_dot * t_sec
    x = np.cos(raan) * np.cos(u) - np.sin(raan) * np.sin(u) * np.cos(i)
    y = np.sin(raan) * np.cos(u) + np.cos(raan) * np.sin(u) * np.cos(i)
    z = np.sin(u) * np.sin(i)
    h = np.array([np.sin(i) * np.sin(raan[0]), -np.sin(i) * np.cos(raan[0]), np.cos(i)])
    return np.column_stack([x, y, z]), h


def period_s():
    return 2 * np.pi / orbit_rates()[2]


# =========================
# geometry helpers
# =========================
def radec_to_vec(ra, dec):
    ra, dec = np.deg2rad(np.atleast_1d(ra)), np.deg2rad(np.atleast_1d(dec))
    return np.column_stack([np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)])


def small_circle(axis, radius_deg, n=361):
    axis = axis / np.linalg.norm(axis)
    tmp = np.array([0, 0, 1.0]) if abs(axis[2]) < 0.9 else np.array([1.0, 0, 0])
    e1 = np.cross(axis, tmp)
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(axis, e1)
    t = np.linspace(0, 2 * np.pi, n)[:, None]
    r = np.deg2rad(radius_deg)
    return np.cos(r) * axis + np.sin(r) * (np.cos(t) * e1 + np.sin(t) * e2)


def galactic_plane_eq(n=721):
    l = np.linspace(0, 2 * np.pi, n)
    return np.column_stack([np.cos(l), np.sin(l), np.zeros_like(l)]) @ R_EQ2GAL


def to_map(v_eq):
    """Equatorial unit vectors -> Mollweide x, y [rad] (longitude increases to the left)."""
    v = v_eq @ R_EQ2GAL.T if COORDS == "galactic" else v_eq
    lon = np.rad2deg(np.arctan2(v[:, 1], v[:, 0]))
    lat = np.arcsin(np.clip(v[:, 2], -1, 1))
    return np.deg2rad(-wrap180(lon)), lat


def map_line(ax, v_eq, **kw):
    x, y = to_map(v_eq)
    jump = np.where(np.abs(np.diff(x)) > np.pi)[0] + 1
    x, y = np.insert(x, jump, np.nan), np.insert(y, jump, np.nan)
    return ax.plot(x, y, **kw)


def view_vector():
    el, az = np.deg2rad(VIEW_ELEV), np.deg2rad(VIEW_AZIM)
    return np.array([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)])


def sphere_line(ax, v, color, lw=1.5, ls="-", alpha=1.0, label=None):
    """Draw a curve on the unit sphere: solid in front, faint behind."""
    front = v @ view_vector() >= 0
    for mask, a, style in ((front, alpha, ls), (~front, alpha * 0.25, ":")):
        vv = np.where(mask[:, None], v, np.nan)
        ax.plot(vv[:, 0], vv[:, 1], vv[:, 2], color=color, lw=lw, ls=style, alpha=a,
                label=label if style == ls else None)


def sphere_axes(fig, pos):
    ax = fig.add_subplot(pos, projection="3d")
    u, w = np.meshgrid(np.linspace(0, 2 * np.pi, 25), np.linspace(0, np.pi, 13))
    ax.plot_wireframe(np.cos(u) * np.sin(w), np.sin(u) * np.sin(w), np.cos(w),
                      color="lightgray", lw=0.3, alpha=0.5)
    eq = radec_to_vec(np.linspace(0, 360, 361), np.zeros(361))
    sphere_line(ax, eq, "k", lw=0.8, ls="--", alpha=0.6)
    sphere_line(ax, galactic_plane_eq(), "gray", lw=0.8, ls="-.", alpha=0.7)
    ax.plot([0, 0], [0, 0], [-1.25, 1.25], color="k", lw=0.6)
    ax.text(0, 0, 1.32, "NCP", fontsize=8, ha="center")
    for ra in (0, 90, 180, 270):
        p = 1.12 * radec_to_vec(ra, 0)[0]
        ax.text(*p, f"RA {ra}°", fontsize=7, ha="center", color="dimgray")
    ax.set_box_aspect([1, 1, 1])
    ax.set_xlim(-1, 1); ax.set_ylim(-1, 1); ax.set_zlim(-1, 1)
    ax.view_init(elev=VIEW_ELEV, azim=VIEW_AZIM)
    ax.set_axis_off()
    return ax


def map_axes(fig, pos):
    ax = fig.add_subplot(pos, projection="mollweide")
    ticks = np.arange(-150, 151, 30)
    ax.set_xticks(np.deg2rad(ticks))
    if COORDS == "galactic":
        ax.set_xticklabels([f"{(-t) % 360:.0f}°" for t in ticks], fontsize=8)
    else:
        ax.set_xticklabels([f"{((-t) % 360) / 15:.0f}h" for t in ticks], fontsize=8)
    ax.tick_params(axis="y", labelsize=8)
    ax.grid(alpha=0.3)
    if COORDS == "galactic":
        map_line(ax, radec_to_vec(np.linspace(0, 360, 721), np.zeros(721)),
                 color="k", lw=0.7, ls="--", alpha=0.6)
    else:
        map_line(ax, galactic_plane_eq(), color="gray", lw=0.8, ls="-.", alpha=0.8)
    return ax


def draw_sources(ax3, axm):
    v = radec_to_vec(*np.array(list(SOURCES.values())).T)
    front = v @ view_vector() >= 0
    ax3.scatter(v[front, 0], v[front, 1], v[front, 2], marker="*", s=70,
                color="white", edgecolor="k", depthshade=False)
    for name, p, f in zip(SOURCES, v, front):
        if f:
            ax3.text(*(1.06 * p), name, fontsize=7)
    x, y = to_map(v)
    axm.scatter(x, y, marker="*", s=90, color="white", edgecolor="k", zorder=6)
    for name, xi, yi in zip(SOURCES, x, y):
        axm.text(xi, yi + np.deg2rad(4), name, fontsize=7.5, ha="center", zorder=7,
                 path_effects=[pe.withStroke(linewidth=2.5, foreground="white")])


def draw_sun(ax3, axm, s, color="gold", size=120, label=None):
    if s @ view_vector() >= 0:
        ax3.scatter(*s, s=size, color=color, edgecolor="k", depthshade=False)
    x, y = to_map(s[None, :])
    axm.scatter(x, y, s=size, color=color, edgecolor="k", zorder=6, label=label)


def add_months(dt, k):
    m = dt.month - 1 + k
    return dt.replace(year=dt.year + m // 12, month=m % 12 + 1, day=1,
                      hour=0, minute=0, second=0, microsecond=0)


# =========================
# figure 1: launch day
# =========================
def plot_launch_day():
    t0, u0 = find_launch(LAUNCH_DATE, SITE_LAT, SITE_LON)
    P = period_s()
    t = np.arange(0, N_ORBITS * P + 10, 10.0)
    zen, h = zenith_track(t0, u0, t)
    orbit = np.minimum((t // P).astype(int), N_ORBITS - 1)
    sun = sun_unit_vector(julian_date(t0))

    print(f"Launch site : {SITE_NAME} ({SITE_LAT} N, {SITE_LON} E)")
    print(f"Launch time : {t0:%Y-%m-%d %H:%M:%S} UTC  ({t0.astimezone(BJT):%H:%M} BJT)")
    print(f"Period      : {P / 60:.2f} min")

    fig = plt.figure(figsize=(17, 7))
    ax3 = sphere_axes(fig, 121)
    axm = map_axes(fig, 122)

    for n in range(N_ORBITS):
        m = orbit == n
        lw = 4.0 - 1.2 * n
        c = ORBIT_COLORS[n % len(ORBIT_COLORS)]
        sphere_line(ax3, zen[m], c, lw=lw)
        map_line(axm, zen[m], color=c, lw=lw, label=f"Orbit {n + 1}")

    for sign in (1, -1):
        edge = small_circle(sign * h, 90 - FOV_HALF_DEG)
        sphere_line(ax3, edge, "k", lw=0.8, ls="--", alpha=0.7)
        map_line(axm, edge, color="k", lw=0.8, ls="--", alpha=0.7,
                 label=f"FoV band edge (±{FOV_HALF_DEG:g}°)" if sign == 1 else None)

    tick = np.where(np.isclose(t % (TICK_EVERY_MIN * 60), 0) & (t < P))[0]
    x, y = to_map(zen[tick])
    axm.scatter(x, y, s=10, color="k", zorder=5)
    for k, xi, yi in zip(tick, x, y):
        axm.text(xi + np.deg2rad(3), yi, f"{t[k] / 60:.0f}", fontsize=7, zorder=6,
                 path_effects=[pe.withStroke(linewidth=2, foreground="white")])

    x, y = to_map(zen[:1])
    axm.scatter(x, y, marker="P", s=110, color="red", edgecolor="k", zorder=8,
                label=f"Zenith at launch ({SITE_NAME})")
    if zen[0] @ view_vector() >= 0:
        ax3.scatter(*zen[0], marker="P", s=110, color="red", edgecolor="k", depthshade=False)
    draw_sun(ax3, axm, sun, label="Sun")
    draw_sources(ax3, axm)

    handles, labels = axm.get_legend_handles_labels()
    handles.append(Line2D([], [], marker="o", color="k", ls="", ms=3))
    labels.append(f"Minutes after launch (orbit 1, every {TICK_EVERY_MIN})")
    fig.legend(handles, labels, loc="lower center", ncol=4, fontsize=8, frameon=False)
    fig.suptitle(f"Camera axis on the celestial sphere — launch from {SITE_NAME} "
                 f"{t0:%Y-%m-%d %H:%M} UTC ({t0.astimezone(BJT):%H:%M} BJT), "
                 f"first {N_ORBITS} orbits (overlapping in the sky frame)", fontsize=11)

    out = OUT_DIR / f"sky_track_{SITE_NAME}_{t0:%Y%m%d_%H%M}UTC.png"
    fig.savefig(out, dpi=220, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved figure to {out}")


# =========================
# figure 2: month by month
# =========================
def plot_monthly():
    start = add_months(LAUNCH_DATE, 0)
    P = period_s()
    t = np.arange(0, P + 10, 10.0)
    colors = plt.get_cmap("plasma")(np.linspace(0.0, 0.88, N_MONTHS))
    i_lab = int(round(0.9 * (t.size - 1)))     # northbound, ~dec +36 deg on the night side

    fig = plt.figure(figsize=(17, 7))
    ax3 = sphere_axes(fig, 121)
    axm = map_axes(fig, 122)

    for k in range(N_MONTHS):
        d = add_months(start, k)
        c = colors[k]
        zen, _ = zenith_track(d, np.pi, t)
        sphere_line(ax3, zen, c, lw=2)
        map_line(axm, zen, color=c, lw=2, label=f"{d:%Y-%m}")
        draw_sun(ax3, axm, sun_unit_vector(julian_date(d)), color=c, size=45)
        p = zen[i_lab]
        x, y = to_map(p[None, :])
        axm.text(x[0], y[0], f"{d:%b}", fontsize=7, color="k", ha="center",
                 zorder=7, path_effects=[pe.withStroke(linewidth=2, foreground="white")])
        if p @ view_vector() >= 0:
            ax3.text(*(1.05 * p), f"{d:%b}", fontsize=7)

    draw_sources(ax3, axm)
    handles, labels = axm.get_legend_handles_labels()
    handles.append(Line2D([], [], marker="o", color="gray", mec="k", ls="", ms=6))
    labels.append("Sun on the 1st (same color)")
    fig.legend(handles, labels, loc="lower center", ncol=7, fontsize=8, frameon=False)
    fig.suptitle(f"Camera-axis circle on the 1st of each month from {start:%Y-%m} "
                 f"(LTDN 10:30, zenith pointing); dots = Sun on the same date",
                 fontsize=11)

    out = OUT_DIR / f"sky_track_monthly_{SITE_NAME}_{start:%Y%m}_{N_MONTHS}m.png"
    fig.savefig(out, dpi=220, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved figure to {out}")


if __name__ == "__main__":
    plot_launch_day()
    # plot_monthly()