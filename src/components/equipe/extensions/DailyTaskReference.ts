import { Node, mergeAttributes, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export const DAILY_TASK_REFERENCE_NODE = 'dailyTaskReference';
export const DAILY_TASK_REFERENCE_PLUGIN_KEY = new PluginKey('dailyTaskReference');

export interface DailyTaskReferenceItem {
  id: string;
  title: string;
  task_code: string | null;
  href: string;
}

interface DailyTaskReferenceOptions {
  tasks: () => DailyTaskReferenceItem[];
  render: SuggestionOptions<DailyTaskReferenceItem, DailyTaskReferenceItem>['render'];
}

export function insertDailyTaskReference(editor: Editor, range: Range, task: DailyTaskReferenceItem) {
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      {
        type: DAILY_TASK_REFERENCE_NODE,
        attrs: {
          taskId: task.id,
          code: task.task_code || task.title,
          title: task.title,
          href: task.href,
        },
      },
      { type: 'text', text: ' ' },
    ])
    .run();
}

export const DailyTaskReference = Node.create<DailyTaskReferenceOptions>({
  name: DAILY_TASK_REFERENCE_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,

  addOptions() {
    return { tasks: () => [], render: undefined };
  },

  addAttributes() {
    return {
      taskId: { default: '' },
      code: { default: '' },
      title: { default: '' },
      href: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-daily-task-reference]',
        getAttrs: (element) => {
          const anchor = element as HTMLAnchorElement;
          return {
            taskId: anchor.dataset.dailyTaskReference ?? '',
            code: (anchor.textContent ?? '').replace(/^\[|\]$/g, ''),
            title: anchor.title,
            href: anchor.getAttribute('href') ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-daily-task-reference': node.attrs.taskId,
        href: node.attrs.href,
        title: `Abrir tarefa: ${node.attrs.title}`,
        class: 'daily-task-reference',
        contenteditable: 'false',
      }),
      `[${node.attrs.code}]`,
    ];
  },

  renderText({ node }) {
    return `[${node.attrs.code}]`;
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<DailyTaskReferenceItem, DailyTaskReferenceItem>({
        editor: this.editor,
        pluginKey: DAILY_TASK_REFERENCE_PLUGIN_KEY,
        char: '[',
        allowedPrefixes: null,
        items: () => this.options.tasks(),
        command: ({ editor, range, props }) => insertDailyTaskReference(editor, range, props),
        render: this.options.render,
      }),
    ];
  },
});
