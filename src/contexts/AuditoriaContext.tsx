import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuditoriaState {
  clienteId: string;
  contribuinteId: string;
  start_date: Date | null;
  end_date: Date | null;
  hasQueried: boolean;
  setClienteId: (id: string) => void;
  setContribuinteId: (id: string) => void;
  setDataInicio: (d: Date | null) => void;
  setDataFim: (d: Date | null) => void;
  setHasQueried: (v: boolean) => void;
  handleLimpar: () => void;
}

const AuditoriaContext = createContext<AuditoriaState | null>(null);

export const AuditoriaProvider = ({ children }: { children: ReactNode }) => {
  const [clienteId, setClienteIdRaw] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [start_date, setDataInicio] = useState<Date | null>(null);
  const [end_date, setDataFim] = useState<Date | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  const setClienteId = useCallback((id: string) => {
    setClienteIdRaw(id);
    setContribuinteId('');
  }, []);

  const handleLimpar = useCallback(() => {
    setClienteIdRaw('');
    setContribuinteId('');
    setDataInicio(null);
    setDataFim(null);
    setHasQueried(false);
  }, []);

  return (
    <AuditoriaContext.Provider
      value={{
        clienteId, contribuinteId, start_date, end_date, hasQueried,
        setClienteId, setContribuinteId, setDataInicio, setDataFim, setHasQueried, handleLimpar,
      }}
    >
      {children}
    </AuditoriaContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuditoriaStore = () => {
  const ctx = useContext(AuditoriaContext);
  if (!ctx) throw new Error('useAuditoriaStore must be used within AuditoriaProvider');
  return ctx;
};
