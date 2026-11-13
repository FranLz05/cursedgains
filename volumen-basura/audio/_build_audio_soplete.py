"""Genera generar_audio_soplete.py a partir de generar_audio_ventana.py (mismas funciones de sintesis, nueva partitura y efectos)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "generar_audio_ventana.py"), encoding="utf-8").read()
i_score = src.index("# ------------------------------------------------------------------ the score (by scene)")
i_sfx = src.index("# ------------------------------------------------------------------ sound effects")
i_ev = src.index("# scene 1: the last curl")
i_mix = src.index("# ------------------------------------------------------------------ voice, ducking, mix")
head = src[:i_score].replace("ventana", "soplete").replace("Short 3", "Short 4").replace("The Anabolic Window Myth", "The Spot Reduction Myth")
helpers = src[i_sfx:i_ev]
tail = src[i_mix:].replace("ventana", "soplete")
score = open(os.path.join(HERE, "_score_soplete.txt"), encoding="utf-8").read()
ev = open(os.path.join(HERE, "_events_soplete.txt"), encoding="utf-8").read()
open(os.path.join(HERE, "generar_audio_soplete.py"), "w", encoding="utf-8").write(head + score + helpers + ev + tail)
print("built")
