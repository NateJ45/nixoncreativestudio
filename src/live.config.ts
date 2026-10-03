// Foundation, edit with care.
// Lets Astro's content layer read EmDash collections at request time.
import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
