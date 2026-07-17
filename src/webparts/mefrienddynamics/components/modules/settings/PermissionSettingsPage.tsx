import * as React from 'react';
import { Icon } from '@fluentui/react';
import type { IEditablePermissionSetting, PermissionKey } from '../../../models/common/IPermissionModels';
import type { IMasterCodeItem, MasterDataListKey } from '../../../models/settings/IMasterDataModels';
import type { MasterDataService } from '../../../services/sharepoint/masterDataService';
import type { PermissionService } from '../../../services/sharepoint/permissionService';
import { Button } from '../../common/buttons/Button';
import { ConfirmationDialog } from '../../common/confirmationDialog/ConfirmationDialog';
import { ErrorState } from '../../common/errorState/ErrorState';
import { EntityModal } from '../../common/forms/EntityModal';
import { InputField } from '../../common/inputs/InputField';
import { AppLoader } from '../../common/loaders/AppLoader';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';
import styles from './PermissionSettingsPage.module.scss';

type SettingsSectionKey = 'permissions' | MasterDataListKey;

interface ILocalPermissionSetting extends IEditablePermissionSetting {
  roleText: string;
  saving: boolean;
  deleting: boolean;
}

interface IMasterDataFormState {
  id?: number;
  code: string;
  name: string;
}

interface IMasterDataDeleteTarget {
  listKey: MasterDataListKey;
  item: IMasterCodeItem;
}

interface IMasterDataSaveTarget {
  listKey: MasterDataListKey;
  item: IMasterDataFormState;
}

interface ISectionConfig {
  key: SettingsSectionKey;
  title: string;
  description: string;
  iconName: string;
  group: 'Access' | 'Masters';
}

export interface IPermissionSettingsPageProps {
  masterDataService: MasterDataService;
  permissionService: PermissionService;
  onPermissionsChanged: () => Promise<void>;
}

const sections: readonly ISectionConfig[] = [
  {
    key: 'permissions',
    title: 'Permission Settings',
    description: 'Module access and create permissions.',
    iconName: 'Permissions',
    group: 'Access'
  },
  {
    key: 'stateCodes',
    title: 'State Codes',
    description: 'Sales order state code master.',
    iconName: 'MapPin',
    group: 'Masters'
  },
  {
    key: 'countryCodes',
    title: 'Country Codes',
    description: 'Sales order country code master.',
    iconName: 'Globe',
    group: 'Masters'
  }
];

const masterListKeys: readonly MasterDataListKey[] = ['stateCodes', 'countryCodes'];

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

const emptyMasterForm: IMasterDataFormState = {
  code: '',
  name: ''
};

const isMasterSection = (key: SettingsSectionKey): key is MasterDataListKey =>
  masterListKeys.indexOf(key as MasterDataListKey) !== -1;

const getMasterNameLabel = (listKey: MasterDataListKey): string => (listKey === 'stateCodes' ? 'Description' : 'Name');

export const PermissionSettingsPage: React.FC<IPermissionSettingsPageProps> = ({
  masterDataService,
  permissionService,
  onPermissionsChanged
}) => {
  const toast = useToast();
  const [activeSectionKey, setActiveSectionKey] = React.useState<SettingsSectionKey>('permissions');
  const [settings, setSettings] = React.useState<readonly ILocalPermissionSetting[]>([]);
  const [masterData, setMasterData] = React.useState<Readonly<Record<MasterDataListKey, readonly IMasterCodeItem[]>>>({
    stateCodes: [],
    countryCodes: []
  });
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>();
  const [searchText, setSearchText] = React.useState<string>('');
  const [masterDialogListKey, setMasterDialogListKey] = React.useState<MasterDataListKey | undefined>();
  const [masterForm, setMasterForm] = React.useState<IMasterDataFormState>(emptyMasterForm);
  const [masterSaving, setMasterSaving] = React.useState<boolean>(false);
  const [masterDeleting, setMasterDeleting] = React.useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = React.useState<IMasterDataDeleteTarget | undefined>();
  const [saveTarget, setSaveTarget] = React.useState<IMasterDataSaveTarget | undefined>();

  const loadPermissionSettings = React.useCallback(async (): Promise<readonly ILocalPermissionSetting[]> => {
    try {
      const editableSettings = await permissionService.getEditablePermissionSettings();
      return editableSettings.map(toLocalSetting);
    } catch {
      return [];
    }
  }, [permissionService]);

  const loadMasterCodes = React.useCallback(async (listKey: MasterDataListKey): Promise<readonly IMasterCodeItem[]> => {
    try {
      return await masterDataService.getCodes(listKey);
    } catch {
      return [];
    }
  }, [masterDataService]);

  const loadSettings = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const [editableSettings, stateCodes, countryCodes] = await Promise.all([
        loadPermissionSettings(),
        loadMasterCodes('stateCodes'),
        loadMasterCodes('countryCodes')
      ]);

      setSettings(editableSettings);
      setMasterData({
        stateCodes,
        countryCodes
      });
    } catch {
      setError('Unable to load settings. Confirm you can read the configured SharePoint lists.');
    } finally {
      setLoading(false);
    }
  }, [loadMasterCodes, loadPermissionSettings]);

  React.useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

  React.useEffect(() => {
    setSearchText('');
  }, [activeSectionKey]);

  const activeSection = sections.filter(section => section.key === activeSectionKey)[0] || sections[0];
  const activeMasterItems = isMasterSection(activeSectionKey) ? masterData[activeSectionKey] : [];
  const filteredMasterItems = React.useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return activeMasterItems;
    }

    return activeMasterItems.filter(item =>
      item.code.toLowerCase().indexOf(normalizedSearch) !== -1 ||
      item.name.toLowerCase().indexOf(normalizedSearch) !== -1
    );
  }, [activeMasterItems, searchText]);

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
      updateSetting(permissionKey, setting => ({ ...setting, enabled: false, saving: true }));
      const currentSetting = settings.filter(setting => setting.permissionKey === permissionKey)[0];

      if (!currentSetting) {
        return;
      }

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

  const openMasterDialog = React.useCallback((listKey: MasterDataListKey, item?: IMasterCodeItem): void => {
    setMasterDialogListKey(listKey);
    setMasterForm(item ? { id: item.id, code: item.code, name: item.name } : emptyMasterForm);
  }, []);

  const closeMasterDialog = React.useCallback((): void => {
    if (masterSaving) {
      return;
    }

    setMasterDialogListKey(undefined);
    setMasterForm(emptyMasterForm);
    setSaveTarget(undefined);
  }, [masterSaving]);

  const handleRequestSaveMaster = React.useCallback((): void => {
    if (!masterDialogListKey) {
      return;
    }

    if (!masterForm.code.trim() || !masterForm.name.trim()) {
      toast.error('Code and value are required.');
      return;
    }

    setSaveTarget({
      listKey: masterDialogListKey,
      item: {
        ...masterForm,
        code: masterForm.code.trim().toUpperCase(),
        name: masterForm.name.trim()
      }
    });
  }, [masterDialogListKey, masterForm, toast]);

  const handleConfirmSaveMaster = React.useCallback(async (): Promise<void> => {
    if (!saveTarget || masterSaving) {
      return;
    }

    setMasterSaving(true);

    try {
      await masterDataService.saveCode(saveTarget.listKey, saveTarget.item, saveTarget.item.id);
      toast.success(`${masterDataService.getListLabel(saveTarget.listKey)} saved.`);
      setSaveTarget(undefined);
      setMasterDialogListKey(undefined);
      setMasterForm(emptyMasterForm);
      await loadSettings();
    } catch {
      toast.error(`Unable to save ${masterDataService.getListLabel(saveTarget.listKey)}.`);
    } finally {
      setMasterSaving(false);
    }
  }, [loadSettings, masterDataService, masterSaving, saveTarget, toast]);

  const handleConfirmDeleteMaster = React.useCallback(async (): Promise<void> => {
    if (masterDeleting) {
      return;
    }

    if (!deleteTarget || !deleteTarget.item.id) {
      setDeleteTarget(undefined);
      return;
    }

    setMasterDeleting(true);

    try {
      await masterDataService.deleteCode(deleteTarget.listKey, deleteTarget.item.id);
      toast.success(`${deleteTarget.item.code} deleted.`);
      setDeleteTarget(undefined);
      await loadSettings();
    } catch {
      toast.error(`Unable to delete ${deleteTarget.item.code}.`);
    } finally {
      setMasterDeleting(false);
    }
  }, [deleteTarget, loadSettings, masterDataService, masterDeleting, toast]);

  const renderSectionNav = (): React.ReactNode => (
    <aside className={styles.sideNav} aria-label="Settings sections">
      {['Access', 'Masters'].map(groupName => (
        <div className={styles.navGroup} key={groupName}>
          <span className={styles.navGroupTitle}>{groupName}</span>
          {sections
            .filter(section => section.group === groupName)
            .map(section => {
              const count = section.key === 'permissions'
                ? settings.length
                : isMasterSection(section.key)
                  ? masterData[section.key].length
                  : 0;

              return (
                <button
                  className={activeSectionKey === section.key ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                  key={section.key}
                  onClick={() => setActiveSectionKey(section.key)}
                  type="button"
                >
                  <Icon iconName={section.iconName} aria-hidden="true" />
                  <span>{section.title}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
        </div>
      ))}
    </aside>
  );

  const renderPermissionsTable = (): React.ReactNode => (
    <div className={styles.tablePanel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Icon iconName="Search" aria-hidden="true" />
          <input
            aria-label="Search permission settings"
            onChange={event => setSearchText(event.currentTarget.value)}
            placeholder="Search permission settings"
            type="search"
            value={searchText}
          />
        </div>
        <Button
          icon={<Icon iconName="Refresh" aria-hidden="true" />}
          label="Refresh"
          onClick={() => loadSettings().catch(() => undefined)}
          variant="secondary"
        />
      </div>
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
          <span>Permission</span>
          <span>Allowed Roles</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {settings
          .filter(setting => {
            const normalizedSearch = searchText.trim().toLowerCase();
            return !normalizedSearch ||
              setting.title.toLowerCase().indexOf(normalizedSearch) !== -1 ||
              setting.permissionKey.toLowerCase().indexOf(normalizedSearch) !== -1 ||
              setting.roleText.toLowerCase().indexOf(normalizedSearch) !== -1;
          })
          .map(setting => (
            <div className={styles.tableRow} key={setting.permissionKey}>
              <div className={styles.recordTitle}>
                <strong>{setting.title}</strong>
                <span>{setting.description}</span>
                <small>{setting.permissionKey}</small>
              </div>
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
                <span>{setting.enabled ? 'Enabled' : 'Disabled'}</span>
              </label>
              <div className={styles.rowActions}>
                <button aria-label={`Save ${setting.title}`} onClick={() => handleSave(setting.permissionKey).catch(() => undefined)} type="button">
                  {setting.saving ? <span className={styles.inlineSpinner} /> : <Icon iconName="Save" aria-hidden="true" />}
                </button>
                <button aria-label={`Disable ${setting.title}`} onClick={() => handleDisable(setting.permissionKey).catch(() => undefined)} type="button">
                  <Icon iconName="Blocked" aria-hidden="true" />
                </button>
                <button
                  aria-label={`Reset ${setting.title}`}
                  disabled={setting.source !== 'sharePointList'}
                  onClick={() => handleReset(setting.permissionKey).catch(() => undefined)}
                  type="button"
                >
                  {setting.deleting ? <span className={styles.inlineSpinner} /> : <Icon iconName="Undo" aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const renderMasterTable = (listKey: MasterDataListKey): React.ReactNode => (
    <div className={styles.tablePanel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Icon iconName="Search" aria-hidden="true" />
          <input
            aria-label={`Search ${activeSection.title}`}
            onChange={event => setSearchText(event.currentTarget.value)}
            placeholder={`Search ${activeSection.title.toLowerCase()}`}
            type="search"
            value={searchText}
          />
        </div>
        <Button
          icon={<Icon iconName="Refresh" aria-hidden="true" />}
          label="Refresh"
          onClick={() => loadSettings().catch(() => undefined)}
          variant="secondary"
        />
        <Button
          icon={<Icon iconName="Add" aria-hidden="true" />}
          label={`New ${masterDataService.getListLabel(listKey)}`}
          onClick={() => openMasterDialog(listKey)}
        />
      </div>
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader} ${styles.masterGrid}`}>
          <span>Code</span>
          <span>{getMasterNameLabel(listKey)}</span>
          <span>Actions</span>
        </div>
        {filteredMasterItems.length ? filteredMasterItems.map(item => (
          <div className={`${styles.tableRow} ${styles.masterGrid}`} key={`${item.id || item.code}-${item.code}`}>
            <strong>{item.code}</strong>
            <span>{item.name}</span>
            <div className={styles.rowActions}>
              <button aria-label={`Edit ${item.code}`} onClick={() => openMasterDialog(listKey, item)} type="button">
                <Icon iconName="Edit" aria-hidden="true" />
              </button>
              <button aria-label={`Delete ${item.code}`} onClick={() => setDeleteTarget({ listKey, item })} type="button">
                <Icon iconName="Delete" aria-hidden="true" />
              </button>
            </div>
          </div>
        )) : (
          <div className={styles.emptyRow}>No records found.</div>
        )}
      </div>
    </div>
  );

  const renderContent = (): React.ReactNode => {
    if (loading) {
      return <AppLoader label="Loading settings" />;
    }

    if (error) {
      return <ErrorState title="Unable to load settings" message={error} retry={() => loadSettings().catch(() => undefined)} />;
    }

    return (
      <div className={styles.content}>
        <section className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <Icon iconName={activeSection.iconName} aria-hidden="true" />
          </span>
          <div>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.description}</p>
          </div>
          <strong>{activeSectionKey === 'permissions' ? settings.length : activeMasterItems.length} records</strong>
        </section>
        {activeSectionKey === 'permissions' ? renderPermissionsTable() : renderMasterTable(activeSectionKey)}
      </div>
    );
  };

  return (
    <PageContainer
      title="Settings"
      description="Configure module permissions and sales order master data."
    >
      <div className={styles.settingsShell}>
        {renderSectionNav()}
        {renderContent()}
      </div>
      <EntityModal
        isOpen={!!masterDialogListKey}
        title={masterDialogListKey ? `${masterForm.id ? 'Edit' : 'Add'} ${masterDataService.getListLabel(masterDialogListKey)}` : 'Master Data'}
        subtitle={masterDialogListKey ? `Maintain ${masterDataService.getListLabel(masterDialogListKey).toLowerCase()} records used by sales order creation.` : undefined}
        size="small"
        onDismiss={closeMasterDialog}
        confirmLabel={masterForm.id ? 'Update' : 'Create'}
        cancelLabel="Cancel"
        confirmLoading={masterSaving}
        cancelDisabled={masterSaving}
        onConfirm={handleRequestSaveMaster}
        onCancel={closeMasterDialog}
      >
        <div className={styles.masterForm}>
          <InputField
            disabled={masterSaving}
            label="Code"
            maxLength={10}
            onChange={value => setMasterForm(currentForm => ({ ...currentForm, code: value.toUpperCase() }))}
            required
            value={masterForm.code}
          />
          <InputField
            disabled={masterSaving}
            label={masterDialogListKey ? getMasterNameLabel(masterDialogListKey) : 'Name'}
            onChange={value => setMasterForm(currentForm => ({ ...currentForm, name: value }))}
            required
            value={masterForm.name}
          />
        </div>
      </EntityModal>
      <ConfirmationDialog
        isOpen={!!saveTarget}
        title={saveTarget && saveTarget.item.id ? 'Confirm master data update' : 'Confirm master data creation'}
        message={saveTarget ? `${saveTarget.item.id ? 'Update' : 'Create'} ${masterDataService.getListLabel(saveTarget.listKey)} ${saveTarget.item.code}?` : ''}
        confirmLabel={saveTarget && saveTarget.item.id ? 'Update' : 'Create'}
        cancelLabel="Cancel"
        loading={masterSaving}
        onConfirm={() => handleConfirmSaveMaster().catch(() => undefined)}
        onCancel={() => setSaveTarget(undefined)}
      />
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete master record?"
        message={deleteTarget ? `Delete ${deleteTarget.item.code}? Sales order forms will no longer show this option.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={masterDeleting}
        onConfirm={() => handleConfirmDeleteMaster().catch(() => undefined)}
        onCancel={() => setDeleteTarget(undefined)}
      />
    </PageContainer>
  );
};
