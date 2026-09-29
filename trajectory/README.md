# Compton Camera Satellite: Orbit and Sky-Coverage Tools

Tools for planning observations with the SJTU Compton camera, a MeV gamma-ray
payload on a commercial micro-satellite in a sun-synchronous orbit.

| File | What it shows | Runs in |
|---|---|---|
| `compton_satellite_earth_trajectory.py` | Ground track of the first orbits after launch, Earth-shadow and SAA passes | Python |
| `compton_satellite_celestial_trajectory.py` | Where the camera points on the sky: launch-day track and month-by-month circles | Python |
| `trajectory.html` | Interactive sky planner: scrub through the year, see which sources are in view | Web browser |

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

An interactive browser version of the celestial plots. It is a single
self-contained file: all calculations run in the browser, and it loads nothing
from the internet.

### Use

Open the file in a browser, or serve it from a web server (see below).

- **Date and time sliders:** move through the year after launch. Buttons step by
  one day; **Play the year** animates the circle turning with the Sun.
- **Keyboard:** ← / → change the day, ↑ / ↓ change the time by 30 min.
- **Map and sphere:** the all-sky map shows coordinates on hover; the 3D sphere
  rotates by dragging.
- **Readout panel:** UTC and Beijing time, days since launch, sub-satellite
  point, the Sun's angle from the camera axis, and sources in the field of view.
- **Sources table:** the current status of each source and a strip showing on
  which days of the year it is inside the field-of-view band. Click a strip to
  jump to that day. Sources can be added (RA and Dec in degrees) or removed.
- **Settings panel:** orbit, field of view, launch site, launch date and map
  coordinates. A warning appears if the inclination is not sun-synchronous for
  the chosen altitude.
- **Save PNG:** downloads the current map and sphere as
  `sky_track_<SITE>_<YYYYMMDD_HHMM>UTC.png`.

Settings and added sources are stored in each user's browser (`localStorage`)
and are kept between visits. **Restore defaults** resets them.

To change the defaults for all users, edit the `DEFAULTS` block near the top of
the `<script>` section.

### Serve with nginx

```bash
sudo mkdir -p /var/www/trajectory
sudo cp trajectory.html /var/www/trajectory/
sudo chmod 755 /var/www/trajectory
sudo chmod 644 /var/www/trajectory/trajectory.html
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
        try_files $uri $uri/ =404;
    }
}
```

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

To update the page, copy the new file over the old one. No nginx restart is
needed.

---

## Related script

`compton_sky_exposure.py` (not part of this set) computes exposure maps and the
daily equivalent on-axis exposure of each source, including time lost to the
SAA. Use it when numbers, rather than sky coverage, are needed.