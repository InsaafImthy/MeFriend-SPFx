import * as React from 'react';
import type { IFilterConfig } from '../../../shared/models/IFilterConfig';
import type { ILookupOption } from '../../../shared/models/ILookupOption';
import type { IAppUser } from '../models/settings/IAppAccessModels';
import { getUserFriendlyError } from '../../../shared/api/apiErrorHandler';
import type { SalespersonService } from '../services/salespersons/salespersonService';
import { normalizeSalespersonCode } from '../utils/salespersonDataScope';

export interface IUseSalespersonFilterResult {
  filters: readonly IFilterConfig[];
  restrictedSalespersonCode?: string;
}

export const useSalespersonFilter = (
  baseFilters: readonly IFilterConfig[],
  salespersonService: SalespersonService,
  currentUser?: IAppUser
): IUseSalespersonFilterResult => {
  const isSalespersonRestricted = currentUser?.isSalesperson === true;
  const restrictedSalespersonCode = isSalespersonRestricted
    ? normalizeSalespersonCode(currentUser.salespersonCode) || undefined
    : undefined;
  const [options, setOptions] = React.useState<readonly ILookupOption[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  const loadOptions = React.useCallback(async (searchText?: string): Promise<void> => {
      setLoading(true);
      setErrorMessage(undefined);

      try {
        const result = await salespersonService.getSalespersonLookup(searchText);
        const lookupItems = result.items;

        const seenCodes = new Set<string>();
        const nextOptions = lookupItems.reduce<ILookupOption[]>((result, item) => {
          const code = normalizeSalespersonCode(item.code);

          if (!code || seenCodes.has(code) || (restrictedSalespersonCode && code !== restrictedSalespersonCode)) {
            return result;
          }

          seenCodes.add(code);
          const name = (item.name || '').trim();
          result.push({
            key: code,
            text: name ? `${name} — ${code}` : code,
            value: code
          });
          return result;
        }, []);

        if (restrictedSalespersonCode && !seenCodes.has(restrictedSalespersonCode)) {
          nextOptions.push({
            key: restrictedSalespersonCode,
            text: restrictedSalespersonCode,
            value: restrictedSalespersonCode
          });
        }

        setOptions(nextOptions);
      } catch (lookupError) {
        setOptions(restrictedSalespersonCode ? [{
          key: restrictedSalespersonCode,
          text: restrictedSalespersonCode,
          value: restrictedSalespersonCode
        }] : []);
        setErrorMessage(getUserFriendlyError(lookupError));
      } finally {
        setLoading(false);
      }
  }, [restrictedSalespersonCode, salespersonService]);

  React.useEffect(() => {
    loadOptions().catch(() => undefined);
  }, [loadOptions]);

  const filters = React.useMemo(() => baseFilters.map(filter => filter.key === 'salespersonCode' ? {
    ...filter,
    options,
    disabled: isSalespersonRestricted,
    loading,
    remoteSearch: !isSalespersonRestricted,
    onSearch: isSalespersonRestricted ? undefined : (query: string) => {
      loadOptions(query).catch(() => undefined);
    },
    errorMessage,
    placeholder: options.length ? 'All' : 'No salespersons available'
  } : filter), [baseFilters, errorMessage, isSalespersonRestricted, loadOptions, loading, options]);

  return {
    filters,
    restrictedSalespersonCode
  };
};
