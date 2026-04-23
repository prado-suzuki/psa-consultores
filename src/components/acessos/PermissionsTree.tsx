import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { PagePermission } from '@/hooks/usePagePermissions';
import type { UserPageAccessRecord } from '@/hooks/useUserPageAccess';
import { useBulkUpdatePageAccess } from '@/hooks/useUserPageAccess';
import {
  getGroupColor,
  getGroupKey,
  getGroupLabel,
  getDisplayPath,
  getTreeNodeLabelOverride,
} from './pageCategoryStyles';

interface TreeNode {
  segment: string;
  path: string;
  page: PagePermission | null;
  children: TreeNode[];
}

const buildTree = (pages: PagePermission[]): TreeNode[] => {
  const root: TreeNode = { segment: '', path: '', page: null, children: [] };
  const sorted = [...pages].sort((a, b) =>
    getDisplayPath(a.category, a.page_path).localeCompare(getDisplayPath(b.category, b.page_path))
  );
  for (const page of sorted) {
    const segments = getDisplayPath(page.category, page.page_path).split('/').filter(Boolean);
    let current = root;
    let acc = '';
    for (const seg of segments) {
      acc += '/' + seg;
      let child = current.children.find((c) => c.segment === seg);
      if (!child) {
        child = { segment: seg, path: acc, page: null, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.page = page;
  }
  return root.children;
};

interface Descendant {
  id: string;
  grantable: boolean;
}

const collectDescendants = (node: TreeNode, userIsAdmin: boolean, out: Descendant[]) => {
  if (node.page) {
    out.push({
      id: node.page.id,
      grantable: userIsAdmin || !node.page.requires_admin,
    });
  }
  for (const child of node.children) collectDescendants(child, userIsAdmin, out);
};

interface PermissionsTreeProps {
  userId: string;
  userIsAdmin: boolean;
  pages: PagePermission[];
  userAccess: UserPageAccessRecord[];
}

export const PermissionsTree = ({ userId, userIsAdmin, pages, userAccess }: PermissionsTreeProps) => {
  const bulkUpdate = useBulkUpdatePageAccess();

  const grantedIds = useMemo(
    () => new Set(userAccess.filter((a) => a.user_id === userId).map((a) => a.page_permission_id)),
    [userAccess, userId]
  );

  const groups = useMemo(() => {
    const grouped = pages.reduce<Record<string, PagePermission[]>>((acc, page) => {
      const key = getGroupKey(page.category);
      (acc[key] ??= []).push(page);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([group, groupPages]) => ({
        group,
        trees: buildTree(groupPages),
      }))
      .sort((a, b) => getGroupLabel(a.group).localeCompare(getGroupLabel(b.group)));
  }, [pages]);

  // Mapa path -> page, para calcular ancestrais reais ao conceder folhas.
  const pageByPath = useMemo(() => {
    const m = new Map<string, PagePermission>();
    for (const p of pages) m.set(p.page_path, p);
    return m;
  }, [pages]);

  const ancestorPageIdsToGrant = (path: string): string[] => {
    const segments = path.split('/').filter(Boolean);
    const ids: string[] = [];
    let acc = '';
    for (let i = 0; i < segments.length - 1; i++) {
      acc += '/' + segments[i];
      const page = pageByPath.get(acc);
      if (page && (userIsAdmin || !page.requires_admin) && !grantedIds.has(page.id)) {
        ids.push(page.id);
      }
    }
    return ids;
  };

  const handleToggle = (node: TreeNode) => {
    const descendants: Descendant[] = [];
    collectDescendants(node, userIsAdmin, descendants);
    const grantable = descendants.filter((d) => d.grantable);
    if (grantable.length === 0) return;

    const allGranted = grantable.every((d) => grantedIds.has(d.id));

    if (allGranted) {
      const revokeIds = grantable.map((d) => d.id).filter((id) => grantedIds.has(id));
      if (revokeIds.length > 0) bulkUpdate.mutate({ userId, grantIds: [], revokeIds });
    } else {
      const subtreeGrantIds = grantable.map((d) => d.id).filter((id) => !grantedIds.has(id));
      const ancestorGrantIds = ancestorPageIdsToGrant(node.path);
      const grantIds = Array.from(new Set([...subtreeGrantIds, ...ancestorGrantIds]));
      if (grantIds.length > 0) bulkUpdate.mutate({ userId, grantIds, revokeIds: [] });
    }
  };

  if (pages.length === 0) {
    return <div className="text-sm text-slate-500">Nenhuma página registrada.</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map(({ group, trees }) => (
        <div key={group} className="space-y-2">
          <Badge className={getGroupColor(group)}>{getGroupLabel(group)}</Badge>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
            {trees.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                userIsAdmin={userIsAdmin}
                grantedIds={grantedIds}
                onToggle={handleToggle}
                disabled={bulkUpdate.isPending}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  userIsAdmin: boolean;
  grantedIds: Set<string>;
  onToggle: (node: TreeNode) => void;
  disabled: boolean;
}

const TreeRow = ({ node, depth, userIsAdmin, grantedIds, onToggle, disabled }: TreeRowProps) => {
  const [open, setOpen] = useState(depth < 1);

  const descendants = useMemo(() => {
    const out: Descendant[] = [];
    collectDescendants(node, userIsAdmin, out);
    return out;
  }, [node, userIsAdmin]);

  const grantable = descendants.filter((d) => d.grantable);
  const grantedCount = grantable.filter((d) => grantedIds.has(d.id)).length;
  const total = grantable.length;

  const state: 'checked' | 'unchecked' | 'indeterminate' | 'disabled' =
    total === 0
      ? 'disabled'
      : grantedCount === 0
        ? 'unchecked'
        : grantedCount === total
          ? 'checked'
          : 'indeterminate';

  const hasChildren = node.children.length > 0;
  const label =
    getTreeNodeLabelOverride(node.path) ?? node.page?.page_name ?? node.segment;
  const subtitle = node.path;

  const indent = { paddingLeft: `${depth * 16 + 4}px` } as const;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white transition-colors"
        style={indent}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 ${
            hasChildren ? '' : 'invisible'
          }`}
          aria-label={open ? 'Colapsar' : 'Expandir'}
          tabIndex={hasChildren ? 0 : -1}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <Checkbox
          checked={
            state === 'checked' ? true : state === 'indeterminate' ? 'indeterminate' : false
          }
          disabled={state === 'disabled' || disabled}
          onCheckedChange={() => onToggle(node)}
          aria-label={`Permissão para ${label}`}
          className="border-slate-300"
        />

        <button
          type="button"
          className="flex-1 text-left flex items-baseline gap-2 min-w-0"
          onClick={() => (hasChildren ? setOpen((v) => !v) : onToggle(node))}
          disabled={disabled || (!hasChildren && state === 'disabled')}
        >
          <span className="text-sm text-slate-900 truncate">{label}</span>
          <span className="text-xs text-slate-400 truncate">{subtitle}</span>
        </button>

        {state === 'disabled' && !hasChildren && (
          <span className="text-xs italic text-slate-400" title="Requer permissão de administrador">
            Requer admin
          </span>
        )}
        {total > 0 && hasChildren && (
          <span className="text-xs text-slate-400 tabular-nums">
            {grantedCount}/{total}
          </span>
        )}
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              userIsAdmin={userIsAdmin}
              grantedIds={grantedIds}
              onToggle={onToggle}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
