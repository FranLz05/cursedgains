# Reglas del proyecto (PumpParadox shorts) — guía de producción definitiva

**ESTÁNDAR OFICIAL DE CALIDAD: `out/doms_video6_v3.mp4` (Short 6, "Soreness ≠ Muscle Growth (DOMS)", composición `DomsShort`, código en `src/videos/doms/`).**
Todo vídeo nuevo se construye clonando esa arquitectura y se compara contra ese render. Esta guía manda sobre cualquier regla antigua del repo.

## 1. Arquitectura de personajes y rig (`src/components/TitoRig3D.tsx`)
- Escenarios 3D completos con perspectiva + personaje PLANO 2D dibujado en una carta (Canvas2D) dentro del espacio 3D (técnica Rick Clips). Esqueleto FK invisible
  (pelvis -> torso -> cuello -> cabeza; hombro -> codo -> mano; cadera -> rodilla -> tobillo) que se proyecta cada frame sobre la carta. Acciones: idle, walk, run, curl, jump,
  hit, fall, cheer (función pura de (acción, t), determinista). Expresiones: idle, effort, shocked, exhausted, smug; `mouthOpen` 0..1 (lip-sync).
- **PROHIBIDO Dr. Pigeon (y cualquier paloma) en cualquier vídeo.** No se usan ni se mencionan `pigeon*.ts`, `pigeonDoc`, `pigeonSci`, `pigeonDr`.
- **Todos los personajes secundarios (obreros, jueces, médicos, público...) usan la MISMA anatomía 2.5D de `TitoRig3D`** (cabeza orgánica blanca, curvas Bézier de grosor variable,
  extremidades fideo) y se diferencian SOLO con accesorios / ropa / peinado mediante `outfit`: `helmet` (casco amarillo), `wig` (peluca de juez), `shirt` (color de camiseta/uniforme),
  `cast` (escayola), `thumbs`, `noBells`, `noLegs`. Si hace falta otro accesorio (gorro, gafas, bata...) se añade como una capa Bézier más en `TitoRig3D` con valor por defecto apagado.
  **Cero primitivas 3D (esferas, cilindros, cápsulas) para cuerpos humanoides.** Props, decorados y efectos sí son 3D.
- Diseño de Tito CERRADO (referencias permanentes: `public/refs/tito_frente.webp`, `tito_espaldas.webp`, `tito_poses_pelo.webp` — manda esta última en el pelo; captura `out/tito_rig_final.png`):
  cabeza blanca `#FFFFFF` con media luna `#E6DDD8`, pelo castaño `#6E4226` en una masa compacta despeinada con puntas definidas asimétricas (nada de corona de pinchos), cinta blanca con franja
  roja `#E03C31`, camiseta de tirantes roja holgada sin rayas, brazos/piernas finos de tinta, manos negras redondeadas, zapatillas blancas con suela roja; tinta `#2A1A14` de grosor variable
  (silueta ~12 px, secundarios ~8, detalles ~5); cara siempre blanca limpia (sin rubor), ojos ovalados asimétricos con brillo, cejas expresivas, sin nariz ni orejas.
- **Cero círculos perfectos**: todo (cabeza, manos, ojos, camiseta, pelo, cinta, zapatillas, accesorios) son caminos Bézier orgánicos (`smoothClosed` / `smoothOpen` / `blob`).
- Uso: `rig.update({ action, t, expression, mouthOpen, position, yaw, scale, outfit, travel }, camera)` DESPUÉS de colocar la cámara; `rig.anchor("head"|"chest"|"handL"|"handR"|"pelvis"|"hipL/R"|"kneeL/R"|"ankleL/R")`
  da posiciones de mundo. En los vídeos nuevos se usa `World.put(rig, parent, state, cam, tint)` y `World.wa(rig, name)` (anclas en mundo aunque el rig esté dentro de un pivote rotado).
- Rigs compartidos entre escenas: el desplazamiento del pivote se pasa con `parent.userData.off` (lo aplica `World.put` en cada llamada); si no, Tito sale descentrado en las escenas siguientes.

## 2. Regla Cero Enterramientos y Colisiones (Y-Grounding)
- Antes de entregar, verifica la altura base (`y`) de cada personaje y prop respecto a suelos, escalones, camillas, camas, balones y mesas: nadie hundido bajo el suelo ni atravesando muebles,
  mancuernas, barras o discos, tampoco durante los zooms de cámara.
- Las cartas son planos verticales: cualquier caja 3D cuyo frente esté por delante del plano de la carta (z mayor) TAPA al personaje. Muebles (camas, camillas, escaleras, mesas) se colocan DETRÁS del plano de Tito
  (frente del mueble con z menor que el de la carta) o se acortan en profundidad. Tumbados (`fall`, yaw ±PI/2): comprobar de qué lado queda la cabeza y que no entra en escalones ni almohadas.
- Props agarrados (mancuernas, mazos, extintores, aros) se calculan desde las anclas de las manos / tobillos cada frame, con el mango alineado con la mano; la barra a la altura de las manos y los discos fuera de la cabeza.
- Props con texto (neones, carteles, contadores) nunca atraviesan otros objetos y siguen a la cámara si ésta se mueve (p. ej. contador `85 KG` pegado a la cámara).
- Escenas con cambio interno (p. ej. zoom al muslo -> túnel): el corte se disimula dentro del plano, sin pantallas lisas de un solo color.

## 3. Sistema de iluminación contextual (CERO conos geométricos)
- **PROHIBIDO** usar mallas / conos / cilindros / haces semitransparentes de luz con bordes duros (nada de `SpotLightCone`). La luz se ve por su efecto (sombras, halo, rim), nunca como geometría dibujada.
- **Escenas cotidianas / gimnasio luminoso / baño:** luz natural cálida y limpia (sol cálido + sombras proyectadas suaves en el suelo), sin tintes azules oscuros y sin lámpara con halo.
- **Escenas oscuras / dramáticas / nocturnas:** contraste atmosférico tipo Rick Clips: penumbra ambiental fría `#1A2238` (sombra) + luz puntual cálida intensa `#FFB84D` con halo radial difuso (bloom, textura radial aditiva sin bordes)
  cerca del sujeto (`env.lamp` en `doms/world.ts`), ambiente (`hemi`) al mínimo, sombras de contacto oscuras en el suelo.
- Los personajes 2.5D reaccionan a la luz con el shader de carta `patchCard` (`doms/world.ts`): media figura en sombra, luz de contorno (rim) en el borde iluminado con el color de la luz; `castShadow` / `receiveShadow` activos en cartas y props.
  Presets por escena (`ENVS` / `ENVS2`): `lit`, `shade`, `bg`, `fog`, `sun`, `sunCol`, `tint`, `lamp`.
- Mundo 3D: tinta de contorno (`InkPass`), desenfoque de lente (`LensBlur` cInf 9 generales / 7 primeros planos, maxCoC 14), bloom, tone map y grade (`alejandro/*`); emisivos / texto / transparentes en la capa `NOINK`.

## 4. Ritmo de edición y locución
- **16 o 22 micro-escenas**, una por frase, cada una con su propio escenario y una acción física literal; **cortes SECOS cada 2,5–3 s** (nada de destellos blancos, fundidos ni líneas de velocidad; sin cortes dentro del mismo escenario solo para ladear la cámara).
- **Movimiento continuo en el 100 % de los frames** con `Easing.inOut(Easing.cubic)` en todos los planos: tiempo deformado sobre una ventana que empieza un 30 % antes del corte y acaba un 30 % después (nunca velocidad 0), keys unidas con Catmull-Rom
  (`doms/story.ts camAt(ci, t, duraciónReal)`); pico ~70 °/s solo en barridos, temblores de impacto <= 0.035. Tito nunca congelado. Cero ruido visual: solo lo pedido en el guion.
- **Locución fluida, expresiva y continua**: UNA sola síntesis con todo el guion (`volumen-basura/audio/generar_voz_doms.py`, edge-tts `en-US-ChristopherNeural`, +8 %), con puntuación y "..." para las pausas naturales entre bloques.
  PROHIBIDO recortar frases sueltas de forma robótica, acelerar tramos (`atempo` / `playbackRate`) para que quepan en su escena y dejar silencios muertos (>0.3 s se acortan a 0.24 s; sobre todo tras el gancho inicial).
- **El audio manda**: cada escena empieza en su primera palabra real y su duración sale del audio (`timeline.json`, `palabras.json`, `mouth.json`). Si una animación necesita más tiempo, se inserta una pausa corta (`MINS` del script) justo antes de la siguiente frase.
  Los eventos que van con una palabra (yunque con "circus", mazo con "Wrong") leen su tiempo de `palabras.json` (`wordF`). Tras cambiar el guion: `generar_voz_doms.py` -> `generar_audio_doms.py` -> render.
- **Entonación expresiva (para los vídeos futuros)**: puntuación dramática (`!`, `?`, `...`, `—`) en el texto del TTS para marcar énfasis en los gags y en el gancho; micro-pausas de 150–200 ms justo antes de los remates cómicos;
  `pitch` +4…+6 Hz en los momentos absurdos / exagerados y −2…−4 Hz en los remates secos. `edge-tts` solo admite `rate` / `pitch` / `volume` globales por llamada (no SSML por segmento), así que el pitch se varía sintetizando
  BLOQUES LARGOS (varias frases por bloque, partidos solo en los remates cómicos) con su `pitch`, uniéndolos con una micro-pausa y sin tocar la velocidad; los tiempos de palabra se recalculan al unir. Nunca acelerar el `playbackRate` final.
- Lip-sync: la boca de Tito sigue la envolvente de la voz fotograma a fotograma (`mouth.json`); subtítulos de 1-2 palabras (Arial Black 112 px, trazo negro 14 px, palabras clave en rojo `#EF4444` / verde `#22C55E`).
- Audio: `generar_audio_doms.py` mezcla voz + música 128 BPM + SFX (whoosh + golpe en cada corte y efectos en los eventos), ducking de la música bajo la voz, -14 LUFS -> `public/voz_doms/mezcla.wav`.

## 5. Márgenes seguros 9:16 y auditoría pre-render
- Lienzo 1080×1920. Carteles, neones, etiquetas y subtítulos dentro de los márgenes seguros: >= 60 px a cada lado (los subtítulos como mucho 960 px de ancho), nada importante en los 150 px superiores ni en los 170 inferiores.
  Subtítulos centrados a ~68 % de altura (y = 1300), bajados (y ≈ 1560) cuando taparían la cara del sujeto; etiquetas técnicas flotantes con el estilo `Chip` (línea blanca fina + caja `rgba(6,9,20,0.86)` + `Courier New`).
  Los carteles 3D que se salen del encuadre se achican o se centran con la cámara (`neon.position.x` seguido de la cámara).
- **Antes de entregar cualquier vídeo**: (1) hoja de contactos con fotogramas clave de TODAS las escenas, sacados del MP4 final (no solo de stills previos) y revisada fotograma a fotograma;
  (2) auto-auditoría de colisiones (regla 2), encuadres / cortes de cabeza, textos cortados en los bordes, rig descentrado y expresiones; (3) `python volumen-basura/analisis/camara_audit.py out/audit.json video.mp4` + `resumen_audit.py`.
  Herramientas: `node herramientas/stills_doms.mjs out/doms/qa 40,130,... 0.3` (varios fotogramas en una sola sesión y EN ORDEN, para detectar estado arrastrado entre escenas) y `python herramientas/hoja.py out/doms/qa out/doms/hoja.jpg 8`.
  Los stills sueltos no bastan: el bug de Tito descentrado solo apareció renderizando la secuencia completa.

## Render (SIEMPRE por GPU: RTX 3070, tarda pocos minutos)
Flags obligatorios: `--gl=angle --angle-backend=d3d11 --concurrency 4 --timeout 180000 --codec h264 --crf 18`.
```
npx remotion render src/index.ts DomsShort out/doms_video6_v3.mp4 --gl=angle --angle-backend=d3d11 --concurrency 4 --timeout 180000 --codec h264 --crf 18
```
Para otro short cambia el id de composición y el nombre del mp4. Rendimiento 3D: una sola geometría unitaria compartida (caja / cilindro / esfera, `doms/kit.ts`), materiales cacheados por color y creados una vez en el constructor del `World`
(nunca dentro del bucle de fotogramas), cada escena es un `THREE.Group` construido UNA vez y visible solo mientras dura; sombra 2048.

## Arquitectura del short estándar (`src/videos/doms/`)
`Doms.tsx` (composer, subtítulos, pantalla dividida con dos canvas de 540×1920), `world.ts` (`World`, iluminación contextual, shader de cartas), `kit.ts` (geometrías, materiales, texto, `Puffs`),
`sets1.ts` / `sets2.ts` (las escenas), `story.ts` (cámaras y tiempos), `timeline.json` / `palabras.json` / `mouth.json` (generados por la voz). Estructura de cada escena: `Builder = (w: World) => Scn { g, env, update(ctx), focus(), shake?, cInf? }`.

## Legado (shorts 1-5; NO usar en vídeos nuevos)
Los shorts anteriores usan tarjetas `Pen` (`alejandro/toon.ts`, `troop.ts`, `cardshade.ts`) y sprites de Tito (`soplete/titoS.ts` → `titoFront`, `volumen/titoGym.ts`, `ventana/titoV.ts`, `soplete/titoLying.ts`) y mundos
`sudar/world.ts`, `volumen/world.ts`, `soplete/world.ts`, `spot/world.ts`, `fasted/*`, `fasted2/*` (ids `SpotReduction3D`, `FastedCardio3D`, `FastedCardioDynamic`, ...). Siguen compilando para poder re-renderizarlos, pero:
- las palomas (`sudar/pigeon.ts`, `ventana/pigeonDr.ts`, `soplete/pigeonSafety.ts`, `spot/cards.ts → pigeonSci`, `fasted/cards.ts → pigeonDoc`) y su uso quedan PROHIBIDOS en cualquier vídeo nuevo;
- sus reglas de "cortes con destello blanco de 3 fotogramas", subtítulos entre y 1400–1620 y voz a +15 % con pausas repartidas quedan SUSTITUIDAS por las reglas de esta guía;
- sus piezas reutilizables (gimnasio, cinta, piscina) se pueden portar a `doms/` como props 3D, nunca los personajes.
Pipelines de audio antiguos: `volumen-basura/audio/generar_voz_*.py` / `generar_audio_*.py` (mismo patrón de mezcla; el nuevo estándar es `generar_voz_doms.py` + `generar_audio_doms.py`).

## Short 7 "Sleep Robbery" (`src/videos/sleep_robbery/`, id `SleepRobbery`) — novedades del estándar
- **Rig**: `TitoRig3D` gana accesorios (apagados por defecto): `balaclava`, `shades`, `nightcap`, `eyeBags`, `floatRing` (color), `megaphone`, y el gancho `over` en `TitoState` (sobrescribe ángulos de brazos/piernas, `lean`, `lift`, `squash`, `headPitch`...) para poses a medida (sentado, cargar, pulgar).
- **Luz**: dos `THREE.PointLight` reales (`world.pl[0..1]`, siempre presentes para no recompilar) que `kit.ts → withPoints` suma al shader two-tone mediante uniformes en espacio mundo (`PT`). Halos con `Halo`, fuego/vapor con `Soft` (sprites aditivos suaves, nunca esferas sólidas).
- **Ritmo tipo Rick Clips**: `cuts.json` = cortes secos EXTRA dentro de cada escena (segundos desde su inicio); `story.ts` cada plano = un `Seg` con su propio easing. Audio y cámara leen el mismo `cuts.json`. Objetivo: plano medio 1.2-1.5 s, ~34 planos en 40 s.
- **Voz**: 3 bloques con `pitch` +5/+3/-3 Hz y pausa 200 ms (`generar_voz_sleep.py`); alineación palabra a nivel de carácter (un evento TTS puede cubrir varias palabras, p. ej. "3 AM").
- **Desenfoque**: `LensBlur` maxCoC 7 y `cInf * 0.3` (el fondo muy borroso aleja el vídeo de Rick Clips: ratio nitidez 1.5-3.4).
- **Render con supersampling**: `--props='{"dpr":1.5}'` además de los flags de GPU de arriba.
- **Puntos de QA recurrentes**: ventana ABIERTA (sin cristal) si algo la atraviesa; muebles/props de fondo (cerebro, sofa) nunca detrás de la cabeza de un personaje ni delante de su carta; carteles dentro de 60 px laterales; subtítulos autoajustados (`940 / (chars * 0.82)`), y=1610 en la escena del gráfico.
- **QA automática**: `python herramientas/qa_sleep.py out/<video>.mp4` (formato, LUFS, subtítulos, planos, métricas vs Rick Clips, bordes laterales). Stills en orden: `node herramientas/stills_sleep.mjs out/sleep/qa f1,f2,... 0.4` (`DPR=1.5` opcional).
- **Entorno nuevo**: ver README (`npm ci`, `pip install -r requirements.txt`, ffmpeg en el PATH).
