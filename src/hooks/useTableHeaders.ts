import { useMemo } from 'react';

export interface HeaderColumn {
  label: string;
  id: string;
  colSpan: number;
  isExpanded: boolean;
  dataKeys: string[];
}

export interface HeaderBottomColumn {
  label: string;
  id: string;
  colSpan: number;
  dataKeys: string[];
}

interface UseTableHeadersParams {
  columnsData: { periods: string[]; yearsMap: Map<string, string[]> };
  expandedYear: string | null;
}

export function useTableHeaders({ columnsData, expandedYear }: UseTableHeadersParams) {
  return useMemo(() => {
    const headerRow1: HeaderColumn[] = [];
    const headerRow2: HeaderBottomColumn[] = [];

    if (columnsData?.yearsMap) {
      Array.from(columnsData.yearsMap.entries()).forEach(([year, months]) => {
        if (expandedYear === year) {
          headerRow1.push({ label: year, id: year, colSpan: months.length, isExpanded: true, dataKeys: months });
          months.forEach(m => {
            headerRow2.push({ label: m.split('-').reverse().join('/'), id: m, colSpan: 1, dataKeys: [m] });
          });
        } else {
          headerRow1.push({ label: year, id: year, colSpan: 1, isExpanded: false, dataKeys: months });
        }
      });
    }

    const hasExpandedYear = expandedYear !== null;
    const headerRowsCount = hasExpandedYear ? 2 : 1;

    const headerBottom: HeaderBottomColumn[] = hasExpandedYear
      ? [...headerRow1.filter(y => !y.isExpanded), ...headerRow2]
      : headerRow1;

    headerBottom.sort((a, b) => a.dataKeys[0].localeCompare(b.dataKeys[0]));

    return {
      headerRow1,
      headerRow2,
      hasExpandedYear,
      headerRowsCount,
      headerBottom,
    };
  }, [columnsData, expandedYear]);
}