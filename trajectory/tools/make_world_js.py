#!/usr/bin/env python3
"""
Write data/world.js, the world map of the sky planner's ground-track page.

It converts the Natural Earth 1:110m land polygons and country borders, the same
files cartopy uses for compton_satellite_earth_trajectory.py, into compact JS
arrays the page loads like any other script (so it also works from disk).

Run:
    python tools/make_world_js.py                 # Natural Earth files from cartopy's data directory
    python tools/make_world_js.py /path/to/natural_earth

Needs pyshp, which is installed with cartopy. If cartopy has never drawn a map on this
computer, run compton_satellite_earth_trajectory.py once first, so it downloads
the files, or download them from https://www.naturalearthdata.com.
"""

import sys
from pathlib import Path

import shapefile  # pyshp

STEP = 0.1  # coordinate resolution of the output [deg]
LAND = "physical/ne_110m_land"
BORDERS = "cultural/ne_110m_admin_0_boundary_lines_land"
OUT = Path(__file__).resolve().parent.parent / "data" / "world.js"

HEADER = f"""\
// World map of the ground-track page: Natural Earth 1:110m land polygons and country
// borders (public domain, https://www.naturalearthdata.com).
// Written by tools/make_world_js.py; run it again rather than editing this file.
//
// Each ring or line is [lon0, lat0, dlon1, dlat1, ...] in units of {STEP} deg: the
// first point, then the step to each following point.

"""


def natural_earth_dir():
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    import cartopy
    return Path(cartopy.config["data_dir"]) / "shapefiles" / "natural_earth"


def encode(points):
    """First point, then steps, in units of STEP; repeated points are dropped."""
    out, last = [], None
    for lon, lat in points:
        q = (round(lon / STEP), round(lat / STEP))
        if q == last:
            continue
        out += q if last is None else (q[0] - last[0], q[1] - last[1])
        last = q
    return out


def parts(path):
    """Encoded rings (polygons) or lines (polylines) of a shapefile."""
    for shape in shapefile.Reader(str(path)).shapes():
        idx = list(shape.parts) + [len(shape.points)]
        for a, b in zip(idx[:-1], idx[1:]):
            enc = encode(shape.points[a:b])
            if len(enc) >= 4:  # at least two distinct points
                yield enc


def js_array(name, rows):
    body = ",\n".join("[" + ",".join(map(str, r)) + "]" for r in rows)
    return f"const {name} = [\n{body}\n];\n"


def main():
    ne = natural_earth_dir()
    land, borders = list(parts(ne / LAND)), list(parts(ne / BORDERS))
    OUT.write_text(HEADER + js_array("WORLD_LAND", land) + "\n" + js_array("WORLD_BORDERS", borders))
    n = sum(len(r) for r in land + borders) // 2
    print(f"Wrote {OUT}: {len(land)} land rings, {len(borders)} border lines, "
          f"{n} points, {OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
