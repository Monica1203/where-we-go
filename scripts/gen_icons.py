#!/usr/bin/env python3
"""Generate simple 81x81 PNG tab icons without PIL."""
import zlib, struct, math, os

SIZE = 81
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'static')
os.makedirs(OUT, exist_ok=True)

def png_bytes(pixels, w, h):
    raw = b''
    for y in range(h):
        raw += b'\x00' + b''.join(pixels[y*w+x] for x in range(w))
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def blank():
    return [b'\x00\x00\x00\x00'] * (SIZE * SIZE)

def px(pxs, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        pxs[y*SIZE + x] = color

def disk(pxs, cx, cy, r, color, hollow=None):
    for y in range(int(cy-r-1), int(cy+r+2)):
        for x in range(int(cx-r-1), int(cx+r+2)):
            d = math.hypot(x-cx, y-cy)
            if d <= r and (hollow is None or d >= hollow):
                px(pxs, x, y, color)

def rect(pxs, x0, y0, x1, y1, color):
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            px(pxs, x, y, color)

def line(pxs, x0, y0, x1, y1, color, width=4):
    steps = int(max(abs(x1-x0), abs(y1-y0)) * 2) + 1
    for i in range(steps+1):
        t = i/steps
        x = x0 + (x1-x0)*t
        y = y0 + (y1-y0)*t
        disk(pxs, x, y, width/2, color)

def icon_home(c):
    p = blank()
    # roof
    line(p, 40, 16, 14, 40, c, 5)
    line(p, 40, 16, 66, 40, c, 5)
    # body outline
    rect(p, 20, 38, 25, 66, c); rect(p, 55, 38, 60, 66, c)
    rect(p, 20, 62, 60, 66, c)
    # door
    rect(p, 36, 50, 44, 66, c)
    return p

def icon_list(c):
    p = blank()
    for i, y in enumerate((24, 40, 56)):
        disk(p, 22, y, 4, c)
        rect(p, 32, y-3, 62, y+3, c)
    return p

def icon_explore(c):
    p = blank()
    disk(p, 40, 40, 26, c, hollow=22)
    # needle
    line(p, 32, 48, 48, 32, c, 5)
    return p

def icon_settings(c):
    p = blank()
    disk(p, 40, 40, 24, c, hollow=18)
    disk(p, 40, 40, 8, c, hollow=4)
    # teeth
    for deg in range(0, 360, 45):
        a = math.radians(deg)
        x = 40 + 21*math.cos(a)
        y = 40 + 21*math.sin(a)
        disk(p, x, y, 4, c)
    return p

GRAY = b'\x8a\x85\x80\xff'
RED = b'\xe8\x57\x4a\xff'

icons = {
    'tab-home.png': (icon_home, GRAY),
    'tab-home-active.png': (icon_home, RED),
    'tab-wish.png': (icon_list, GRAY),
    'tab-wish-active.png': (icon_list, RED),
    'tab-explore.png': (icon_explore, GRAY),
    'tab-explore-active.png': (icon_explore, RED),
    'tab-settings.png': (icon_settings, GRAY),
    'tab-settings-active.png': (icon_settings, RED),
}

for name, (fn, color) in icons.items():
    data = png_bytes(fn(color), SIZE, SIZE)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    print('wrote', name, len(data), 'bytes')
