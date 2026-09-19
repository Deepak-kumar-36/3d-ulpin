"""Generate 3 floors of one synthetic building (L1, L2, L3) as architectural-style plan images.

Realistic-ish features: thick outer walls, thinner inner walls, ~70px door openings with
door leaf + swing arc, windows, room labels, structural columns, a title. L2 is blurred,
noisy and unevenly lit to stress-test thresholding.

    python make_plans.py [out_dir]
"""
import sys
from pathlib import Path

import cv2
import numpy as np

W, H = 1600, 1200
L, R, TOP, BOT = 100, 1500, 100, 1100
T_OUT, T_IN, DOOR = 14, 8, 70


class Plan:
    def __init__(self):
        self.img = np.full((H, W), 255, np.uint8)

    def wall(self, x0, y0, x1, y1, t):
        h = t // 2
        cv2.rectangle(self.img, (min(x0, x1) - h, min(y0, y1) - h), (max(x0, x1) + h, max(y0, y1) + h), 0, -1)

    def hdoor(self, x0, y, s, t=T_IN):
        """Door in a horizontal wall from x0 to x0+DOOR, swinging down (s=1) or up (s=-1)."""
        x1 = x0 + DOOR
        cv2.rectangle(self.img, (x0, y - t // 2 - 1), (x1, y + t // 2 + 1), 255, -1)
        cv2.line(self.img, (x0, y), (x0, y + s * DOOR), 0, 2)
        a0, a1 = (0, 90) if s == 1 else (270, 360)
        cv2.ellipse(self.img, (x0, y), (DOOR, DOOR), 0, a0, a1, 0, 1, cv2.LINE_AA)

    def vdoor(self, x, y0, s, t=T_IN):
        """Door in a vertical wall from y0 to y0+DOOR, swinging right (s=1) or left (s=-1)."""
        y1 = y0 + DOOR
        cv2.rectangle(self.img, (x - t // 2 - 1, y0), (x + t // 2 + 1, y1), 255, -1)
        cv2.line(self.img, (x, y0), (x + s * DOOR, y0), 0, 2)
        a0, a1 = (0, 90) if s == 1 else (90, 180)
        cv2.ellipse(self.img, (x, y0), (DOOR, DOOR), 0, a0, a1, 0, 1, cv2.LINE_AA)

    def window(self, x0, y0, x1, y1):
        """Window in an outer wall: thin double line replaces the solid wall."""
        horizontal = (y0 == y1)
        if horizontal:
            cv2.rectangle(self.img, (x0, y0 - T_OUT // 2 - 1), (x1, y0 + T_OUT // 2 + 1), 255, -1)
            for dy in (-T_OUT // 2, 0, T_OUT // 2):
                cv2.line(self.img, (x0, y0 + dy), (x1, y0 + dy), 0, 2)
        else:
            cv2.rectangle(self.img, (x0 - T_OUT // 2 - 1, y0), (x0 + T_OUT // 2 + 1, y1), 255, -1)
            for dx in (-T_OUT // 2, 0, T_OUT // 2):
                cv2.line(self.img, (x0 + dx, y0), (x0 + dx, y1), 0, 2)

    def column(self, cx, cy, s=44):
        cv2.rectangle(self.img, (cx - s // 2, cy - s // 2), (cx + s // 2, cy + s // 2), 0, -1)

    def label(self, text, cx, cy, scale=0.9):
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 2)
        cv2.putText(self.img, text, (cx - tw // 2, cy + th // 2), cv2.FONT_HERSHEY_SIMPLEX, scale, 0, 2, cv2.LINE_AA)

    def shell(self, title):
        self.wall(L, TOP, R, TOP, T_OUT); self.wall(L, BOT, R, BOT, T_OUT)
        self.wall(L, TOP, L, BOT, T_OUT); self.wall(R, TOP, R, BOT, T_OUT)
        cv2.putText(self.img, title, (L, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.1, 0, 2, cv2.LINE_AA)


def floor1():
    p = Plan(); p.shell("L1 - GROUND FLOOR")
    y_a, y_b = 520, 640                      # corridor walls
    p.wall(L, y_a, R, y_a, T_IN); p.wall(L, y_b, R, y_b, T_IN)
    for x in (560, 1000): p.wall(x, TOP, x, y_a, T_IN)
    for x in (480, 780, 1150): p.wall(x, y_b, x, BOT, T_IN)
    for x, s in ((250, -1), (730, -1), (1200, -1)): p.hdoor(x, y_a, s)
    for x, s in ((240, 1), (590, 1), (900, 1), (1280, 1)): p.hdoor(x, y_b, s)
    for x0 in (250, 750, 1200): p.window(x0, TOP, x0 + 150, TOP)
    for x0 in (200, 1250): p.window(x0, BOT, x0 + 120, BOT)
    p.column(330, 330); p.column(1000, 534, 24)  # corridor column touches the wall, like real structural columns
    for t, cx, cy in (("LIVING", 330, 250), ("KITCHEN", 780, 250), ("BEDROOM 1", 1250, 250), ("CORRIDOR", 800, 580),
                      ("BEDROOM 2", 290, 880), ("BATH", 630, 880), ("UTILITY", 965, 880), ("BEDROOM 3", 1325, 880)):
        p.label(t, cx, cy)
    return p


def floor2():
    p = Plan(); p.shell("L2 - FIRST FLOOR")
    y_a, y_b = 500, 620
    p.wall(L, y_a, R, y_a, T_IN); p.wall(L, y_b, R, y_b, T_IN)
    p.wall(800, TOP, 800, y_a, T_IN)
    for x in (560, 1080): p.wall(x, y_b, x, BOT, T_IN)
    for x, s in ((330, -1), (1050, -1)): p.hdoor(x, y_a, s)
    for x, s in ((250, 1), (760, 1), (1250, 1)): p.hdoor(x, y_b, s)
    p.vdoor(800, 200, 1)
    for x0 in (300, 1000): p.window(x0, TOP, x0 + 140, TOP)
    p.window(R, 700, R, 850)
    p.column(800, 514, 24)
    for t, cx, cy in (("OFFICE A", 450, 300), ("OFFICE B", 1150, 300), ("HALL", 800, 560),
                      ("MEETING", 330, 860), ("PANTRY", 820, 860), ("STUDIO", 1290, 860)):
        p.label(t, cx, cy)
    # Stress test: blur + sensor noise + uneven lighting
    img = cv2.GaussianBlur(p.img, (3, 3), 0).astype(np.float32)
    rng = np.random.default_rng(7)
    img += rng.normal(0, 7, img.shape)
    img -= np.linspace(0, 25, W, dtype=np.float32)[None, :]
    p.img = np.clip(img, 0, 255).astype(np.uint8)
    return p


def floor3():
    p = Plan(); p.shell("L3 - SECOND FLOOR")
    y_a, y_b = 540, 660
    p.wall(L, y_a, R, y_a, T_IN); p.wall(L, y_b, R, y_b, T_IN)
    for x in (400, 1200): p.wall(x, TOP, x, y_a, T_IN)
    p.wall(900, y_b, 900, BOT, T_IN)
    for x, s in ((200, -1), (700, -1), (1300, -1)): p.hdoor(x, y_a, s)
    for x, s in ((450, 1), (1100, 1)): p.hdoor(x, y_b, s)
    for x0 in (180, 700, 1250): p.window(x0, TOP, x0 + 130, TOP)
    p.column(800, 300); p.column(800, 420)
    for t, cx, cy in (("STORE", 250, 300), ("OPEN WORKSPACE", 800, 200), ("LOUNGE", 1350, 300), ("HALL", 800, 600),
                      ("LAB", 500, 880), ("SERVER RM", 1200, 880)):
        p.label(t, cx, cy)
    return p


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "plans")
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in (("L1", floor1), ("L2", floor2), ("L3", floor3)):
        cv2.imwrite(str(out / f"{name}.png"), fn().img)
        print("wrote", out / f"{name}.png")
