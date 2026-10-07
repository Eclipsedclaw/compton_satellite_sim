# Compton Camera Satellite: Orbit and Sky-Coverage Tools

Tools for planning observations with the SJTU Compton camera, a MeV gamma-ray
payload on a commercial micro-satellite in a sun-synchronous orbit.

| File | What it shows | Runs in |
|---|---|---|
| `compton_satellite_earth_trajectory.py` | Ground track of the first orbits after launch, Earth-shadow and SAA passes | Python |
| `compton_satellite_celestial_trajectory.py` | Where the camera points on the sky: launch-day track and month-by-month circles | Python |
| `trajectory.html` | Interactive sky planner: scrub through the year, see which sources are in view and where the satellite flies over Earth | Web browser |

All three use the same orbit model and default settings, so their results agree.

---

## Orbit and assumptions

Default parameters (from the satellite provider):

| Parameter | Value |
|---|---|
| Orbit | circular, 525 km altitude |
| Inclination | 97.5° (sun-synchronous at this altitude) |
| Local time of descending node (LTDN) | 10:30 |
| Launch site | Qingdao, 36.5° N, 120.0° E |
| Launch date | 2026-11-01 (UTC) |
| Camera pointing | local zenith |
| Field of view (half-angle) | 20° |

Model:

- **Propagation:** analytic circular orbit with J2 secular terms (nodal
  precession and argument-of-latitude rate). No TLE is needed.
- **Orbit orientation:** the ascending node is placed so that the descending
  node crosses the equator at the given mean local solar time.
- **Launch time:** computed automatically as the moment the launch site lies in
  the orbital plane on a southbound pass. Only the date is set by the user.
- **Sun:** low-precision solar ephemeris; Earth's shadow is modelled as a
  cylinder (no penumbra).
- **SAA:** an approximate ellipse centred at 50° W, 26° S.

Limitations, to be stated when the plots are shown:

- "Launch" means the satellite is already in orbit directly above the site. A
  real rocket reaches orbit about 10–20 min after liftoff and a few thousand km
  downrange, so the first part of orbit 1 is schematic.
- The camera-axis circle on the sky is reliable for any date. The satellite's
  position *along* its orbit weeks or months after launch is only illustrative,
  because atmospheric drag shifts the timing. Use the operator's TLE once the
  satellite is in orbit.
- The SAA ellipse is not a flux model. For radiation estimates, use AP9/AE9
  (e.g. via SPENVIS or IRENE) or the SAA polygon from the satellite provider.
- If the satellite has no propulsion, the LTDN may drift by several minutes per
  year. Adjust `LTDN_HOURS` for later years if the provider predicts a drift.

---

## Requirements

Python 3.9 or newer with:

| Package | Needed by |
|---|---|
| `numpy` | both scripts |
| `matplotlib` | both scripts |
| `cartopy` | `compton_satellite_earth_trajectory.py` (ground-track map only) |

On Debian/Ubuntu, install them in a virtual environment (the system Python
refuses `pip install` with `externally-managed-environment`):

```bash
sudo apt install python3-full python3-venv
python3 -m venv ~/venvs/compton
source ~/venvs/compton/bin/activate
pip install numpy matplotlib cartopy
```

In VS Code, select `~/venvs/compton/bin/python` with
**Ctrl+Shift+P → Python: Select Interpreter**.

On the first run, cartopy downloads Natural Earth coastline data, which needs an
internet connection.

`trajectory.html` needs no installation.

---

## `compton_satellite_earth_trajectory.py`

Ground track and conditions of the first orbits after launch.

### Run

```bash
python compton_satellite_earth_trajectory.py
```

### Output

A report printed to the terminal:

- launch time (UTC and Beijing time) and local mean time at the site
- orbital period
- time-ordered event list: Earth-shadow entry and exit, SAA entry and exit,
  ascending-node crossings, start of each orbit
- per-orbit sunlit fraction and fraction of time in the SAA

Two figures saved in the current directory:

| File | Content |
|---|---|
| `compton_sat_first_orbits_map.png` | World map with the ground track of each orbit (solid when sunlit, dashed in shadow), minute ticks, SAA and launch site |
| `compton_sat_first_orbits_timeline.png` | Latitude versus time, with shadow and SAA intervals shaded |

### Settings (top of the file)

| Variable | Meaning |
|---|---|
| `ALT_KM`, `INC_DEG`, `LTDN_HOURS` | Orbit |
| `LAUNCH_DATE` | UTC date of launch (the time of day is computed) |
| `SITE_NAME`, `SITE_LAT`, `SITE_LON` | Launch site |
| `N_ORBITS` | Number of orbits to propagate |
| `STEP_S` | Time step [s] |
| `LABEL_EVERY_MIN` | Spacing of the minute ticks on the map |
| `SAA` | SAA ellipse: centre `lon`, `lat` and semi-axes `a`, `b` [deg] |
| `SHOW_CUTOFF` | `True` adds geomagnetic cutoff-rigidity contours (Størmer dipole approximation) to the map |
| `OUT_DIR` | Output directory (default: current directory) |

Note: the comment above `SITE_NAME` still mentions JSLC from an earlier
version; the active setting is Qingdao.

---

## `compton_satellite_celestial_trajectory.py`

Where the camera axis points on the celestial sphere.

In the sky frame, the camera axis sweeps a great circle (the orbital plane
projected onto the sky). Earth's rotation moves the ground track but not this
circle, so all orbits of one day overlap on the sky. The circle turns about 1°
per day with the Sun and returns to the same position after one year.

### Run

```bash
python compton_satellite_celestial_trajectory.py
```

By default only the launch-day figure is made. To also make the monthly figure,
uncomment `plot_monthly()` at the bottom of the file.

### Output

| File | Content |
|---|---|
| `sky_track_<SITE>_<YYYYMMDD_HHMM>UTC.png` | First `N_ORBITS` after launch on a 3D celestial sphere and an all-sky Mollweide map, with minute ticks, field-of-view band edges, the Sun and MeV sources |
| `sky_track_monthly_<SITE>_<YYYYMM>_<N>m.png` | One camera-axis circle for the 1st of each month, with the Sun's position on the same dates |

File names include the site and date, so runs for different dates do not
overwrite each other.

### Reading the plots

- **Blue circle:** directions the camera axis passes through during the day.
- **Dashed lines:** edges of the band covered by the field of view that day.
  Sources between them are seen at some time that day; sources outside are not
  seen at all that day.
- **Mollweide map:** equal-area projection with right ascension increasing to
  the left (astronomical convention). The map edge is the 12h meridian, so
  objects near RA 12h can appear at either edge.

### Settings (top of the file)

| Variable | Meaning |
|---|---|
| `SITE_NAME`, `SITE_LAT`, `SITE_LON` | Launch site |
| `LAUNCH_DATE` | UTC date of launch |
| `ALT_KM`, `INC_DEG`, `LTDN_HOURS` | Orbit |
| `N_ORBITS` | Orbits shown in the launch-day figure |
| `TICK_EVERY_MIN` | Spacing of the minute ticks |
| `N_MONTHS` | Months shown in the monthly figure |
| `FOV_HALF_DEG` | Field-of-view half-angle [deg] |
| `COORDS` | Map frame: `"equatorial"` or `"galactic"` |
| `VIEW_ELEV`, `VIEW_AZIM` | Viewing angles of the 3D sphere [deg] |
| `SOURCES` | Sources to mark: `"name": (RA, Dec)` in degrees, J2000 |
| `OUT_DIR` | Output directory (default: current directory) |

---

## `trajectory.html`

An interactive browser version of the celestial plots and of the ground-track
map. All calculations run in the browser, and it loads nothing from the
internet.

The page is split into markup, one stylesheet and plain scripts (no build step,
and it still works when opened directly from disk):

| File | Content |
|---|---|
| `trajectory.html` | Page markup; loads the files below in order |
| `css/trajectory.css` | All styles |
| `js/version.js` | `VERSION` and the version history |
| `js/config.js` | `DEFAULTS` and the saved user state `S` |
| `data/sources.js` | Source catalog (see [Source catalog](#source-catalog)) |
| `data/world.js` | World map of the ground-track page (see [World map](#world-map)) |
| `js/orbit.js` | Constants, vector math, orbit propagation, pointing |
| `js/draw-common.js` | Colours, canvas sizing, star / Sun / Galactic Center markers |
| `js/map.js` | All-sky Mollweide map |
| `js/sphere.js` | 3D celestial sphere |
| `js/coverage.js` | Year-long visibility used by the table strips |
| `js/ui.js` | Readout, settings, tabs and target, controls, PNG export |
| `js/sources.js` | Source list (catalog plus each user's changes) and the sources table |
| `js/groundtrack.js` | Ground-track page: track, Earth shadow, SAA, world map, PNG export |
| `js/main.js` | Startup, resizable panels, resize handling |

`tools/make_world_js.py` writes `data/world.js`; it is not needed on the web
server.

The scripts share one global scope, so their order in `trajectory.html`
matters: `version.js` comes first and `main.js` must stay last.

To release a new version, change `VERSION` in `js/version.js` and add a line to
the history there. The page footer shows it automatically. Saved settings are
stored per version, so a new version starts every user from `DEFAULTS`. The
source catalog is not part of the saved settings, so changing it needs no new
version.

### Use

Open the file in a browser, or serve it from a web server (see below).

- **Tabs:** the three tabs at the top of the page. The first two set where the
  camera points; the third shows the satellite over Earth.
  - **Zenith:** the camera axis stays on the local zenith, away from Earth. The
    map shows the circle the axis sweeps each orbit and the edges of the band
    seen that day.
  - **Point at a source:** the camera axis stays on one target: the Sun, any
    source in the table (the Galactic Center is one of them) or a custom RA and
    Dec. The map shades the part of the sky hidden behind Earth.
  - **Ground track:** a world map like `compton_sat_first_orbits_map.png`: the
    track of the next orbits from the selected time (solid in sunlight, dashed
    in Earth's shadow, one colour per orbit), ticks every few minutes, the
    approximate SAA, the launch site and the satellite now. The legend gives
    each orbit's sunlit and SAA fractions, and hovering over the track reads its
    time. **Go to launch** shows the first orbits after launch, as in the Python
    figure. The number of orbits (1–16) and the tick spacing are set under the
    tab.

  The map, sphere, readout and sources table follow the chosen pointing mode.
  The ground-track page keeps the pointing mode for when you return to the sky.
- **Date and time sliders:** move through the year after launch. Buttons step by
  one day; **Play the year** animates the circle turning with the Sun.
- **Keyboard:** ← / → change the day, ↑ / ↓ change the time by 30 min. When a
  mode tab has focus, ← / → switch between the tabs instead.
- **Map and sphere:** the all-sky map shows coordinates on hover; the 3D sphere
  rotates by dragging.
- **Readout panel:** UTC and Beijing time, days since launch, sub-satellite
  point, the Sun's angle from the camera axis, and sources in the field of view.
  In **Zenith** mode it also shows where the camera axis points and how many
  sources are in today's band. In **Point at a source** mode it shows the
  target, whether Earth blocks it now and the fraction of the orbit it is clear
  of Earth. On the **Ground track** page it shows the orbit number since
  launch, the local solar time below the satellite, and when it next enters or
  leaves Earth's shadow and the SAA.
- **Sources table:** the current status of each source and a strip showing on
  which days of the year it is in view. Click a strip to jump to that day, and
  a column heading to sort (a third click returns to the catalog order).
  **Filter by name** narrows the list; spaces, hyphens and plus signs are
  ignored, so `cyg x1` finds Cyg X-1. A dotted underline marks a source with a
  note: hover over the name to read it. Sources can be added (RA and Dec in
  degrees) or removed; **Restore** brings back removed catalog sources.
- **Settings panel:** orbit, field of view, launch site, launch date and map
  coordinates. A warning appears if the inclination is not sun-synchronous for
  the chosen altitude.
- **Save PNG:** downloads the current map and sphere as
  `sky_track_<SITE>_<YYYYMMDD_HHMM>UTC.png`. On the ground-track page it
  downloads the world map, with a title and legend like the Python figure, as
  `ground_track_<SITE>_<YYYYMMDD_HHMM>UTC.png`.

Settings, the chosen tab and target, the ground-track options, and each user's
added and removed sources are stored in their browser (`localStorage`) and are
kept between visits.
**Restore defaults** resets them. The source catalog itself is read from
`data/sources.js` on every visit.

To change the defaults for all users, edit the `DEFAULTS` block in
`js/config.js`. To add, change or remove sources for all users, edit
`data/sources.js`.

### Source catalog

`data/sources.js` holds the sources every user sees, one record per line:

```js
{"name": "Crab", "ra": 83.633, "dec": 22.015, "fBat": 2300, "fLat": 16, "note": "F_LAT: synchrotron nebula component only"},
```

| Field | Meaning |
|---|---|
| `name` | Unique name. Each user's removed sources are remembered by name. |
| `ra`, `dec` | J2000 coordinates [deg] |
| `fBat` | Swift-BAT 14–195 keV energy flux [10⁻¹¹ erg cm⁻² s⁻¹], or `null` |
| `fLat` | Fermi-LAT 4FGL-DR2 energy flux [10⁻¹¹ erg cm⁻² s⁻¹], or `null` |
| `note` | Optional remark, shown when hovering over the source name |

Records with a missing or repeated name, or without valid coordinates, are
skipped with a warning in the browser console. Extra fields are kept and
ignored, so records can carry more information (source class, references,
other bands) before the page shows it.

The catalog is a script rather than a `.json` file because a page opened from
disk may not read other local files, while it can always load a script. The
array itself is plain JSON, so other programs can read it, or write it from a
larger source database (one record per line keeps changes easy to review):

```python
import json, re

text = open('data/sources.js').read()
m = re.search(r'^const SOURCE_CATALOG\s*=\s*(\[.*\])\s*;', text, re.M | re.S)
records = json.loads(m.group(1))            # a list of dicts

# ... add or update records, for example from a database or a CSV file ...

rows = ',\n'.join('  ' + json.dumps(r) for r in records)
open('data/sources.js', 'w').write(text[:m.start()] + f'const SOURCE_CATALOG = [\n{rows}\n];\n')
```

The rest of the page only reads the list built by `buildSourceList()` in
`js/sources.js`, so serving the catalog from a database later means changing
that one function.

### World map

`data/world.js` (45 KB) holds the land polygons and country borders of
[Natural Earth](https://www.naturalearthdata.com) at 1:110m, the same public
domain data that cartopy draws in `compton_satellite_earth_trajectory.py`,
rounded to 0.1°. To rebuild it, for example after changing the resolution in
the script, run

```bash
python tools/make_world_js.py
```

It reads the files from cartopy's data directory (run the Python ground-track
script once if cartopy has not downloaded them yet), or from a Natural Earth
directory given as an argument. It needs `pyshp`, which is installed with
cartopy.

The ground track uses the same model as the Python script: 10 s steps, a
cylindrical Earth shadow and the same SAA ellipse (`SAA` at the top of
`js/groundtrack.js`). For the default settings, the two give the same track,
shadow and SAA passes.

### Serve with nginx

```bash
sudo mkdir -p /var/www/trajectory
sudo cp -r trajectory.html compsat.svg css js data /var/www/trajectory/
sudo chmod -R u=rwX,go=rX /var/www/trajectory
```

`/etc/nginx/sites-available/trajectory`:

```nginx
server {
    listen 8081;
    listen [::]:8081;
    server_name _;

    root /var/www/trajectory;
    index trajectory.html;

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }
}
```

`no-cache` makes browsers check with the server on each visit (a quick "not
modified" reply when nothing changed), so users always get the latest CSS and
JS after an update.

Enable and check:

```bash
sudo ln -s /etc/nginx/sites-available/trajectory /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -I http://localhost:8081/
```

nginx runs as a system service, so the page stays online after the terminal is
closed and after a reboot (check with `systemctl is-enabled nginx`).

If the server is behind a router, add a port-forwarding rule on the router:
external TCP 8081 → the server's internal IP, port 8081. Reserve the server's
internal IP in the router's DHCP settings so the rule keeps working.

### Access through SSH

Users with an SSH account on the server can reach the page without any port
being open to the network:

```bash
ssh -N -L 8081:localhost:8081 username@<server-address>
```

Then open <http://localhost:8081/>. The page is available while the command is
running.

To update the page, copy `trajectory.html`, `compsat.svg`, `css/`, `js/` and
`data/` over the old ones. No nginx restart is needed.

---

## Related script

`compton_sky_exposure.py` (not part of this set) computes exposure maps and the
daily equivalent on-axis exposure of each source, including time lost to the
SAA. Use it when numbers, rather than sky coverage, are needed.