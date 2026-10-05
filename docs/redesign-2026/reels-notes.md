# Home reel live clips: notes

Short directed clips of what really moves on each client site, for the centre frame of the home hero reel and the proof sheet (round 2 of the redesign, 2026-10-04). The hero agent wires them; this file says what they are and how to make them again.

## What is in `public/reel/home/`

For each site a desktop clip and a phone clip, each with a WebP poster that is the exact first frame, plus `manifest.json`:

```json
{
  "clips": {
    "<reel slide id>": {
      "site": "...",
      "title": "...",
      "url": "...",
      "status": "live | launching soon",
      "moves": "one line: what moves",
      "facts": ["checkable sentences"],
      "captured": "YYYY-MM-DD",
      "d": {
        "webm": "/reel/home/<id>-d.webm",
        "poster": "/reel/home/<id>-d.webp",
        "w": 960,
        "h": 600,
        "bytes": 0,
        "posterBytes": 0,
        "duration": 0,
        "fps": 24,
        "bitrate": 0,
        "markers": {}
      },
      "m": { "...": "same, 390x488" }
    }
  }
}
```

- Keys are the hero reel slide ids in `src/lib/homeWork.ts`: `ss-home`, `frt-home`, `tm-article` (the audio player is on the article page), `mas-home`, `fbcm-home`. `rd-home` is Reid Design, which is not on the home curation; it is for its case study.
- Desktop clips are 960x600 (16:10, the still's 1600x1000 shape); phone clips are 390x488 (the still's 1170x1464 shape). Every clip opens on its still's own framing, the top of the page in a 1200x750 (desktop) or 390x844 (phone) viewport, so a clip can sit over its still without a jump.
- Caps, enforced by `src/lib/reelManifest.test.ts` (with the file sizes, the shapes and a 6 to 9 s length): desktop 260 KB, phone 160 KB. VP9 in WebM, 24 fps, muted (there is no audio track at all), seamless loop.
- `markers` gives the time in seconds of the moments a player might care about (the click, the menu opening).

| Slide        | Site                             | What moves                                                                      | Desktop       | Phone         |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------- | ------------- | ------------- |
| `ss-home`    | Stone Steps 50K                  | Race clock ticks; course map runs, short loop picked; records board             | 7.9 s, 246 KB | 8.6 s, 145 KB |
| `rd-home`    | Reid Design                      | Concept room fills as the page scrolls; Sage picked, walls repaint              | 8.1 s, 234 KB | 8.9 s, 150 KB |
| `frt-home`   | Foundation for Reformed Theology | Library menu opens; "Calvin" typed into the search; the results page follows    | 7.8 s, 236 KB | 6.1 s, 145 KB |
| `tm-article` | Theology Matters                 | Essay scrolls to "Listen to this essay"; play pressed; the player counts        | 7.5 s, 242 KB | 6.3 s, 122 KB |
| `mas-home`   | MAS Monograms                    | Monogram maker: Script picked and stitched (desktop: then Navy Canvas cloth)    | 7.0 s, 247 KB | 6.2 s, 141 KB |
| `fbcm-home`  | First Baptist Church, Muncie     | Hero photos cross-fade; Our Church menu (desktop) or the phone menu; hymn board | 7.1 s, 249 KB | 6.4 s, 153 KB |

FBCM is the new build on `fbcm-site.nathanjnixon86.workers.dev`, labelled "launching soon" in the manifest; never capture www.fbcmuncie.org (still the old Wix site). Reid Design is live (since 30 September 2026); its concept room is a feature of the live site.

## Making them again

```sh
node scripts/brand/capture-reels.mjs                 # all six sites, both cuts (about 25 minutes)
node scripts/brand/capture-reels.mjs ss-home d       # one clip
REUSE=1 node scripts/brand/capture-reels.mjs ss-home # re-encode the last capture only
MANIFEST_ONLY=1 node scripts/brand/capture-reels.mjs # rewrite the manifest text after editing a shot list's facts
```

Then look at `node_modules/.cache/nx-reels/review/<id>-<cut>-sheet.png` (a frame every half second, decoded from the real file, so it shows the real compression) and a few full frames beside it, run `npm run test:unit`, and commit. Live sites change: re-shoot when a client edits a page a clip shows. The Stone Steps clock counts down to a race date and will look dated after the race.

## How it works

- `scripts/brand/reel-director.mjs`: the camera, cursor and frame clock. Playwright loads the live page; time is frozen (the fake clock drives timers and `requestAnimationFrame`, the CDP animation timeline is set to rate 0, CSS animations and `<video>` are stepped by hand 1/30 s per frame), so every frame is exact whatever the speed of the PC. The camera is a crop rectangle over a 2x viewport screenshot, zoomed in log space; the page itself really scrolls; the cursor is drawn (headless Chromium paints none) on a curved path while the real mouse moves with it, so hover states are real; clicks and taps are real events.
- Theology Matters is the exception: its player is a cross-origin ElevenLabs iframe whose clock is the audio itself, so that clip runs against the wall clock (`realtime`) and the frames after Play are resampled to 30 fps. The browser is launched with `--mute-audio`; the clip has no sound.
- `scripts/brand/reel-encoder.html`: composes each frame on a canvas (crop, cursor, ripples, dissolves), encodes VP9 with WebCodecs, muxes WebM with a small hand-written writer (ported from the d8 showreel), then decodes its own output for the review frames. No ffmpeg, no npm package.
- `scripts/brand/capture-reels.mjs`: the six shot lists, the encode loop and the manifest.

## Directing rules (from d8 `RATIONALE.md`)

One move at a time; moves of 600 to 900 ms on an in-out curve; holds of 400 to 800 ms, longer where something live is playing; the cursor moves only while the camera is still, dips on press and leaves a ripple only where a click really happens (FBCM's desktop menu opens on hover, so it has no ripple); on phones a finger dot appears where it lands instead of a travelling arrow; every loop closes with a 0.6 s dissolve into the exact first frame.

## The byte budget (measured)

- Chromium's VP9 has a floor: below roughly 100 kbps it stops honouring the target and the file stays the same size. The first Stone Steps cut, which scrolled 1,000 px over the hero video and pushed in on the clock, measured 269 KB at its smallest, over the 260 KB cap. Per half second, the scroll and push-in alone cost 83 KB; a 0.35 s dissolve cut to the same framing costs about 30 KB. So long moves between sections are dissolve cuts, and camera moves stay within one screen.
- 24 fps instead of 30 cut about 15% at the same quality; the clips are captured at 30 and every fifth frame is dropped at encode.
- The encoder aims, measures and re-aims until the file lands between 88% and 97% of the cap, then keeps the largest that fits (the best quality the cap allows).
- Legibility first: if a clip will not fit, trim it or cut a move before lowering the resolution.

## Honest-capture rules

- Read-only by construction: any non-GET request to the client's own site, and any non-GET navigation anywhere, is refused by the director, so no form can be submitted (third-party players keep working). Fields are typed into and buttons pressed, never Send or Submit.
- Foundation for Reformed Theology: the clip types "Calvin" into the library search and then dissolves to the results page for "Calvin", loaded by its own address. The form itself is never submitted; the dissolve (no click, no ripple) is the edit.
- Theology Matters: the site's reader-supported pop-up is closed with its own close button before frame 0 (the hero still has no pop-up either).
- The monogram initials are the site's own default ("MAS"); nothing personal is typed anywhere. The records board shows the public course records the client publishes.

## Not done

- No MP4 twin. Older iPhones without VP9 WebM will show the poster (a good still). An MP4 needs ffmpeg or a muxer package, which is Nathan's call (d8 `RATIONALE.md` section 9).
