"""Trace a basemap (land use, airfield, paved areas, roads, water) from a map screenshot.

Usage: python3 tools/trace_basemap.py <screenshot.png|webp> <out.json> [scale]

Colour rules match the default Google Maps light style. The output is a list of
{type, d} SVG paths in world units (screenshot pixels x scale), which the mock
SDK serves as Map Feature items with a 'Path' property.
"""
import json
import sys

import contourpy
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
im = np.array(Image.open(src).convert('RGB')).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
H, W = R.shape


def shift_max(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def shift_min(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o &= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def close(m, r):
    return shift_min(shift_max(m, r), r) if r else m


def open_(m, r):
    return shift_max(shift_min(m, r), r) if r else m


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    v = pts - a
    d = np.abs(ab[0] * v[:, 1] - ab[1] * v[:, 0]) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([rdp(pts[: i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])


def ring_area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def trace(mask, eps=0.9, min_area=40.0, min_hole=25.0):
    z = np.pad(mask.astype(float), 1)
    gen = contourpy.contour_generator(z=z, fill_type='OuterOffset')
    polys, offsets = gen.filled(0.5, 1.5)
    paths = []
    for pts, off in zip(polys, offsets):
        rings = [pts[off[i]:off[i + 1]] - 1 for i in range(len(off) - 1)]
        if not rings or ring_area(rings[0]) < min_area:
            continue
        d = ''
        for j, ring in enumerate(rings):
            if j and ring_area(ring) < min_hole:
                continue
            k = int(np.argmax(np.hypot(*(ring - ring[0]).T)))  # split closed ring at its far point
            s = np.vstack([rdp(ring[: k + 1], eps)[:-1], rdp(ring[k:], eps)])
            if len(s) < 3:
                continue
            d += 'M' + ' L'.join('%g,%g' % (round(x * K, 1), round(y * K, 1)) for x, y in s) + 'Z'
        if d:
            paths.append(d)
    return paths


near = lambda c, t: (abs(R - c[0]) <= t) & (abs(G - c[1]) <= t) & (abs(B - c[2]) <= t)
paved = (R >= 237) & (B >= 252) & (G >= 242) & (B - R >= 8)
lavender = (R >= 222) & (R <= 238) & (B >= 242) & (B - R >= 10) & (B - R <= 22) & (G - R >= 2) & (G - R <= 9)
building = (R >= 198) & (R <= 216) & (G >= 216) & (G <= 232) & (B >= 236) & (B <= 250)
road = (B - R >= 35) & (R >= 110) & (R <= 185) & (G >= 140) & (G <= 200) & (B >= 175) & (B <= 225)
water = (G - R >= 45) & (B >= 222) & (R <= 205) & (G >= 195)
urban = (abs(R - G) <= 4) & (abs(G - B) <= 5) & (R >= 236) & (R <= 248)
forest = near((195, 240, 213), 5)
beige = near((243, 239, 227), 5)

layers = []
air = close(lavender | paved | building | road & shift_max(lavender, 6), 4)
air = open_(air, 2)
layers += [('airfield', p) for p in trace(air, eps=1.2, min_area=4000, min_hole=600)]
layers += [('urban', p) for p in trace(open_(close(urban, 2), 1), eps=1.2, min_area=600, min_hole=200)]
layers += [('forest', p) for p in trace(open_(close(forest, 2), 1), eps=1.2, min_area=300)]
layers += [('beige', p) for p in trace(open_(close(beige, 2), 1), eps=1.2, min_area=300)]
layers += [('apronbld', p) for p in trace(close(building, 1), eps=0.8, min_area=30)]
layers += [('paved', p) for p in trace(open_(close(paved, 1), 0), eps=0.7, min_area=60, min_hole=20)]
layers += [('water', p) for p in trace(close(water, 1), eps=0.7, min_area=12)]
layers += [('roadfill', p) for p in trace(close(road, 1), eps=0.8, min_area=60)]

json.dump({'scale': K, 'width': W * K, 'height': H * K, 'paths': [{'type': t, 'd': d} for t, d in layers]}, open(out, 'w'))
from collections import Counter
print(Counter(t for t, _ in layers), 'bytes', sum(len(d) for _, d in layers))
