# Compton Camera Sky Planner

A planning tool for the SJTU Compton camera, a MeV gamma-ray instrument on a
small satellite in a sun-synchronous orbit. Move through the first year after
launch and see where the camera looks on the sky, which sources it can observe
and when, and where the satellite is over Earth.

**Open the planner:**
<https://eclipsedclaw.github.io/compton_satellite_sim/trajectory/trajectory.html>

You can also download this folder and open `trajectory.html` in a web browser.
There is nothing to install, and the page works offline: all calculations run
in your browser.

---

## Three views

The tabs at the top of the page switch between three views. They share the
date and time controls, the status panel and the settings.

**Zenith.** The camera looks straight up, away from Earth. Once per orbit, its
axis sweeps a great circle across the sky: the blue circle on the map. The
dashed lines on either side show how far the field of view reaches. A source
between them is in view at some time that day; a source outside them is not
seen at all that day. The circle turns with the Sun by about 1° a day and is
back where it started after a year, so every part of the sky is in view on
some days of the year.

**Point at a source.** The camera stays on one target: the Sun, any source in
the table (the Galactic Center is one of them), or a position you enter. For a
position, choose *Custom RA/Dec…*, type RA and Dec in degrees and press Enter.
Earth can block the target for part of each orbit; the grey area on the map is
the part of the sky hidden behind Earth at the selected moment.

**Ground track.** A world map of where the satellite flies during the next
orbits from the selected time, one colour per orbit. The line is solid where
the satellite is in sunlight and dashed where it is in Earth's shadow. Dots
mark every 10 minutes, labelled with the minutes from the selected time (or
from launch). The red ellipse is the South Atlantic Anomaly (SAA), a region of
strong particle radiation. The star is the launch site, and the satellite
symbol shows the satellite at the selected time.

The legend gives each orbit's share of time in sunlight and in the SAA, and
hovering over the track shows when the satellite passes there. Under the tab
you can choose how many orbits to show (1 to 16) and the spacing of the time
dots. **Go to launch** shows the first orbits after launch.

## Moving through time

- The **Date** and **Time (UTC)** sliders select any moment in the year after
  the launch date.
- **−1 day** and **+1 day** step by a day, and **Play the year** runs through
  the year day by day.
- **Go to launch** jumps to the moment of launch.
- On the keyboard, ← and → change the day, and ↑ and ↓ change the time by 30
  minutes. While a tab at the top has keyboard focus (in most browsers, right
  after you click it), ← and → switch tabs instead; click anywhere else on the
  page to go back to changing the day.

## Reading the sky map

The large map shows the whole sky in an equal-area (Mollweide) projection.
Right ascension increases to the left, as on the sky seen from Earth. The left
and right edges are both at RA 12h, so a source near 12h can appear at either
edge.

- The orange circle is the field of view at the selected moment, and the blue
  dot is the direction the camera points.
- Sources from the table are drawn as stars: orange when in view now, blue when
  inside today's band (Zenith) or inside the field of view but behind Earth
  (Point at a source).
- The legend below the map explains the other lines and symbols, including the
  Sun and the Galactic Center.
- Hover over the map to read the coordinates (equatorial and Galactic) and the
  angle from the camera axis.
- The globe to the right shows the same sky in 3D; drag it to turn it. Drag the
  bar between the map and the globe to resize them, or double-click the bar to
  reset.

## The status panel

Below the map, the status panel gives the selected time in UTC and Beijing
time, the days since launch and the point on Earth below the satellite. It also
shows, depending on the view:

| View | Also shown |
|---|---|
| Zenith | Where the camera points (RA, Dec), the Sun's angle from it, and how many sources are in today's band and in view now |
| Point at a source | The target and its position, the Sun's angle from it, whether Earth is inside the field of view, whether Earth blocks the target now, and for what share of the current orbit the target is clear of Earth |
| Ground track | The orbit number since launch, the local solar time on the ground below, and when the satellite next enters or leaves Earth's shadow and the SAA |

In the two sky views, the sources in the field of view at that moment are
listed below the panel.

## Sources

The table at the bottom of the sky views lists the sources and when they can be
observed. The strips and numbers follow the chosen view: the zenith survey, or
the chosen target.

| Column | Meaning |
|---|---|
| Source | Name. A dotted underline means there is a note; hover over the name to read it. |
| RA, Dec | Position (J2000), in degrees |
| F<sub>BAT</sub>, F<sub>LAT</sub> | Energy flux measured by Swift-BAT (14–195 keV) and Fermi-LAT (4FGL-DR2), in 10⁻¹¹ erg cm⁻² s⁻¹, from Tsuji et al. 2021, ApJ 916, 28 |
| Now | At the selected moment: *in view now*, *behind Earth*, *in band today* (Zenith), or the angle from the camera axis |
| Days in view over the year | A strip covering the year after launch. A filled day means the source is in view, and not behind Earth, at some time that day; darker means longer. The orange line marks the selected day; click the strip to jump to another day. |
| Days | Number of days of the year with some time in view |
| Time in view | Average share of the time the source is in view |

Click a column heading to sort by it, click again to reverse the order, and
click a third time to return to the original order. **Filter by name** narrows
the list; spaces, hyphens and plus signs are ignored, so `cyg x1` finds
Cyg X-1.

### Your own sources

Add a source with the form below the table: a name, RA and Dec in degrees, and,
if you like, the two fluxes. It appears in the table marked *added*, and you
can choose it as a target. The ✕ at the end of a row removes a source from your
list. Shared sources you removed come back with **Restore**.

Your additions and removals are kept only in your own browser. They are not
sent anywhere: other people do not see them, and the shared source list does
not change. They are still there on your next visit with the same browser, but
you start again from the shared list if you:

- open the page in another browser, on another computer or in a private window,
- clear your browser's data for the page,
- press **Restore defaults** in the settings, or
- open a newer version of the page, since each version starts from the defaults.

To suggest a source for the shared list, see
[Questions and feedback](#questions-and-feedback).

## Settings

Open **Orbit, instrument and launch settings**, change the values and press
**Apply settings**.

- **Orbit:** altitude, inclination, and the local solar time at which the
  satellite crosses the equator heading south (the descending node). If the
  inclination does not keep the orbit sun-synchronous at that altitude, a note
  warns that the crossing time will drift over the year.
- **Launch:** the launch site's name, latitude and longitude, and the launch
  date (UTC). The planner works out the launch time on that date (see
  [How the planner works](#how-the-planner-works)).
- **Instrument and display:** the half-angle of the field of view, and whether
  the sky map uses equatorial (RA, Dec) or Galactic (l, b) coordinates.

**Restore defaults** returns everything to the starting state: the settings,
the view and your own sources.

## Saving a picture

**Save PNG** downloads the current view as an image. In the sky views, it saves
the sky map and the globe as `sky_track_<site>_<YYYYMMDD_HHMM>UTC.png`. In the
Ground track view, it saves the world map, with a title and a legend, as
`ground_track_<site>_<YYYYMMDD_HHMM>UTC.png`.

## Default orbit

The starting settings, from the satellite provider:

| Parameter | Value |
|---|---|
| Orbit | Circular, 525 km altitude (one orbit takes about 95 minutes) |
| Inclination | 97.5° (sun-synchronous at this altitude) |
| Equator crossing, heading south | 10:30 local solar time |
| Launch site | Qingdao, 36.5° N, 120.0° E |
| Launch date | 2026-11-01 (UTC) |
| Field of view | 20° half-angle |

## How the planner works

The planner calculates the orbit itself, so no orbital elements (TLE) are
needed.

- The orbit is circular. It includes the main effect of Earth's flattening,
  which turns the orbit plane by about 1° a day, so that the orbit keeps the
  same orientation to the Sun.
- The orbit is placed so that the satellite crosses the equator heading south
  at the chosen local solar time.
- The launch time is the moment on the launch date when the launch site lies in
  the orbit plane, with the satellite heading south.
- The Sun's position is a simple approximation. Earth's shadow is treated as a
  cylinder, without the partial shadow at its edge.
- Earth hides a circle of the sky around the point straight below the
  satellite: about 67.5° in radius at 525 km.
- The SAA is an ellipse centred at 50° W, 26° S, reaching 45° east and west and
  18° north and south of its centre.

### Keep in mind

- "Launch" means the satellite is already in orbit directly above the launch
  site. A real rocket reaches orbit 10 to 20 minutes after liftoff and a few
  thousand kilometres downrange, so the start of the first orbit is only
  schematic.
- The camera's circle on the sky is reliable for any date. The satellite's
  position *along* its orbit weeks or months after launch is only illustrative,
  because atmospheric drag changes the timing. Once the satellite is in orbit,
  use the operator's orbital elements (TLE).
- The SAA ellipse is not a radiation model. For radiation estimates, use AP9/AE9
  (for example through SPENVIS or IRENE) or the SAA outline from the satellite
  provider.
- If the satellite has no propulsion, its equator crossing time may drift by
  several minutes per year. If the provider predicts a drift, change
  *Descending node, local time* in the settings for later dates.

## Questions and feedback

Questions, bug reports and suggestions, including sources to add to the shared
list, are welcome. Open an issue at
<https://github.com/Eclipsedclaw/compton_satellite_sim/issues>, or use the
email address at the bottom of the page.

---

## For maintainers

This section is for whoever updates or hosts the page.

### Files

The page is plain HTML, CSS and JavaScript with no build step. It works from
disk and from any web server.

| File | Content |
|---|---|
| `trajectory.html` | Page markup; loads the files below in this order |
| `css/trajectory.css` | All styles |
| `js/version.js` | Version number and version history |
| `js/config.js` | Default settings (`DEFAULTS`) and each user's saved settings |
| `data/sources.js` | Shared source list |
| `data/world.js` | World map of the Ground track view |
| `js/orbit.js` | Constants, vector maths, orbit and pointing |
| `js/draw-common.js` | Colours, canvas sizing, markers |
| `js/map.js` | All-sky map |
| `js/sphere.js` | 3D globe of the sky |
| `js/coverage.js` | Year-long visibility for the table strips |
| `js/ui.js` | Status panel, settings, tabs and target, controls, sky PNG |
| `js/sources.js` | Source list and sources table |
| `js/groundtrack.js` | Ground track view and its PNG |
| `js/main.js` | Startup and resizing |

The scripts share one global scope, so their order in `trajectory.html`
matters: `version.js` comes first and `main.js` stays last.
`tools/make_world_js.py` rebuilds `data/world.js` (see below); the web server
does not need it.

### Updating the shared source list

`data/sources.js` holds the sources everyone sees, one record per line:

```js
{"name": "Crab", "ra": 83.633, "dec": 22.015, "fBat": 2300, "fLat": 16, "note": "F_LAT: synchrotron nebula component only"},
```

| Field | Meaning |
|---|---|
| `name` | Unique name. Each user's removed sources are remembered by name. |
| `ra`, `dec` | J2000 coordinates, in degrees |
| `fBat` | Swift-BAT 14–195 keV energy flux, in 10⁻¹¹ erg cm⁻² s⁻¹, or `null` |
| `fLat` | Fermi-LAT 4FGL-DR2 energy flux, in 10⁻¹¹ erg cm⁻² s⁻¹, or `null` |
| `note` | Optional remark, shown when hovering over the name |

- Changes reach every user on their next visit, and they keep their own
  sources. No new version is needed.
- Records without a unique name or valid coordinates are skipped, with a
  warning in the browser console. Extra fields are kept and ignored, so records
  can carry more information (source class, references, other bands) before the
  page shows it.
- The list is plain JSON (double quotes, no comments, no comma after the last
  record), so it can also be produced from a spreadsheet or a database. It is a
  `.js` file rather than `.json` because a page opened from disk cannot read
  local data files but can load scripts.

### Defaults and versions

- The starting settings for new users are `DEFAULTS` in `js/config.js`.
- To release a new version, change `VERSION` in `js/version.js` and add a line
  to the history there; the page footer shows it. Users' saved settings,
  including their own sources, are kept per version, so a new version starts
  everyone from the defaults.
- The SAA ellipse is `SAA` at the top of `js/groundtrack.js`.

### World map data

`data/world.js` (45 KB) holds the land and country borders of
[Natural Earth](https://www.naturalearthdata.com) at 1:110m (public domain),
rounded to 0.1°. To rebuild it, for example at another resolution, download the
Natural Earth files and run `python tools/make_world_js.py <folder>`; it needs
`pyshp` (`pip install pyshp`).

### Hosting

The public copy is served by GitHub Pages from this repository and updates
after changes are pushed to the branch GitHub Pages publishes. Browsers may
keep the old files for up to about 10 minutes.

To host it on your own server with nginx:

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
modified" reply when nothing has changed), so users always get the latest files
after an update.

Enable the site and check it:

```bash
sudo ln -s /etc/nginx/sites-available/trajectory /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -I http://localhost:8081/
```

nginx runs as a system service, so the page stays online after the terminal is
closed and after a reboot (check with `systemctl is-enabled nginx`). If the
server is behind a router, forward external TCP port 8081 to the server's
internal IP, port 8081, and reserve that IP in the router's DHCP settings so
the rule keeps working.

People with an SSH account on the server can reach the page without any port
being open to the network:

```bash
ssh -N -L 8081:localhost:8081 username@<server-address>
```

Then open <http://localhost:8081/>; the page is available while the command
runs.

To update the server copy, copy `trajectory.html`, `compsat.svg`, `css/`, `js/`
and `data/` over the old ones. No nginx restart is needed.
