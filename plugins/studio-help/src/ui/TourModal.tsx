// Safe to edit. The pop-up tour: a modal card, optionally pointing at something on
// screen with a spotlight. All the step logic lives in ../engine.ts; this file is
// the DOM side.
//
// Accessibility: role="dialog" + aria-modal, labelled by the step title and described
// by the step body; the step counter is an aria-live region; focus moves to the Next
// button when the tour opens, is trapped inside the card (Tab and Shift+Tab wrap),
// Escape skips, Left/Right arrows go back/next, and focus returns to whatever opened
// the tour when it closes. Every control is a real <button> or <a>. Motion: the card
// only animates its position inside `prefers-reduced-motion: no-preference` (styles.ts).
// Themes: colours come from the admin's own variables, so light and dark both work.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  adminHref,
  back,
  goTo,
  isFirst,
  isLast,
  next,
  paragraphs,
  placeCard,
  progressLabel,
  skip,
  startTour,
  type Box,
  type Placement,
  type TourState,
} from '../engine.ts';
import type { SeenRecord, TourStep } from '../types.ts';
import { useStudioHelpStyles } from './styles.ts';
import { findTarget } from './target.ts';

export interface TourModalProps {
  title: string;
  steps: TourStep[];
  /** Called once when the tour ends: finished ("done") or skipped. */
  onClose: (how: Exclude<SeenRecord['how'], 'auto'>) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function toBox(el: Element): Box {
  const r = el.getBoundingClientRect();
  // A little padding so the spotlight does not hug the element.
  const pad = 6;
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

export function TourModal({ title, steps, onClose }: TourModalProps) {
  useStudioHelpStyles();
  const [state, setState] = useState<TourState>(() => startTour(steps.length));
  const [target, setTarget] = useState<Box | null>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const closedRef = useRef(false);

  const step = steps[Math.min(state.index, steps.length - 1)];

  // Remember what had focus, so it can be given back; focus the Next button.
  useEffect(() => {
    openerRef.current = document.activeElement;
    nextRef.current?.focus();
    return () => {
      const el = openerRef.current;
      if (el instanceof HTMLElement && document.contains(el)) el.focus();
    };
  }, []);

  // Tell the parent exactly once when the tour ends.
  useEffect(() => {
    if (!state.open && state.ended && !closedRef.current) {
      closedRef.current = true;
      onClose(state.ended);
    }
  }, [state, onClose]);

  // Find and follow the spotlighted element for the current step.
  const measure = useCallback(() => {
    const el = findTarget(step?.target);
    setTarget(el ? toBox(el) : null);
  }, [step?.target]);

  useLayoutEffect(() => {
    const el = findTarget(step?.target);
    if (el) {
      // `nearest` and no smooth behaviour: it never animates, so it is reduced-motion safe.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step?.target, measure]);

  // Place the card once we know its size and the target's box.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    setPlace(
      placeCard(
        target,
        { width: r.width, height: r.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [target, state.index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setState((s) => skip(s));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setState((s) => next(s));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setState((s) => back(s));
    } else if (e.key === 'Tab') {
      // Focus trap: wrap inside the card.
      const nodes = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !cardRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !cardRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!state.open || !step) return null;

  const titleId = `sh-title-${step.id}`;
  const bodyId = `sh-body-${step.id}`;
  const style = place
    ? { top: place.top, left: place.left }
    : // First paint, before measuring: centred, invisible to the eye for one frame.
      { top: '20vh', left: '50%', transform: 'translateX(-50%)' };

  return createPortal(
    <div className="sh-root" onKeyDown={onKeyDown}>
      <div className="sh-backdrop" data-spot={target ? 'true' : 'false'} />
      {target && (
        <div
          className="sh-spot"
          aria-hidden="true"
          style={{ top: target.top, left: target.left, width: target.width, height: target.height }}
        />
      )}
      <div
        ref={cardRef}
        className="sh-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`sh-tour-name ${titleId}`}
        aria-describedby={bodyId}
        tabIndex={-1}
        style={style}
      >
        {/* Read first when the dialog opens: the tour's name, then the step's own title. */}
        <span className="sh-sr" id="sh-tour-name">
          {title}
          {': '}
        </span>
        <p className="sh-step" aria-live="polite">
          {progressLabel(state)}
        </p>
        <h2 className="sh-title" id={titleId}>
          {step.title}
        </h2>
        <div className="sh-body" id={bodyId}>
          {paragraphs(step.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {step.path && (
          <a className="sh-open" href={adminHref(step.path)}>
            {step.pathLabel ?? 'Open this screen'}
          </a>
        )}
        <div className="sh-dots" role="group" aria-label="Tour progress">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="sh-dot"
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === state.index ? 'step' : undefined}
              onClick={() => setState((st) => goTo(st, i))}
            />
          ))}
        </div>
        <div className="sh-actions">
          <button type="button" className="sh-btn sh-btn-link" onClick={() => setState(skip)}>
            Skip tour
          </button>
          <div className="sh-actions-right">
            <button
              type="button"
              className="sh-btn"
              disabled={isFirst(state)}
              onClick={() => setState(back)}
            >
              Back
            </button>
            <button
              ref={nextRef}
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => setState(next)}
            >
              {isLast(state) ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
