# D8 Showreel: rationale and measurements

Prototype for showing each project as a directed walkthrough. Two real sites: Stone Steps 50K
(stonesteps50k.com) and Reid Design (reiddesignllc.com). FBCM was dropped from this round when the
scope moved to live behaviour (Nathan's update): its interactions are a dropdown and a search panel,
which stills already carry well, so it adds nothing the two sites here do not prove.

Open `index.html` through any static server (`node _capture/serve.mjs . 8080` from this folder). The
switch at the top flips every player between **Hybrid**, **Stills only** and **Video**.

## 1. Why amateur showreels look basic

| Symptom                           | What the eye reads             | Fix used here                                                                                                         |
| --------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Constant-speed scroll             | A screen recording, not a film | Short eased steps: a 800 to 850 ms flick that settles, then a hold                                                    |
| No easing, no anticipation        | Mechanical, cheap              | Cubic in-out on repositions; out-back overshoot (about 5%) on zooms only                                              |
| Constant zoom, or zoom on nothing | No point of view               | Zoom 1.8 to 2x (desktop), 1.25 to 1.6x (phone) onto one real detail                                                   |
| Everything shown equally          | No hierarchy                   | A shot list: 5 or 6 beats per site, each with one subject                                                             |
| 25 fps jittery capture            | Stutter                        | Camera is computed, not captured: 60 keyframes a second, composited by the browser                                    |
| Soft text from 1x capture         | Looks like a JPEG of a site    | 2x stills where the camera rests or zooms; 1x only where it is moving                                                 |
| Teleporting cursor                | Fake                           | A cursor that arcs on a curve, arrives before the click, dips on press, leaves a ripple, and the page visibly changes |
| No rest beats                     | Exhausting                     | 400 to 800 ms holds on what matters, longer where something live is playing                                           |
| Too long                          | Nobody watches to the end      | 13.5 to 15.7 s per loop                                                                                               |
| Compressed to mush                | Smeared text in motion         | Stills stay stills; only small live regions are encoded                                                               |
| Hard loop restart                 | A visible "jump"               | The last beat dissolves into the poster, which is also the first frame                                                |

## 2. Directing rules (applied in `_capture/build.mjs` timelines)

1. One move at a time: scroll, then zoom, then cursor. Every move ends in a hold.
2. Moves of 600 to 900 ms. Repositions use cubic in-out; scroll steps use a quick-start, long-settle
   curve (out-quart); zooms use out-back with a small overshoot. Nothing else overshoots.
3. Holds of 400 to 800 ms on content, 1.6 to 2 s where a live clip is playing.
4. Zoom interpolates in log space, so 1x to 2x feels even rather than rushing at the end.
5. The cursor only moves while the camera is still. It travels about 0.9 s on a quadratic curve,
   hovers (real hover state captured), presses (scale 0.84) and leaves a 520 ms ripple. On phones it
   is a finger dot, not an arrow.
6. Sharp where it rests: the poster and every zoom target are 2x; the scroll strip is 1x on desktop
   and 1.5x on phones because the camera only passes over it.
7. Live only where it is live: real frame sequences, cut in exactly where the page really moves.
8. 13.5 to 15.7 s, seamless loop through a 600 to 700 ms dissolve to the opening frame.
9. Motion blur: none. At these speeds and 60 Hz composition, blur only hides text.

## 3. Shot lists

Full tables with times: `shots/STORYBOARD.md`. Six storyboard frames per cut are in `shots/`.

**Stone Steps (15.7 s desktop, 14.1 s phone):** hero hold; push 2x onto the race clock while it ticks
(live); pull out and flick through the race cards; settle on the course map while the dot runs the long
loop (live); cursor arcs to Short loop and clicks, and the map, elevation strip and label switch (live);
zoom 1.8x as the dot runs the short loop with its mile tag (live); whip to the records board, push 2x on
the 50K records; dissolve home.

**Reid Design (13.7 s desktop, 13.5 s phone):** hero hold; two flicks through "Hi, I'm Staci" and the
four-step process; park on the concept room; the room fills as the real page scrolls through its pinned
track (live); cursor clicks the Sage chip and the walls repaint (live); zoom 1.85x on the sage room;
dissolve home.

Verified live on 4 October 2026: the Stone Steps clock, course dot and loop buttons (`aria-pressed`
toggles), and the Reid concept room and its five wall-colour chips. The Stone Steps 3D "Fly the
course" map on /course is real but not used (WebGL, map tiles over the network, a different page).
Nothing was submitted and no personal data appears.

## 4. How it is built

- **Capture** (`_capture/capture.mjs`): Playwright, 2x device scale. Time is frozen: Playwright's fake
  clock drives timers and `requestAnimationFrame`, the CDP animation timeline runs at rate 0, and every
  CSS animation and transition is advanced 33.3 ms by hand per frame. Each clip frame is therefore
  exact, not "whenever a screencast fired". Hover and click are real mouse events (taps on phones).
  The first frame of every clip is pasted into the still strip, so stills and clips agree to the pixel.
- **Player** (`assets/reel.js`, custom element `<nx-reel>`): camera, cursor, ripples and state swaps are
  pure functions of time, baked once into Web Animations keyframes (60 per second) so the compositor
  plays them. Clips are muted `<video>` layers started and kept in sync on cue. **2,306 bytes minified
  and gzipped** (target was under 3 KB); `reel.css` 717 bytes gzipped.
- Poster first: the poster `<img>` is in the HTML, it is the LCP element, and it is also the first and
  last frame. The player downloads nothing until the page has fired `load` and gone idle, and only
  when within 300 px of the viewport. It plays only when 40% visible, pauses offscreen and in hidden
  tabs, has a 44 px Play/Pause button, and never has sound. Reduced motion: the player never builds;
  a `<picture>` source shows a designed still of the best detail instead (`*-still.webp`). If anything
  fails to load, the poster simply stays.
- **Encoding**: WebCodecs `VideoEncoder` (VP9) in headless Chromium, muxed by a 120-line WebM writer
  in `_capture/enc.html` (EBML header, SeekHead, Cues, one cluster per keyframe). Verified to load,
  play, seek and report the right duration in Chromium. No npm package or system software was
  installed.
- **Prototype B** (`_capture/render.mjs video`): the same hybrid timeline seeked frame by frame at
  30 fps, 1280x720 and 720x900, then encoded. Rate control is aimed, measured and re-aimed because
  Chromium's VP9 overshoots on cuts.

## 5. Measured weight (KB = 1,024 bytes)

Totals include the poster, the JSON timeline and the player JS and CSS (gzipped). "Video" is the
WebM plus its poster.

| Cut                 | Poster | Stills only | Hybrid | of which clips | Video (B) |
| ------------------- | ------ | ----------- | ------ | -------------- | --------- |
| Stone Steps desktop | 102    | 529         | 923    | 448            | 1,220     |
| Stone Steps phone   | 31     | 407         | 578    | 204            | 1,053     |
| Reid Design desktop | 59     | 620         | 966    | 572            | 1,100     |
| Reid Design phone   | 37     | 470         | 759    | 426            | 1,155     |

Reduced-motion stills: 31, 18, 68 and 20 KB. Clips are VP9 at about 0.015 bits per pixel per frame.

Real page bytes after 10 s in view (Playwright, homepage-like test page, Stone Steps): phone 33 KB with
a static screenshot, 413 KB stills only, 584 KB hybrid, 1,055 KB video; desktop 103, 535, 929 and
1,245 KB.

**B against the 1.2 MB ceiling:** VP9 lands at 1,156 KB (Stone Steps desktop, 205 kbps), 1,030 KB
(phone, 315 kbps), 1,060 KB (Reid desktop, 254 kbps) and 1,125 KB (Reid phone, 280 kbps). At that
budget, small body text smears whenever the camera moves (see the decoded frames in
`_capture/raw/probe/*-B-dec-*.png`): the "compressed to mush" problem returns. The hybrid avoids it
because text is never encoded.

**H.264/MP4:** this Chromium can encode H.264 through WebCodecs. At the same nominal bitrate it produced
1,354, 1,028, 943 and 895 KB of raw stream; at equal visual quality H.264 typically needs about 30 to 50%
more bits than VP9 (rule of thumb, not measured here), so expect 1.4 to 1.7 MB per cut. What is missing
is an MP4 muxer: either a small hand-written one (like the WebM writer, more involved) or an encoder
or package Nathan would have to approve (ffmpeg, or the `mp4-muxer` npm package). The MP4 matters for
older iPhones: recent Safari versions play VP9 WebM, older iOS versions do not (check on a real device), so a production `<video>` should carry
both sources. The hybrid needs MP4 only for its small clips, and degrades to stills if they fail.

## 6. Lighthouse (mobile, simulated Slow 4G, 4x CPU, 3 runs each, median)

Test page: `lh/<variant>/index.html`, a homepage-like page whose only difference is the hero media slot
(Stone Steps phone cut on a 412 px emulated phone).

| Hero media                      | Perf | LCP    | FCP    | CLS | TBT  | Speed Index | Page KB (Lighthouse) |
| ------------------------------- | ---- | ------ | ------ | --- | ---- | ----------- | -------------------- |
| Static screenshot (no showreel) | 100  | 1.05 s | 0.63 s | 0   | 0 ms | 0.63 s      | 32                   |
| A, stills only                  | 100  | 1.20 s | 0.63 s | 0   | 0 ms | 1.39 s      | 410                  |
| Hybrid (A + live clips)         | 100  | 1.20 s | 0.63 s | 0   | 0 ms | 1.36 s      | 581                  |
| B, all video                    | 100  | 0.90 s | 0.63 s | 0   | 0 ms | 0.63 s      | 1,055                |

All three runs per variant agreed to within 0.01 s on LCP after the fix below. Accessibility 100 and
Best Practices 96 for every variant (the 96 is the test page's missing favicon). B's LCP is earlier
only because its poster is smaller (23 KB against 31 KB): B's poster is a 720x900 frame, the hybrid's
is the 780x976 2x opening frame. Speed Index rises for A and the hybrid because the player is a moving
picture inside the first viewport once it starts; that is the showreel doing its job, not a delay.

In every run the LCP element was the poster image (or the video poster for B), CLS was 0 and nothing in
the first viewport started at opacity 0 (only the click ripples, which are decorative, created after
load, and not content).

The first measurement rounds found the real cost and fixed it. Before the fix the player fetched its strips while the poster was still downloading, and the simulated LCP moved from 1.05 s to 2.55 s (stills) and 2.18 s (hybrid). Waiting for `load` plus an idle callback was not enough (runs still split between 1.2 s and 2.2 s, because on a fast local load the requests could still start before the poster painted). The shipped rule is: wait for `load`, decode the poster, wait 700 ms, then an idle callback. The table above is after that fix: +0.15 s LCP over a plain screenshot and a perfect 100.

## 7. Verdict

**Use the hybrid, on case study pages.** It is the only version that shows what a still cannot (the
dot running the loop, the clock ticking, the room filling), it keeps every word razor sharp at rest, it
costs 578 to 966 KB per cut against 1.05 to 1.22 MB for video, and its failure mode is a good still.

**Home hero: stills only, or a single designed still.** A homepage hero should not ask a phone for half
a megabyte before anyone has scrolled. Use the stills-only cut (about 400 KB on phones, all after load)
or simply the reduced-motion still (18 to 68 KB), with the hybrid one click away on the case study.

**Not video.** All-video is the heaviest option and the worst-looking one at a sane budget: the text
smears in every camera move, and it needs an MP4 twin for older iPhones. Its one advantage, a slightly
earlier LCP from a smaller poster, is a poster-size question, not a format question.

## 8. Risks

- Live sites change. The captures are dated 4 October 2026; re-run `capture.mjs` and `build.mjs` (a
  few minutes per cut) when a client site changes. The clock clip shows a real countdown that will
  date; reshoot nearer the race or drop that beat.
- Older iPhones without VP9 WebM: hybrid clips fail silently to stills; B would show only its poster.
  Add MP4 twins before shipping either.
- Bandwidth on phones: 400 to 600 KB per player is fine on a case study, too much for several players
  on one page. Only the player in view loads.
- The player pauses with a real button but has no scrubber; a viewer who wants one beat must wait for
  the loop (13.5 to 15.7 s).
- Strip quality is deliberately low where the camera only passes; a slower move in a future timeline
  would expose it. Keep the rule: if the camera rests, it gets a 2x plate.
- Fake time is reliable for timers, requestAnimationFrame and CSS; a site that animates with
  `setInterval` against real `Date.now()` drift or with WebGL would need a different capture.

## 9. What Nathan needs to approve

1. Whether to adopt the hybrid for case studies and stills or a single still in the home hero.
2. An MP4 path for older iPhones: either approve ffmpeg (system install) or the `mp4-muxer` npm
   package, or approve time to hand-write an MP4 muxer next to the WebM one.
3. Which other client sites get a walkthrough, and permission from those clients to show their live
   sites moving (the captures are of their public pages).

## 10. Files

- `index.html`: demo page (mode switch, both sites, desktop and phone cuts, storyboards, numbers).
- `assets/reel.js` (source), `assets/reel.min.js` (2.3 KB gz), `assets/reel.css`.
- `assets/<site>-<cut>.json` (hybrid) and `-stills.json` timelines; posters, strips, plates, patches,
  `-clip-*.webm`, `-B.webm`, `-B-poster.webp`, `-still.webp`.
- `shots/`: 24 storyboard frames, `STORYBOARD.md`, `weights.json`, `page-bytes.json`,
  `lighthouse-mobile.json`.
- `lh/`: the four Lighthouse test pages.
- `_capture/`: every script (capture, build, render, encode, Lighthouse, weights) and raw captures.
  Run from the MAIN repo folder so Playwright, sharp and Lighthouse resolve.
