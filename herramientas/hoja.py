import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(glob.glob(os.path.join(d, "f*.jpg")))
if len(sys.argv) > 4: fs = [f for f in fs if any(f.endswith(f"f{int(x):04d}.jpg") for x in sys.argv[4].split(","))]
ims = [Image.open(f) for f in fs]; w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols; sh = Image.new("RGB", (w * cols, h * rows), "#111")
for i, im in enumerate(ims):
    sh.paste(im, ((i % cols) * w, (i // cols) * h)); ImageDraw.Draw(sh).text(((i % cols) * w + 6, (i // cols) * h + 6), os.path.basename(fs[i]), fill="yellow")
sh.save(out, quality=85); print(out, sh.size)
