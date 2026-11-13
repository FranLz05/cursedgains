import React from "react";
import { Composition } from "remotion";
import { AlexShort } from "./videos/alejandro/Alex";
import { TOTAL, FPS } from "./videos/alejandro/story";
import { VolumenShort } from "./videos/volumen/Vol";
import { SudarShort } from "./videos/sudar/Sudar";
import { VentanaShort } from "./videos/ventana/Ventana";
import { SopleteShort } from "./videos/soplete/Soplete";
import { TOTAL as SOP_TOTAL } from "./videos/soplete/story";
import { TOTAL as VENT_TOTAL } from "./videos/ventana/story";
import { TOTAL as SUDAR_TOTAL } from "./videos/sudar/story";
import { TOTAL as VOL_TOTAL } from "./videos/volumen/story";
import { SpotShort3D } from "./videos/spot/Spot3D";
import { TOTAL as SPOT_TOTAL } from "./videos/spot/story";
import { FastedShort3D } from "./videos/fasted/Fasted3D";
import { TOTAL as FASTED_TOTAL } from "./videos/fasted/story";
import { FastedDynamic3D } from "./videos/fasted2/Fasted2";
import { TOTAL as FASTED2_TOTAL } from "./videos/fasted2/story";
import { TitoRigTest, RIG_TOTAL } from "./videos/rigtest/RigTest";
import { DomsShort, TOTAL as DOMS_TOTAL } from "./videos/doms/Doms";
import { SleepRobbery, TOTAL as SLEEP_TOTAL } from "./videos/sleep_robbery/SleepRobbery";
// Registra cada short nuevo aquí, con su propio id.
export const Root: React.FC = () => (
  <>
    <Composition id="SleepRobbery" component={SleepRobbery} durationInFrames={SLEEP_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="DomsShort" component={DomsShort} durationInFrames={DOMS_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="TitoRigTest" component={TitoRigTest} durationInFrames={RIG_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="FastedCardioDynamic" component={FastedDynamic3D} durationInFrames={FASTED2_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="FastedCardio3D" component={FastedShort3D} durationInFrames={FASTED_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="SpotReduction3D" component={SpotShort3D} durationInFrames={SPOT_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="SopleteShort" component={SopleteShort} durationInFrames={SOP_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="VentanaShort" component={VentanaShort} durationInFrames={VENT_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="SudarShort" component={SudarShort} durationInFrames={SUDAR_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="VolumenBasura" component={VolumenShort} durationInFrames={VOL_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="Alejandro" component={AlexShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
  </>
);
