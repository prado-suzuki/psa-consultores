import { createContext, useContext, useState, type ReactNode } from 'react';

interface OsgWorkState {
  clienteId: string;
  setClienteId: (id: string) => void;
}

const OsgWorkContext = createContext<OsgWorkState | null>(null);

export const OsgWorkProvider = ({ children }: { children: ReactNode }) => {
  const [clienteId, setClienteId] = useState('');

  return (
    <OsgWorkContext.Provider value={{ clienteId, setClienteId }}>
      {children}
    </OsgWorkContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOsgWork = () => {
  const ctx = useContext(OsgWorkContext);
  if (!ctx) throw new Error('useOsgWork must be used within OsgWorkProvider');
  return ctx;
};
