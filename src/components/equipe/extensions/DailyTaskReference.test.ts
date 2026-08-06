import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DAILY_TASK_REFERENCE_NODE,
  DailyTaskReference,
  insertDailyTaskReference,
} from '@/components/equipe/extensions/DailyTaskReference';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('DailyTaskReference', () => {
  it('substitui o gatilho por um nó atômico com código, id e deep-link', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: [Document, Paragraph, Text, DailyTaskReference],
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[' }] }] },
    });

    insertDailyTaskReference(editor, { from: 1, to: 2 }, {
      id: 'task-2',
      title: 'Revisar apuração',
      task_code: 'TR-20',
      href: '/equipe/sprints/sprint-1?taskId=task-2',
    });

    expect(editor.getJSON().content?.[0].content).toEqual([
      {
        type: DAILY_TASK_REFERENCE_NODE,
        attrs: {
          taskId: 'task-2',
          code: 'TR-20',
          title: 'Revisar apuração',
          href: '/equipe/sprints/sprint-1?taskId=task-2',
        },
      },
      { type: 'text', text: ' ' },
    ]);
    expect(editor.getText()).toBe('[TR-20] ');
  });
});
