#!/usr/bin/env python3
"""
Interactive camera-axis track on the celestial sphere.

Controls
--------
  Day slider   : days since LAUNCH_DATE (0 ... N_DAYS)
  Hour slider  : time of day, UTC
  Buttons      : -1 day / +1 day / Save PNG
  Keyboard     : left/right = -/+ 1 day,  up/down = -/+ 0.5 h

What is shown
-------------
  * the camera-axis circle for one orbit around the chosen moment
  * the FoV band edges for that day (sources between them are seen that day)
  * the satellite's current zenith and its instantaneous field of view
  * the Sun, and the MeV sources: red = inside the FoV right now,
    orange = inside today's band

Requirements
------------
  * compton_sky_track_months.py in the same folder. All settings
    (site, LAUNCH_DATE, orbit, FOV_HALF_DEG, SOURCES, COORDS) are read from it.
  * a GUI backend for matplotlib (see the notes in the chat), or run it in
    Jupyter with  %matplotlib widget  (pip install ipympl).

Note: the satellite's position *along* the circle far from launch is only
illustrative (drag changes the timing); the circle itself is reliable.
"""

import sys
from datetime import timedelta
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, Button

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compton_satellite_celestial_trajectory as base

# =========================
# settings for the interactive view
# =========================
N_DAYS = 365
OUT_DIR = Path.cwd()

# =========================
# fixed quantities
# =========================
T_LAUNCH, U_LAUNCH = base.find_launch(base.LAUNCH_DATE, base.SITE_LAT, base.SITE_LON)
P = base.period_s()
DAY0 = base.LAUNCH_DATE.replace(hour=0, minute=0, second=0, microsecond=0)
DT_ORBIT = np.linspace(-0.5 * P, 0.5 * P, 721)       # one orbit centred on "now"
SRC_NAMES = list(base.SOURCES)
SRC_VEC = base.radec_to_vec(*np.array(list(base.SOURCES.values())).T)
FOV = base.FOV_HALF_DEG
COS_FOV = np.cos(np.deg2rad(FOV))
SIN_FOV = np.sin(np.deg2rad(FOV))


def state(day, hour):
    now = DAY0 + timedelta(days=float(day), hours=float(hour))
    elapsed = (now - T_LAUNCH).total_seconds()
    zen, h = base.zenith_track(T_LAUNCH, U_LAUNCH, elapsed + DT_ORBIT)
    cur = zen[len(DT_ORBIT) // 2]
    sun = base.sun_unit_vector(base.julian_date(now))
    return now, elapsed, zen, h, cur, sun


# =========================
# figure and static layers
# =========================
fig = plt.figure(figsize=(16, 8.5))
ax3 = base.sphere_axes(fig, 121)
axm = base.map_axes(fig, 122)
ax3.set_position([0.0, 0.2, 0.42, 0.72])
axm.set_position([0.44, 0.26, 0.55, 0.62])
base.draw_sources(ax3, axm)


def view_vec():
    el, az = np.deg2rad(ax3.elev), np.deg2rad(ax3.azim)
    return np.array([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)])


def sphere_pair(color, lw, ls="-"):
    a, = ax3.plot([], [], [], color=color, lw=lw, ls=ls)
    b, = ax3.plot([], [], [], color=color, lw=lw, ls=":", alpha=0.25)
    return a, b


def set_sphere(pair, v):
    front = v @ view_vec() >= 0
    for line, m in zip(pair, (front, ~front)):
        vv = np.where(m[:, None], v, np.nan)
        line.set_data_3d(vv[:, 0], vv[:, 1], vv[:, 2])


def set_map(line, v):
    x, y = base.to_map(v)
    jump = np.where(np.abs(np.diff(x)) > np.pi)[0] + 1
    line.set_data(np.insert(x, jump, np.nan), np.insert(y, jump, np.nan))


# dynamic artists
C_ORB, C_FOV = "#2a78d6", "#e34948"
orb3 = sphere_pair(C_ORB, 2.5)
band3 = [sphere_pair("k", 0.8, "--") for _ in range(2)]
fov3 = sphere_pair(C_FOV, 1.5)
sat3, = ax3.plot([], [], [], "o", color=C_ORB, mec="k", ms=8)
sun3, = ax3.plot([], [], [], "o", color="gold", mec="k", ms=11)

orbm, = axm.plot([], [], color=C_ORB, lw=2.5, label="Camera-axis circle (1 orbit)")
bandm = [axm.plot([], [], color="k", lw=0.8, ls="--",
                  label=f"Today's FoV band edge (±{FOV:g}°)" if k == 0 else None)[0]
         for k in range(2)]
fovm, = axm.plot([], [], color=C_FOV, lw=1.5, label=f"Field of view now ({FOV:g}°)")
satm = axm.scatter([], [], s=70, color=C_ORB, edgecolor="k", zorder=8, label="Camera axis now")
sunm = axm.scatter([], [], s=150, color="gold", edgecolor="k", zorder=8, label="Sun")
band_hl = axm.scatter([], [], marker="*", s=160, color="orange", edgecolor="k", zorder=9,
                      label="Source in today's band")
now_hl = axm.scatter([], [], marker="*", s=220, color="red", edgecolor="k", zorder=10,
                     label="Source in FoV now")
fig.legend(loc="lower center", bbox_to_anchor=(0.72, 0.11), ncol=4, fontsize=8, frameon=False)
info = fig.text(0.02, 0.16, "", fontsize=9, family="monospace", va="top")
title = fig.suptitle("", fontsize=11)

# =========================
# widgets
# =========================
ax_day = fig.add_axes([0.10, 0.06, 0.55, 0.025])
ax_hour = fig.add_axes([0.10, 0.025, 0.55, 0.025])
s_day = Slider(ax_day, "Day", 0, N_DAYS, valinit=0, valstep=1)
h0 = T_LAUNCH.hour + T_LAUNCH.minute / 60
s_hour = Slider(ax_hour, "Hour (UTC)", 0, 24, valinit=round(h0, 1), valstep=0.1)
b_prev = Button(fig.add_axes([0.72, 0.035, 0.06, 0.04]), "-1 day")
b_next = Button(fig.add_axes([0.79, 0.035, 0.06, 0.04]), "+1 day")
b_save = Button(fig.add_axes([0.87, 0.035, 0.08, 0.04]), "Save PNG")
WIDGET_AXES = [ax_day, ax_hour, b_prev.ax, b_next.ax, b_save.ax]

current = {"now": None}


def update(_=None):
    now, elapsed, zen, h, cur, sun = state(s_day.val, s_hour.val)
    current["now"] = now
    vv = view_vec()

    set_sphere(orb3, zen)
    set_map(orbm, zen)
    for sign, p3, pm in zip((1, -1), band3, bandm):
        edge = base.small_circle(sign * h, 90 - FOV)
        set_sphere(p3, edge)
        set_map(pm, edge)
    fc = base.small_circle(cur, FOV)
    set_sphere(fov3, fc)
    set_map(fovm, fc)

    for art3, artm, v in ((sat3, satm, cur), (sun3, sunm, sun)):
        if v @ vv >= 0:
            art3.set_data_3d([v[0]], [v[1]], [v[2]])
        else:
            art3.set_data_3d([], [], [])
        artm.set_offsets(np.column_stack(base.to_map(v[None, :])))

    in_now = SRC_VEC @ cur >= COS_FOV
    in_band = np.abs(SRC_VEC @ h) <= SIN_FOV
    for art, m in ((band_hl, in_band & ~in_now), (now_hl, in_now)):
        art.set_offsets(np.column_stack(base.to_map(SRC_VEC[m])) if m.any()
                        else np.empty((0, 2)))

    sun_zen = np.degrees(np.arccos(np.clip(sun @ cur, -1, 1)))
    lines = [
        f"{now:%Y-%m-%d %H:%M} UTC   ({now.astimezone(base.BJT):%H:%M} BJT)",
        f"day {int(s_day.val)} after launch" if elapsed >= 0 else "before launch",
        f"Sun angle from camera axis: {sun_zen:5.1f} deg",
        "In FoV now      : " + (", ".join(n for n, m in zip(SRC_NAMES, in_now) if m) or "-"),
        "In today's band : " + (", ".join(n for n, m in zip(SRC_NAMES, in_band) if m) or "-"),
    ]
    info.set_text("\n".join(lines))
    s_day.valtext.set_text(f"{now:%Y-%m-%d}")
    title.set_text(f"Camera axis on the celestial sphere — {base.SITE_NAME} launch "
                   f"{T_LAUNCH:%Y-%m-%d %H:%M} UTC, zenith pointing, FoV ±{FOV:g}°")
    fig.canvas.draw_idle()


def step_day(d):
    s_day.set_val(int(np.clip(s_day.val + d, 0, N_DAYS)))


def save(_=None):
    for a in WIDGET_AXES:
        a.set_visible(False)
    out = OUT_DIR / f"sky_track_{base.SITE_NAME}_{current['now']:%Y%m%d_%H%M}UTC_interactive.png"
    fig.savefig(out, dpi=200, bbox_inches="tight")
    for a in WIDGET_AXES:
        a.set_visible(True)
    fig.canvas.draw_idle()
    print(f"Saved figure to {out}")


def on_key(event):
    if event.key == "right":
        step_day(1)
    elif event.key == "left":
        step_day(-1)
    elif event.key == "up":
        s_hour.set_val((s_hour.val + 0.5) % 24)
    elif event.key == "down":
        s_hour.set_val((s_hour.val - 0.5) % 24)


s_day.on_changed(update)
s_hour.on_changed(update)
b_prev.on_clicked(lambda _: step_day(-1))
b_next.on_clicked(lambda _: step_day(1))
b_save.on_clicked(save)
fig.canvas.mpl_connect("key_press_event", on_key)
fig.canvas.mpl_connect("button_release_event", lambda e: update() if e.inaxes is ax3 else None)

update()
plt.show()