import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type MonthYear = { month: number; year: number } | null;

interface AuditoriaState {
  clienteId: string;
  contribuinteId: string;
  dataInicio: MonthYear;
  dataFim: MonthYear;
  hasQueried: boolean;
  setClienteId: (id: string) => void;
  setContribuinteId: (id: string) => void;
  setDataInicio: (d: MonthYear) => void;
  setDataFim: (d: MonthYear) => void;
  setHasQueried: (v: boolean) => void;
  handleLimpar: () => void;
}

const AuditoriaContext = createContext<AuditoriaState | null>(null);

export const AuditoriaProvider = ({ children }: { children: ReactNode }) => {
  const [clienteId, setClienteIdRaw] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [dataInicio, setDataInicio] = useState<MonthYear>(null);
  const [dataFim, setDataFim] = useState<MonthYear>(null);
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
