"""Build the London Gatwick (LGW) map geometry from the OpenStreetMap-derived layout.

Usage: python3 tools/build_lgw_geo.py data/egkk-layout.json src/geo-lgw.json [debug.svg]

Input: data/egkk-layout.json, the EGKK layout (taxiway graph, stands with headings,
aprons, building footprints) generated from OpenStreetMap by the ultimate-atc
project's importer. Data (c) OpenStreetMap contributors, ODbL 1.0.

Output, in world units (1 unit = 1.34 m, the scale the Frame is tuned for):
  basemap  airfield, paved (aprons + taxiways) and building footprints ('bldNN'
           = extruded NN units high in 3D)
  polys    terminal, pier, zone and walkway outlines cut from the real footprints
  stands   every stand (centre stands only for MARS groups) with heading and,
           for contact stands, the pier and the gate point on the pier edge
  runways, pois, places
The world is rotated so runway 08R/26L runs left to right (north is 12.3 degrees
clockwise of 'up'); terminal piers then line up with the axes.
"""
import json
import math
import sys

from shapely.geometry import LineString, Point, Polygon, box, mapping
from shapely.ops import nearest_points, unary_union

LAT0, LON0 = 51.1487, -0.1857
KX, KY = math.cos(math.radians(LAT0)) * 111320.0, 110574.0


def proj(lat, lon):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


# 08R/26L thresholds (OurAirports) define the rotation
_a, _b = proj(51.145103, -0.212345), proj(51.151493, -0.165992)
ANG = math.atan2(_b[1] - _a[1], _b[0] - _a[0])
CA, SA = math.cos(-ANG), math.sin(-ANG)
NORTH_DEG = -math.degrees(ANG)   # world heading of true north, clockwise from 'up'


def R(lat, lon):
    x, y = proj(lat, lon)
    return (x * CA - y * SA, x * SA + y * CA)


SCALE, OX, OY = 1.34, 2300.0, 1800.0     # metres per unit, metre offsets
WW, WH = round(4650 / SCALE), round(2500 / SCALE)


def W(x, y):
    return ((x + OX) / SCALE, (y + OY) / SCALE)


def wgeom(g):
    """metres geometry -> world units geometry"""
    from shapely.affinity import affine_transform
    return affine_transform(g, [1 / SCALE, 0, 0, 1 / SCALE, OX / SCALE, OY / SCALE])


L = json.load(open(sys.argv[1]))
nodes = {n[0]: R(n[1], n[2]) for n in L['nodes']}


def bpoly(i):
    return Polygon([R(a, o) for a, o in L['buildings'][i]['polygon']]).buffer(0)


def name_idx(name):
    for i, b in enumerate(L['buildings']):
        if b['name'] == name:
            return i
    raise KeyError(name)


# ------------------------------------------------------------- terminals
NT_I, ST_I, LOBBY_I = name_idx('North Terminal'), name_idx('South Terminal'), name_idx('North Terminal Entrance Lobby')
NT, ST = bpoly(NT_I), bpoly(ST_I)
LOBBY = bpoly(LOBBY_I)


def clip(g, *boxes):
    return g.intersection(unary_union([box(*b) for b in boxes])).buffer(0)


def biggest(g):
    if g.geom_type == 'MultiPolygon':
        return max(g.geoms, key=lambda p: p.area)
    return g


pieces = {}
# North Terminal: Pier 5 runs north along the west side, Pier 4 east along the south
# side, Pier 6 sits south across the taxiway and is reached by the air bridge.
pieces['NT Pier 5'] = clip(NT, (600, -1530, 729, -955))
pieces['NT Pier 4'] = clip(NT, (729, -975, 1520, -900), (1100, -1080, 1520, -975))
pieces['Pier 6 air bridge'] = clip(NT, (729, -953, 775, -730))
pieces['NT Pier 6'] = clip(NT, (420, -730, 880, -640))
# the entrance lobby (east, landside) joins the main building across the forecourt link
nt_main = biggest(clip(NT.union(LOBBY).union(box(900, -1212, 926, -1170)), (729, -1300, 1030, -955)).difference(pieces['NT Pier 4']).buffer(0))
# South Terminal: Pier 2 runs west, Pier 3 is the satellite reached by a bridge,
# Pier 1 sits at the south end of the main building.
pieces['ST Pier 1'] = clip(ST, (1590, -400, 1730, -200))
pieces['ST Pier 2'] = clip(ST, (1100, -520, 1602, -420))
pieces['ST Pier 3'] = biggest(clip(ST, (1300, -880, 1505, -650)))
pieces['Pier 3 bridge'] = biggest(clip(ST, (1440, -760, 1610, -620)).difference(pieces['ST Pier 3']).buffer(0))
st_main = biggest(clip(ST, (1590, -700, 1850, -200)).difference(pieces['ST Pier 1']).difference(pieces['Pier 3 bridge']).buffer(0))

# Landside sits on the east (forecourt, station, shuttle) side of each main building.
SPLIT = {'NT': (nt_main, 862, 846), 'ST': (st_main, 1762, 1744)}
for t, (main, xl, xs) in SPLIT.items():
    b = main.bounds
    pieces[t + ' Landside'] = clip(main, (xl, b[1] - 1, b[2] + 1, b[3] + 1))
    pieces[t + ' Airside'] = clip(main, (b[0] - 1, b[1] - 1, xs, b[3] + 1))
    pieces[t + ' main'] = main
for k, v in pieces.items():
    pieces[k] = biggest(v.simplify(0.6))
SEC = {'NT': (846, -1268, 862, -1010), 'ST': (1744, st_main.bounds[1] + 30, 1762, -420)}

# ------------------------------------------------------------- stands
PIER_OF = lambda sid: (None if not sid[0].isdigit() else
                       'ST Pier 1' if sid.endswith('M') else
                       'ST Pier 2' if 10 <= int(''.join(c for c in sid if c.isdigit())) <= 28 else
                       'ST Pier 3' if 31 <= int(''.join(c for c in sid if c.isdigit())) <= 38 else
                       'NT Pier 4' if 46 <= int(''.join(c for c in sid if c.isdigit())) <= 54 else
                       'NT Pier 5' if 551 <= int(''.join(c for c in sid if c.isdigit())) <= 569 else
                       'NT Pier 6' if 681 <= int(''.join(c for c in sid if c.isdigit())) <= 698 else None)
ids = {s['id'] for s in L['stands']}
stands = []
for s in L['stands']:
    sid = s['id']
    base = sid.rstrip('LRWE') if sid[-1] in 'LRWE' and not sid.endswith('M') else sid
    if base != sid and base in ids:
        continue                       # MARS L/R (or E/W) sub-stand of a centre stand
    x, y = R(*s['pos'])
    pier = PIER_OF(sid)
    o = {'id': sid, 'x': x, 'y': y, 'h': (s['heading'] + NORTH_DEG) % 360, 'size': max(30, min(68, s.get('spacingM', 45) * 0.95)), 'pier': pier}
    if pier:
        poly = pieces[pier]
        q = nearest_points(poly.exterior, Point(x, y))[0]
        o['gx'], o['gy'] = q.x, q.y
        o['dist'] = q.distance(Point(x, y))
    stands.append(o)

# ------------------------------------------------------------- runways
RWY = [('Runway 08R/26L', (51.145103, -0.212345), (51.151493, -0.165992), '08R|26L', 'RUNWAY 08R/26L · 3,316 m'),
       ('Runway 08L/26R', (51.146893, -0.212599), (51.151825, -0.176795), '08L|26R', 'RUNWAY 08L/26R · 2,565 m · STANDBY')]
runways = []
for n, a, b, ends, lab in RWY:
    p, q = W(*R(*a)), W(*R(*b))
    runways.append({'name': n, 'line': [round(p[0], 1), round(p[1], 1), round(q[0], 1), round(q[1], 1)], 'ends': ends, 'label': lab})

# ------------------------------------------------------------- basemap
twy = []
for e in L['edges']:
    if e[0] in nodes and e[1] in nodes:
        twy.append(LineString([nodes[e[0]], nodes[e[1]]]).buffer(11.5 if e[3] == 'taxiway' else 24, cap_style=1))
aprons = [Polygon([R(a, o) for a, o in ar['polygon']]).buffer(0) for ar in L['areas']]
pav = [Polygon([R(*q) for q in p['points']]).buffer(0) for p in L['pavement']]
paved = unary_union(twy + aprons + pav).buffer(3).buffer(-3).simplify(1.2)
airfield = unary_union([g.buffer(140) for g in twy] + [a.buffer(70) for a in aprons]).buffer(160).buffer(-160).simplify(6)

HEIGHT = {'Sofitel Gatwick': 30, 'Hampton by Hilton London Gatwick Airport': 22, 'Premier Inn Gatwick North Terminal': 20,
          'Control Tower': 44, 'Gatwick Short Stay North 5': 14, 'Car Park 6': 14, 'Concorde House': 12,
          'Hangar 6': 18, 'Hangar 7': 18, 'Hangar 9': 18, 'Hangar 11': 20, 'TCR UK LGW': 9, 'Cargo Terminal': 11, 'Gatwick Airport Fire Station': 8}
SKIP = {NT_I, ST_I, LOBBY_I, name_idx('Gatwick Short Stay North 5'), name_idx('Car Park 6')}   # drawn as terminal / car-park units
blds = {}
for i, b in enumerate(L['buildings']):
    if i in SKIP:
        continue
    p = bpoly(i)
    if p.is_empty or p.area < 60:
        continue
    h = HEIGHT.get(b['name']) or (5 if p.area < 600 else 7 if p.area < 2500 else 9)
    blds.setdefault(h, []).append(p.simplify(0.8))


def to_path(g):
    """world-unit SVG path, integer coordinates, all rings"""
    g = wgeom(g)
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    d = ''
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            pts, last = [], None
            for x, y in ring.coords[:-1]:
                q = (round(x), round(y))
                if q != last:
                    pts.append(q)
                last = q
            if len(pts) < 3:
                continue
            d += 'M' + ' L'.join('%d,%d' % q for q in pts) + 'Z'
    return d


basemap = [{'type': 'airfield', 'd': to_path(airfield)}, {'type': 'paved', 'd': to_path(paved)}]
for h in sorted(blds):
    basemap.append({'type': 'bld%d' % h, 'd': to_path(unary_union(blds[h]))})

# ------------------------------------------------------------- POIs and places
pois = []
for n, lab, kind in [('Sofitel Gatwick', 'Sofitel', 'Hotel'), ('Premier Inn Gatwick North Terminal', 'Premier Inn', 'Hotel'),
                     ('Hampton by Hilton London Gatwick Airport', 'Hampton by Hilton', 'Hotel'), ('Cargo Terminal', 'Cargo Terminal', 'Cargo'),
                     ('Control Tower', 'Control Tower', 'Tower'), ('Hangar 6', 'Hangar 6', 'Hangar'), ('Hangar 7', 'Hangar 7', 'Hangar'),
                     ('Hangar 9', 'Hangar 9', 'Hangar'), ('Hangar 11', 'Hangar 11', 'Hangar'), ('Gatwick Airport Fire Station', 'Fire station', 'Fire')]:
    p = bpoly(name_idx(n))
    c, bb = p.centroid, wgeom(p).bounds
    x, y = W(c.x, c.y)
    pois.append({'name': n, 'label': lab, 'kind': kind, 'x': round(x, 1), 'y': round(y, 1), 'box': [round(v, 1) for v in (bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])]})
# Gatwick Airport railway station (51.1565, -0.1610) sits east of the South Terminal.
places = []
for n, lat, lon in [('Charlwood', 51.1547, -0.2236), ('Horley', 51.1740, -0.1601), ('Lowfield Heath', 51.1390, -0.1870)]:
    x, y = W(*R(lat, lon))
    places.append({'name': n, 'x': round(min(max(x, 120), WW - 120), 1), 'y': round(min(max(y, 60), WH - 60), 1)})
stx, sty = R(51.1565, -0.1610)


def wpoly(g):
    g = wgeom(g)
    return [[round(x, 1), round(y, 1)] for x, y in g.exterior.coords[:-1]]


def wbox(g):
    b = wgeom(g).bounds
    return [round(b[0], 1), round(b[1], 1), round(b[2] - b[0], 1), round(b[3] - b[1], 1)]


out = {
    'scale': SCALE, 'origin': [OX, OY], 'world': {'w': WW, 'h': WH}, 'northDeg': round(NORTH_DEG, 2),
    'basemap': basemap,
    'polys': {k: {'pg': wpoly(v), 'box': wbox(v)} for k, v in pieces.items()},
    'security': {k: [round(v, 1) for v in (W(b[0], b[1]) + ((b[2] - b[0]) / SCALE, (b[3] - b[1]) / SCALE))] for k, b in SEC.items()},
    'stands': [dict(s, x=round(W(s['x'], s['y'])[0], 1), y=round(W(s['x'], s['y'])[1], 1), size=round(s['size'] / SCALE, 1), h=round(s['h'], 1),
                    **({'gx': round(W(s['gx'], s['gy'])[0], 1), 'gy': round(W(s['gx'], s['gy'])[1], 1), 'dist': round(s['dist'], 1)} if s.get('pier') else {})) for s in stands],
    'runways': runways, 'pois': pois, 'places': places,
    'station': [round(v, 1) for v in W(stx, sty)],
    'carparks': {n: wbox(bpoly(name_idx(n))) for n in ('Gatwick Short Stay North 5', 'Car Park 6')},
}
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print('world', WW, 'x', WH, 'northDeg', round(NORTH_DEG, 2), 'basemap paths', len(basemap), 'bytes', sum(len(p['d']) for p in basemap))
print('stands', len(stands), 'contact', sum(1 for s in stands if s['pier']), {k: round(v.area) for k, v in pieces.items()})
far = [(s['id'], round(s['dist'])) for s in stands if s.get('pier') and s['dist'] > 60]
print('contact stands > 60 m from their pier:', far)

if len(sys.argv) > 3:   # debug render, metres, with a 50 m grid
    x0, y0, x1, y1 = 380, -1560, 1900, -160
    sv = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="%d" height="%d" style="background:#0c2847">' % (x0, y0, x1 - x0, y1 - y0, (x1 - x0) * 1.2, (y1 - y0) * 1.2)]
    def P(g, fill, op=1):
        polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
        for p in polys:
            sv.append('<path d="M%s Z" fill="%s" fill-opacity="%s" stroke="#fff" stroke-width=".6"/>' % (' L'.join('%.1f,%.1f' % c for c in p.exterior.coords), fill, op))
    P(paved.intersection(box(x0, y0, x1, y1)), '#1e4a76')
    colors = {'Airside': '#2d6a9e', 'Landside': '#7f3446', 'Pier': '#3f87bf', 'bridge': '#f59e0b'}
    for k, v in pieces.items():
        if k.endswith('main'):
            continue
        P(v, next((c for t, c in colors.items() if t in k), '#888'), .85)
    for t, b in SEC.items():
        sv.append('<rect x="%d" y="%d" width="%d" height="%d" fill="#fbbf24"/>' % (b[0], b[1], b[2] - b[0], b[3] - b[1]))
    for gx in range(x0, x1, 50):
        sv.append('<line x1="%d" x2="%d" y1="%d" y2="%d" stroke="#fff" stroke-opacity=".15" stroke-width=".5"/><text x="%d" y="%d" font-size="9" fill="#9cb3c9">%d</text>' % (gx, gx, y0, y1, gx + 1, y0 + 10, gx))
    for gy in range(-1550, y1, 50):
        sv.append('<line y1="%d" y2="%d" x1="%d" x2="%d" stroke="#fff" stroke-opacity=".15" stroke-width=".5"/><text x="%d" y="%d" font-size="9" fill="#9cb3c9">%d</text>' % (gy, gy, x0, x1, x0 + 2, gy - 2, gy))
    for s in stands:
        c = '#34d399' if s['pier'] else '#62809d'
        sv.append('<circle cx="%.1f" cy="%.1f" r="3" fill="%s"/><text x="%.1f" y="%.1f" font-size="8" fill="%s">%s</text>' % (s['x'], s['y'], c, s['x'] + 4, s['y'] + 3, c, s['id']))
        if s.get('pier'):
            sv.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#34d399" stroke-width=".8"/>' % (s['x'], s['y'], s['gx'], s['gy']))
    sv.append('</svg>')
    open(sys.argv[3], 'w').write('\n'.join(sv))
