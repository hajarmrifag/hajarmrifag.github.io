import type { Station } from "../content/stations";

/** The live rail behind the document. The room itself comes later. */
export interface NightFloorScene {
  readonly stations: readonly Station[];
  dispose(): void;
}
