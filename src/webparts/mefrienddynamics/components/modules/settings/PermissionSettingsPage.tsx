import * as React from 'react';
import type { IEditablePermissionSetting, PermissionKey } from '../../../models/common/IPermissionModels';
import type { PermissionService } from '../../../services/sharepoint/permissionService';
import { Button } from '../../common/buttons/Button';
import { ErrorState } from '../../common/errorState/ErrorState';
import { InputField } from '../../common/inputs/InputField';
import { AppLoader } from '../../common/loaders/AppLoader';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';
import styles from './PermissionSettingsPage.module.scss';

interface ILocalPermissionSetting extends IEditablePermissionSetting {
  roleText: string;
  saving: boolean;
  deleting: boolean;
}

export interface IPermissionSettingsPageProps {
  permissionService: PermissionService;
  onPermissionsChanged: () => Promise<void>;
}

const toRoleText = (groupNames: readonly string[]): string => groupNames.join('; ');

const toGroupNames = (roleText: string): readonly string[] =>
  roleText
    .split(';')
    .map(groupName => groupName.trim())
    .filter(groupName => !!groupName);

const toLocalSetting = (setting: IEditablePermissionSetting): ILocalPermissionSetting => ({
  ...setting,
  roleText: toRoleText(setting.allowedSharePointGroupNames),
  saving: false,
  deleting: false
});

export const PermissionSettingsPage: React.FC<IPermissionSettingsPageProps> = ({ permissionService, onPermissionsChanged }) => {
  const toast = useToast();
  const [settings, setSettings] = React.useState<readonly ILocalPermissionSetting[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>();

  const loadSettings = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const editableSettings = await permissionService.getEditablePermissionSettings();
      setSettings(editableSettings.map(toLocalSetting));
    } catch {
      setError('Unable to load permission settings.');
    } finally {
      setLoading(false);
    }
  }, [permissionService]);

  React.useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

  const updateSetting = React.useCallback((permissionKey: PermissionKey, updater: (setting: ILocalPermissionSetting) => ILocalPermissionSetting): void => {
    setSettings(currentSettings =>
      currentSettings.map(setting => (setting.permissionKey === permissionKey ? updater(setting) : setting))
    );
  }, []);

  const handleSave = React.useCallback(
    async (permissionKey: PermissionKey): Promise<void> => {
      const currentSetting = settings.filter(setting => setting.permissionKey === permissionKey)[0];

      if (!currentSetting) {
        return;
      }

      updateSetting(permissionKey, setting => ({ ...setting, saving: true }));

      try {
        await permissionService.savePermissionSetting({
          permissionKey,
          enabled: currentSetting.enabled,
          allowedSharePointGroupNames: toGroupNames(currentSetting.roleText)
        });
        toast.success('Permission setting saved.');
        await loadSettings();
        await onPermissionsChanged();
      } catch {
        toast.error('Unable to save permission setting. Confirm the SharePoint settings list exists and you can edit it.');
      } finally {
        updateSetting(permissionKey, setting => ({ ...setting, saving: false }));
      }
    },
    [loadSettings, onPermissionsChanged, permissionService, settings, toast, updateSetting]
  );

  const handleDisable = React.useCallback(
    async (permissionKey: PermissionKey): Promise<void> => {
      updateSetting(permissionKey, setting => ({ ...setting, enabled: false }));
      const currentSetting = settings.filter(setting => setting.permissionKey === permissionKey)[0];

      if (!currentSetting) {
        return;
      }

      updateSetting(permissionKey, setting => ({ ...setting, saving: true }));

      try {
        await permissionService.savePermissionSetting({
          permissionKey,
          enabled: false,
          allowedSharePointGroupNames: toGroupNames(currentSetting.roleText)
        });
        toast.success('Access removed for this permission.');
        await loadSettings();
        await onPermissionsChanged();
      } catch {
        toast.error('Unable to remove access. Confirm the SharePoint settings list exists and you can edit it.');
      } finally {
        updateSetting(permissionKey, setting => ({ ...setting, saving: false }));
      }
    },
    [loadSettings, onPermissionsChanged, permissionService, settings, toast, updateSetting]
  );

  const handleReset = React.useCallback(
    async (permissionKey: PermissionKey): Promise<void> => {
      updateSetting(permissionKey, setting => ({ ...setting, deleting: true }));

      try {
        await permissionService.deletePermissionSetting(permissionKey);
        toast.success('Permission setting reset to configuration.');
        await loadSettings();
        await onPermissionsChanged();
      } catch {
        toast.error('Unable to reset permission setting.');
      } finally {
        updateSetting(permissionKey, setting => ({ ...setting, deleting: false }));
      }
    },
    [loadSettings, onPermissionsChanged, permissionService, toast, updateSetting]
  );

  const actions = <Button label="Refresh" variant="secondary" onClick={() => loadSettings().catch(() => undefined)} />;

  return (
    <PageContainer
      title="Permission Settings"
      description="Manage module access and create permissions by SharePoint role/group."
      actions={actions}
    >
      {loading ? <AppLoader label="Loading permission settings" /> : null}
      {!loading && error ? <ErrorState title="Unable to load settings" message={error} retry={() => loadSettings().catch(() => undefined)} /> : null}
      {!loading && !error ? (
        <div className={styles.settingsPanel}>
          <div className={styles.notice}>
            Use semicolons to separate SharePoint group names. Leave roles blank to allow every signed-in app user for that permission.
            Disable a permission to remove access entirely. Backend APIs must enforce matching authorization rules.
          </div>
          <div className={styles.settingsList}>
            {settings.map(setting => (
              <div className={styles.settingRow} key={setting.permissionKey}>
                <div className={styles.settingMeta}>
                  <h3>{setting.title}</h3>
                  <p>{setting.description}</p>
                  <span className={styles.permissionKey}>{setting.permissionKey}</span>
                  <span className={styles.source}>{setting.source === 'sharePointList' ? 'SharePoint override' : 'Configuration default'}</span>
                </div>
                <div className={styles.settingControls}>
                  <label className={styles.toggle}>
                    <input
                      checked={setting.enabled}
                      onChange={event =>
                        updateSetting(setting.permissionKey, currentSetting => ({
                          ...currentSetting,
                          enabled: event.currentTarget.checked
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Access enabled</span>
                  </label>
                  <InputField
                    label="Allowed roles"
                    onChange={value =>
                      updateSetting(setting.permissionKey, currentSetting => ({
                        ...currentSetting,
                        roleText: value
                      }))
                    }
                    placeholder="Example: MeFriend Sales Team; MeFriend Finance"
                    type="textarea"
                    value={setting.roleText}
                  />
                </div>
                <div className={styles.actions}>
                  <Button
                    label="Save"
                    loading={setting.saving}
                    onClick={() => handleSave(setting.permissionKey).catch(() => undefined)}
                    variant="primary"
                  />
                  <Button
                    label="Disable"
                    loading={setting.saving}
                    onClick={() => handleDisable(setting.permissionKey).catch(() => undefined)}
                    variant="danger"
                  />
                  <Button
                    disabled={setting.source !== 'sharePointList'}
                    label="Reset"
                    loading={setting.deleting}
                    onClick={() => handleReset(setting.permissionKey).catch(() => undefined)}
                    variant="secondary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
};
