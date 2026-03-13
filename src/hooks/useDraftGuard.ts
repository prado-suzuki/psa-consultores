import { useState, useCallback, useMemo } from "react";

type TabKey = "cliente" | "contribuintes" | "participantes" | "contratos" | "faturamento";

export type InterceptedAction =
  | { type: "close" }
  | { type: "navigate"; targetTab: TabKey }
  | { type: "save" }
  | null;

interface UseDraftGuardOptions {
  activeTab: TabKey;
  hasDraftEntityData: () => boolean;
  hasDraftParticipantData: () => boolean;
  hasDraftContractData: () => boolean;
  hasUnsavedChanges: boolean;
}

export function useDraftGuard({
  activeTab,
  hasDraftEntityData,
  hasDraftParticipantData,
  hasDraftContractData,
  hasUnsavedChanges,
}: UseDraftGuardOptions) {
  const [interceptedAction, setInterceptedAction] = useState<InterceptedAction>(null);

  const pendingTabs = useMemo(() => {
    const tabs: string[] = [];
    if (hasDraftEntityData()) tabs.push("Contribuintes");
    if (hasDraftParticipantData()) tabs.push("Participantes");
    if (hasDraftContractData()) tabs.push("OS");
    return tabs;
  }, [hasDraftEntityData, hasDraftParticipantData, hasDraftContractData]);

  const guard = useCallback(
    (action: NonNullable<InterceptedAction>): boolean => {
      if (action.type === "close") {
        // For close: check unsaved changes OR pending drafts
        if (hasUnsavedChanges || pendingTabs.length > 0) {
          setInterceptedAction(action);
          return true;
        }
        return false;
      }

      if (action.type === "navigate") {
        // Only warn about the CURRENT tab's draft
        const currentTabHasDraft =
          (activeTab === "contribuintes" && hasDraftEntityData()) ||
          (activeTab === "participantes" && hasDraftParticipantData()) ||
          (activeTab === "contratos" && hasDraftContractData());

        if (currentTabHasDraft) {
          setInterceptedAction(action);
          return true;
        }
        return false;
      }

      if (action.type === "save") {
        if (pendingTabs.length > 0) {
          setInterceptedAction(action);
          return true;
        }
        return false;
      }

      return false;
    },
    [activeTab, hasUnsavedChanges, pendingTabs, hasDraftEntityData, hasDraftParticipantData, hasDraftContractData],
  );

  const dismiss = useCallback(() => setInterceptedAction(null), []);

  const proceed = useCallback(() => {
    const action = interceptedAction;
    setInterceptedAction(null);
    return action;
  }, [interceptedAction]);

  return { interceptedAction, pendingTabs, guard, dismiss, proceed };
}
