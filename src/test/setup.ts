import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom não implementa scrollIntoView — o Select (dropdown custom) chama ao abrir.
// No-op para os testes que interagem com listas suspensas.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Polyfill de Web Storage em memória.
//
// No Node 24+ a Web Storage API nativa vem ligada por padrão e define um global
// `localStorage` ANTES do jsdom carregar. Sem um `--localstorage-file` válido
// esse global é um objeto não-funcional (sem clear/getItem/setItem) que o jsdom
// não consegue substituir — então `localStorage.clear()` etc. lançam TypeError.
// Aqui instalamos um Storage funcional e isolado por teste, independente da
// versão do Node e de quem fornece o global.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage') {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
}

// Install before test modules import clients that capture the storage reference.
const testLocalStorage = installStorage('localStorage');
const testSessionStorage = installStorage('sessionStorage');

// Storage limpo antes de cada teste (substitui o global quebrado do Node).
beforeEach(() => {
  testLocalStorage.clear();
  testSessionStorage.clear();
});

// Limpa o DOM entre testes. Sem isso, componentes renderizados em testes
// anteriores ficam acumulados e quebram queries por texto/role.
afterEach(() => {
  cleanup();
});
