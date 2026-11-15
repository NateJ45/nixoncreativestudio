/* A lean sector page: its windows play their footage on hover, and "Try it" scrolls one client's
   real phone page to the answer of the question you tap (the engine shared with /churches/). */
import { ui } from './kit.js';
import { wireAsk } from './ask.js';

ui.wireFootage(document.querySelector('[data-sl-studies]'));
wireAsk(document.querySelector('[data-sun]'));
