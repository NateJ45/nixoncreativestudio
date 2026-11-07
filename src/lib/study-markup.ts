/* Small helpers the case study components share: inline text from a prop, and
   the study images in public/assets/study/ with their real width and height,
   so nothing shifts as they load. src/data/study-images.json is the list. */
import images from '../data/study-images.json' with { type: 'json' };

const esc = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A prop's text as HTML: escaped, with **bold** kept. */
export const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export interface StudyImage {
  url: string;
  w: number;
  h: number;
}

/** A study image by its file name, without the extension. A wrong name fails the build. */
export function studyImage(name: string): StudyImage {
  const size = (images as Record<string, { w: number; h: number }>)[name];
  if (!size) throw new Error(`No study image called ${name} in public/assets/study/`);
  return { url: `/assets/study/${name}.webp`, ...size };
}

/** Some captures are cropped clean of the next section; prefer the cropped one. */
export function studyHome(slug: string): StudyImage {
  const all = images as Record<string, unknown>;
  return studyImage(all[`${slug}-home-crop`] ? `${slug}-home-crop` : `${slug}-home`);
}

/** A signature clip's poster size, from its base path in public/media/. */
export function clipPoster(src: string): { w: number; h: number } {
  const base = src.split('/').pop() ?? '';
  const size = (images as Record<string, { w: number; h: number }>)[base];
  if (!size) throw new Error(`No poster for clip ${src}`);
  return size;
}
