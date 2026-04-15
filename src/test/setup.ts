import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpa o DOM entre testes. Sem isso, componentes renderizados em testes
// anteriores ficam acumulados e quebram queries por texto/role.
afterEach(() => {
  cleanup();
});
