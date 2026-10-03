// Safe to edit. Types for the one content file (`cms/help/tour.json` in the NCS site).
// Everything the plugin shows comes from a file of this shape; there are no
// site-specific strings anywhere in the plugin code.

/** One stop on the pop-up tour. */
export interface TourStep {
  /** Unique within the tour. Used as a React key and in tests. */
  id: string;
  /** Short heading, 80 characters at most. */
  title: string;
  /** Plain text. A blank line starts a new paragraph. 900 characters at most. */
  body: string;
  /**
   * Optional CSS selector of something on screen to spotlight, for example
   * `a[href$="/content/case_studies"]` for a sidebar link. If nothing matches (the
   * admin was restyled, a group is collapsed) the step simply shows centred.
   */
  target?: string;
  /** Optional admin path (starts with "/") offered as an "Open this screen" link. */
  path?: string;
  /** Link text for `path`. Defaults to "Open this screen". */
  pathLabel?: string;
}

export interface Tour {
  /**
   * Identifies this version of the tour. A user who has seen id "a" sees the tour
   * again when you change it to "b". Lowercase letters, digits and dashes.
   */
  id: string;
  title: string;
  /** One or two sentences under the title on the Help page and the dashboard widget. */
  intro: string;
  /** Show the tour on its own the first time each user opens the dashboard. Default true. */
  autoStart: boolean;
  steps: TourStep[];
}

/** "I want to change X, go to Y". */
export interface HelpGoal {
  want: string;
  /** Plain-language name of the screen, shown as the link text. */
  goTo: string;
  /** Admin path, starts with "/". */
  path: string;
  note?: string;
}

export interface HelpLink {
  label: string;
  path: string;
  description?: string;
}

export interface HelpTopic {
  title: string;
  body: string;
}

export interface Help {
  /** Short paragraph at the top of the Help page. */
  intro: string;
  goals: HelpGoal[];
  /** Short links shown on the dashboard widget. */
  quickLinks: HelpLink[];
  /** "Leave alone" list: screens and settings the editor should not touch. */
  leaveAlone: HelpTopic[];
  /** Free-form extra sections ("Where the editing guide lives", "Who to call"). */
  topics: HelpTopic[];
}

/** The note shown on the editor screen of one collection. */
export interface CollectionNote {
  /** What this screen controls. One or two sentences. */
  controls: string;
  /** What to leave alone on this screen. Optional. */
  leaveAlone?: string;
  /** What happens after Publish. Optional; falls back to `collectionDefault.live`. */
  live?: string;
}

export interface HelpFile {
  version: 1;
  tour: Tour;
  help: Help;
  /** Notes keyed by collection slug (the last part of the admin URL, e.g. `page_home`). */
  collections: Record<string, CollectionNote>;
  /** Shown on collections that have no entry above. Omit to show nothing there. */
  collectionDefault?: CollectionNote;
}

/** What the plugin remembers about one user. */
export interface SeenRecord {
  tourId: string;
  /** ISO time the tour was first shown or completed. */
  at: string;
  /** How the tour ended last: opened (auto), finished, skipped. */
  how: 'auto' | 'done' | 'skipped';
}
