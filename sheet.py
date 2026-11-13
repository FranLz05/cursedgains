import sys, glob
from PIL import Image
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f) for f in files]
h = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (20, 20, 20))
for i, im in enumerate(ims):
    sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=85)
