/* ============================================================================
   processDurations | how long each of the four process steps takes
   ============================================================================
   Safe to edit.

   In the order of the Home page entry's process steps (Conversation,
   Strategy, Design and build, Launch and follow-through). Drawn by
   ProjectTimeline on /services and by LandingSteps on the three web landing
   pages, so the two can never disagree. They restate the Services FAQ ("How
   long does a typical project take?") and the fourth step's "first month";
   change them together.
   ============================================================================ */

export const PROCESS_DURATIONS = [
  'One hour',
  'The brief sets the timeline',
  'A preview at every milestone',
  'The first month after launch',
] as const;
