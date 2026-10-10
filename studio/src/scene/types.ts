import type { Station } from "../content/stations";

/** The future room mounts behind the document. Milestone 1 keeps this empty. */
export interface NightFloorScene {
  readonly stations: readonly Station[];
  dispose(): void;
}
