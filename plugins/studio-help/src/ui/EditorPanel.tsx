// Safe to edit. The "About this screen" panel in the sidebar of every entry editor.
// It looks up the note for the collection being edited (by slug) in the content
// file and shows what the screen controls, what to leave alone, and what happens on
// Publish. The host draws the panel heading; a collection with no note and no
// `collectionDefault` renders nothing inside it.
import { noteFor } from '../validate.ts';
import { useStudioHelpStyles } from './styles.ts';
import { useHelpContent } from './useHelp.ts';

interface Props {
  collection: string;
}

export function EditorPanel({ collection }: Props) {
  useStudioHelpStyles();
  const { content } = useHelpContent();
  if (!content) return null;
  const note = noteFor(content, collection);
  if (!note) return null;
  return (
    <div className="sh-root sh-panel">
      <p>
        <strong>This controls: </strong>
        {note.controls}
      </p>
      {note.leaveAlone && (
        <p>
          <strong>Leave alone: </strong>
          {note.leaveAlone}
        </p>
      )}
      {note.live && (
        <p>
          <strong>After you publish: </strong>
          {note.live}
        </p>
      )}
    </div>
  );
}
