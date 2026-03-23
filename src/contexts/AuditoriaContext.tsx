import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuditoriaState {
  clienteId: string;
  contribuinteId: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  hasQueried: boolean;
  setClienteId: (id: string) => void;
  setContribuinteId: (id: string) => void;
  setDataInicio: (d: Date | undefined) => void;
  setDataFim: (d: Date | undefined) => void;
  setHasQueried: (v: boolean) => void;
  handleLimpar: () => void;
}

const AuditoriaContext = createContext<AuditoriaState | null>(null);

export const AuditoriaProvider = ({ children }: { children: ReactNode }) => {
  const [clienteId, setClienteIdRaw] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [hasQueried, setHasQueried] = useState(false);

  const setClienteId = useCallback((id: string) => {
    setClienteIdRaw(id);
    setContribuinteId('');
  }, []);

  const handleLimpar = useCallback(() => {
    setClienteIdRaw('');
    setContribuinteId('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setHasQueried(false);
  }, []);

  return (
    <AuditoriaContext.Provider
      value={{
        clienteId, contribuinteId, dataInicio, dataFim, hasQueried,
        setClienteId, setContribuinteId, setDataInicio, setDataFim, setHasQueried, handleLimpar,
      }}
    >
      {children}
    </AuditoriaContext.Provider>
  );
};

export const useAuditoriaStore = () => {
  const ctx = useContext(AuditoriaContext);
  if (!ctx) throw new Error('useAuditoriaStore must be used within AuditoriaProvider');
  return ctx;
};
