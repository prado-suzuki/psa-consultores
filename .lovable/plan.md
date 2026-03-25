

## Fix SOPConfigModal: upload error + data replication

### File: `src/components/equipe/SOPConfigModal.tsx`

**Change 1 — Line 1:** Add `useEffect` to imports
```typescript
import { useState, useRef, useEffect } from 'react';
```

**Change 2 — After line 153 (after `const [saving, setSaving] = useState(false);`):** Add state reset effect
```typescript
useEffect(() => {
  if (open) {
    setBefore({
      link: currentBeforeLink || '',
      file: null,
      existingDocPath: currentBeforeDocumentPath || null,
      content: currentBeforeContent || '',
    });
    setAfter({
      link: currentLink || '',
      file: null,
      existingDocPath: currentDocumentPath || null,
      content: currentFormattedContent || '',
    });
  }
}, [open, processId]);
```

**Change 3 — Line 156:** Sanitize filename in `uploadFile`
```typescript
const safeName = file.name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '_');
const filePath = `${processId}/${prefix}_${safeName}`;
```

### Scope
- Only `SOPConfigModal.tsx`
- No database changes
- No other files

