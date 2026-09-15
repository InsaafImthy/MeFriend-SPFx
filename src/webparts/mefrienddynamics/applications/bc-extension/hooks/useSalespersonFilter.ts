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

  React.useEffect(() => {
    let isMounted = true;

    const loadOptions = async (): Promise<void> => {
      setLoading(true);
      setErrorMessage(undefined);

      try {
        const lookupItems = await salespersonService.getSalespersonLookup();

        if (!isMounted) {
          return;
        }

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
        if (!isMounted) {
          return;
        }

        setOptions(restrictedSalespersonCode ? [{
          key: restrictedSalespersonCode,
          text: restrictedSalespersonCode,
          value: restrictedSalespersonCode
        }] : []);
        setErrorMessage(getUserFriendlyError(lookupError));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOptions().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [restrictedSalespersonCode, salespersonService]);

  const filters = React.useMemo(() => baseFilters.map(filter => filter.key === 'salespersonCode' ? {
    ...filter,
    options,
    disabled: isSalespersonRestricted,
    loading,
    errorMessage,
    placeholder: options.length ? 'All' : 'No salespersons available'
  } : filter), [baseFilters, errorMessage, isSalespersonRestricted, loading, options]);

  return {
    filters,
    restrictedSalespersonCode
  };
};
