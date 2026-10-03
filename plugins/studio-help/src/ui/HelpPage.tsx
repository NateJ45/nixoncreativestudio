// Safe to edit. The always-available Help screen (sidebar: Help). Three parts, all
// read from the content file: the tour steps as a written guide (so nobody has to
// replay the pop-up to re-read it), an "I want to change X, go to Y" table, and the
// "leave alone" list plus any extra topics. A button re-launches the tour at any time.
import { useCallback, useState } from 'react';
import { adminHref, paragraphs } from '../engine.ts';
import { useStudioHelpStyles } from './styles.ts';
import { TourModal } from './TourModal.tsx';
import { useHelpContent, useRecordSeen } from './useHelp.ts';

export function HelpPage() {
  useStudioHelpStyles();
  const { content, error } = useHelpContent();
  const [open, setOpen] = useState(false);
  const recordSeen = useRecordSeen(content?.tour.id);
  const onClose = useCallback(
    (how: 'done' | 'skipped') => {
      recordSeen(how);
      setOpen(false);
    },
    [recordSeen],
  );

  if (error) {
    return (
      <div className="sh-root sh-page">
        <h1>Help</h1>
        <p>The help content could not be loaded just now. Reload the page to try again.</p>
      </div>
    );
  }
  if (!content) return <div className="sh-root sh-page" aria-busy="true" />;

  const { tour, help } = content;
  return (
    <div className="sh-root sh-page">
      <h1>{tour.title}</h1>
      {help.intro && <p>{help.intro}</p>}
      <p>
        <button type="button" className="sh-btn sh-btn-primary" onClick={() => setOpen(true)}>
          Take the tour again
        </button>
      </p>

      <h2>The tour, written out</h2>
      <ol className="sh-steps">
        {tour.steps.map((s) => (
          <li key={s.id}>
            <strong>{/[.!?:]$/.test(s.title) ? s.title : `${s.title}.`}</strong>{' '}
            {paragraphs(s.body).map((p, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {p}{' '}
              </span>
            ))}
            {s.path && <a href={adminHref(s.path)}>{s.pathLabel ?? 'Open this screen'}</a>}
          </li>
        ))}
      </ol>

      {help.goals.length > 0 && (
        <>
          <h2>I want to change something</h2>
          <table className="sh-table">
            <thead>
              <tr>
                <th scope="col">I want to change</th>
                <th scope="col">Go to</th>
              </tr>
            </thead>
            <tbody>
              {help.goals.map((g) => (
                <tr key={`${g.want}|${g.path}`}>
                  <td>{g.want}</td>
                  <td>
                    <a href={adminHref(g.path)}>{g.goTo}</a>
                    {g.note && <span className="sh-note">{g.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {help.leaveAlone.length > 0 && (
        <>
          <h2>Leave these alone</h2>
          {help.leaveAlone.map((t) => (
            <div className="sh-topic" key={t.title}>
              <h3>{t.title}</h3>
              {paragraphs(t.body).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {help.topics.map((t) => (
        <section key={t.title}>
          <h2>{t.title}</h2>
          {paragraphs(t.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}

      {open && <TourModal title={tour.title} steps={tour.steps} onClose={onClose} />}
    </div>
  );
}
