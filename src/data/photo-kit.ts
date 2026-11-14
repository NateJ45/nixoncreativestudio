// Safe to edit (names and lines). The kit /photography shows under "The kit".
/* ============================================================================
   The camera, lenses, gimbal and software, as Nathan listed them (2026-11-14).
   Each lens can name a sample: a photo on the page that was shot on it, read
   from the original file's EXIF (lens, focal length, aperture), so the card
   shows real work and the settings it was made at. A unit test checks every
   sample is a photo in the collection. No product renders: the drawings are
   the page's own (a field-of-view wedge per lens, from fovDeg below).
   ============================================================================ */

export interface KitLens {
  maker: string;
  name: string;
  /** Shortest and longest focal length in mm (equal for a prime). */
  focal: [number, number];
  aperture: string;
  /** What it is for, in a few words. */
  role: string;
  /**
   * A photo on the page shot on this lens, and the settings from its EXIF. `at` is left out
   * when the file has none (an Instagram export), and the card says only "Shot on this lens".
   */
  sample?: { slug: string; at?: string };
  /** A macro's reproduction ratio, printed large when there is no sample. */
  macro?: string;
}

export const CAMERA = {
  maker: 'Canon',
  name: 'EOS R6 Mark II',
  // Specifications of the body (Canon's published figures), not claims about any one shoot.
  specs: [
    'Full frame, 24.2 MP',
    '4K video up to 60p',
    'Full HD slow motion up to 180p',
    'In-body stabilisation',
    'Dual card slots',
  ],
  /** The film that plays behind it. */
  film: 'film-music-glass',
  // The second body (Nathan, 2026-11-14), so a shoot never rests on one camera. Many of the
  // older photos on the page were shot on it (their EXIF says so).
  second: { maker: 'Canon', name: 'EOS 6D Mark II', line: 'Full frame, 26.2 MP' },
};

export const LENSES: KitLens[] = [
  {
    maker: 'Tamron',
    name: 'SP 70–200mm f/2.8 Di VC USD G2',
    focal: [70, 200],
    aperture: 'f/2.8',
    role: 'Faces from the back of the room, without walking down the aisle',
    sample: { slug: 'creek-run', at: '144mm, f/3.2' },
  },
  {
    maker: 'Tamron',
    name: 'SP 24–70mm f/2.8 Di VC USD G2',
    focal: [24, 70],
    aperture: 'f/2.8',
    role: 'The everyday zoom, from the whole room to a face',
    sample: { slug: 'souper-haul', at: '24mm, f/4' },
  },
  {
    maker: 'Canon',
    name: 'EF 16–35mm f/4L IS USM',
    focal: [16, 35],
    aperture: 'f/4',
    role: 'Whole sanctuaries and tight rooms',
    sample: { slug: 'piano-hands', at: '35mm, f/4' },
  },
  {
    maker: 'Sigma',
    name: '35mm f/1.4 DG HSM Art',
    focal: [35, 35],
    aperture: 'f/1.4',
    role: 'Low light, and the feel of being in the room',
    sample: { slug: 'vbs-jersey', at: '35mm, f/2.8' },
  },
  {
    maker: 'Canon',
    name: 'EF 50mm f/1.8 STM',
    focal: [50, 50],
    aperture: 'f/1.8',
    role: 'Portraits with a soft background',
    sample: { slug: 'grad-chapel', at: '50mm, f/2.8' },
  },
  {
    maker: 'Tamron',
    name: 'SP 90mm f/2.8 Di Macro 1:1 VC USD',
    focal: [90, 90],
    aperture: 'f/2.8',
    role: 'Close detail: rings, hands, the small things',
    macro: '1:1',
    // From the raw file's EXIF (Nathan, 2026-11-14): 90mm, f/16. The page's copy is an
    // Instagram export with no EXIF of its own.
    sample: { slug: 'ig-vintage-ring-rain', at: '90mm, f/16' },
  },
];

export const GIMBAL = {
  maker: 'DJI',
  name: 'RS 4',
  line: 'A three-axis gimbal, for moving shots that glide instead of shake.',
  film: 'film-greens-garland',
};

/**
 * Shooting since 2017 (Nathan, 2026-11-14). The page prints a count of years, never the year
 * itself: /photography shows no dates, so a visitor never counts back from one.
 */
export const SHOOTING_SINCE = 2017;

/** Whole years behind the camera, as of `now` (the build). */
export function yearsShooting(now = new Date()): number {
  return now.getFullYear() - SHOOTING_SINCE;
}

/** Off-camera lighting (Nathan, 2026-11-14). */
export const LIGHTING = {
  maker: 'Godox',
  title: 'Off-camera flash',
  line: 'For portraits, headshots and rooms where the light is not enough: flash off the camera, shaped and coloured.',
  items: ['Godox AD200 flashes', 'Godox V1', 'Light stands and softboxes', 'Colour gels'],
  /** The strip of gel colours the tile draws (decoration, not a claim about any shot). */
  gels: ['#ff8a2a', '#ff3d7f', '#9b5cff', '#2f6bff', '#16c6b6'],
};

export const SOFTWARE = [
  { maker: 'Adobe', name: 'Lightroom Classic', line: 'Every photo picked, edited and graded' },
  { maker: 'Blackmagic', name: 'DaVinci Resolve', line: 'Every film cut and colour graded' },
];

/**
 * How wide a lens sees across a full-frame sensor (36 mm), in degrees: the angle the
 * card's wedge opens to. 16mm is about 97 degrees, 50mm about 40, 200mm about 10.
 */
export function fovDeg(focal: number, sensorWidth = 36): number {
  return (2 * Math.atan(sensorWidth / (2 * focal)) * 180) / Math.PI;
}

/** "70–200" for a zoom, "35" for a prime. */
export function focalLabel(focal: [number, number]): string {
  return focal[0] === focal[1] ? String(focal[0]) : `${focal[0]}–${focal[1]}`;
}
