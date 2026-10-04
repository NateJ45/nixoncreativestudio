# D8 storyboard

Frames rendered from the hybrid player by seeking its timeline (`_capture/render.mjs shots`).
File names carry the cut and the second: `ss-d-4-t8.4.webp` is Stone Steps, desktop, frame 4, 8.4 s.
Ease codes: in-out = cubic in and out, flick = fast start and long settle (a scroll), overshoot = zoom
with a five percent push past the target.

## Stone Steps 50K, desktop cut (15.7 s loop)

| #   | Time         | Shot                            | Move                                                                                                                | Live?                                                                                                      |
| --- | ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | 0.0 to 1.1   | Hero, wide                      | hold                                                                                                                | no                                                                                                         |
| 2   | 1.1 to 3.55  | Race clock at 2x                | 850 ms zoom with overshoot, 1.6 s hold                                                                              | yes: the seconds tick (real clip, 2.6 s)                                                                   |
| 3   | 3.55 to 5.8  | Stats band, then the race cards | pull out 800 ms in-out, scroll flick 800 ms, 400 ms hold                                                            | no                                                                                                         |
| 4   | 5.8 to 8.75  | Course map section, wide        | scroll flick 850 ms, hold; cursor arcs in from the right (950 ms), hovers Short loop, clicks at 8.4 s with a ripple | yes: the dot runs the long loop, the click switches the map, the elevation strip and the "on repeat" label |
| 5   | 8.75 to 11.2 | The short loop at 1.8x          | 850 ms zoom with overshoot, 1.6 s hold                                                                              | yes: the dot runs the short loop with its mile and height tag                                              |
| 6   | 11.2 to 15.7 | Records board                   | pull out 700 ms, scroll 950 ms in-out, hold, push in 2x on the 50K records, hold, dissolve to the opening frame     | no                                                                                                         |

Phone cut (14.1 s): the same beats, a 1.3x push on the clock, a tap (finger dot) instead of a cursor,
a 1.4x push on the map, and a 1.25x push on the board so names never crop.

## Reid Design, desktop cut (13.7 s loop)

| #   | Time          | Shot                                        | Move                                                                                    | Live?                                                                                                      |
| --- | ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | 0.0 to 1.0    | Hero, wide                                  | hold                                                                                    | no                                                                                                         |
| 2   | 1.0 to 3.5    | "Hi, I'm Staci", then the four-step process | two scroll flicks of 850 ms, holds of 350 and 450 ms                                    | no                                                                                                         |
| 3   | 3.5 to 4.5    | Concept room, parked                        | scroll flick 850 ms into the pinned stage                                               | no                                                                                                         |
| 4   | 4.4 to 9.3    | The room fills                              | camera holds, then creeps to 1.1x over 4.5 s while the page plays                       | yes: the real scroll-driven room, frame by frame (empty room, bones, furniture, styling, notes on strings) |
| 5   | 9.1 to 10.75  | Colour chips                                | cursor arcs in, hovers Sage, clicks at 10.35 s                                          | yes: the walls repaint in sage                                                                             |
| 6   | 10.75 to 13.7 | The sage room at 1.85x                      | 800 ms zoom with overshoot, a sharp 2x still takes over as the clip ends, dissolve home | no                                                                                                         |

Phone cut (13.5 s): the room fills in the pinned stage, the camera flicks down to the chips for the tap,
then lifts to a 1.6x close-up on the sage wall and the art.

## Verified live on 4 October 2026

- stonesteps50k.com home: the countdown clock ticks; the course map dot runs the selected loop when in
  view; the Long loop and Short loop buttons toggle `aria-pressed` and switch the map, the elevation
  strip and the label. The 3D "Fly the course" map on /course is real but was not used (WebGL, heavy,
  a separate page).
- reiddesignllc.com home: the concept room fills as the page scrolls through its pinned track, and the
  five wall-colour chips (As it is, Sage, Clay, Lake, Espresso) appear at the end and repaint the walls.
  Nothing else was clicked; no forms were touched.
