import * as React from 'react';
import { Icon } from '@fluentui/react';
import {
  mefriendApprovalModes,
  mefriendEntityTypes,
  mefriendModuleLabels,
  mefriendWorkflowFinalActions,
  normalizeEmail,
  type MefriendApprovalEntityType,
  type MefriendModuleKey
} from '../../../config/sharePointConfig';
import type { IUseAppAccessResult } from '../../../hooks/useAppAccess';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type {
  IAppUser,
  IAppUserInput,
  IAppUserPermission,
  IApprovalWorkflow,
  IWorkflowLevel
} from '../../../models/settings/IAppAccessModels';
import type { IMasterCodeItem, MasterDataListKey } from '../../../models/settings/IMasterDataModels';
import type { AppAccessService } from '../../../services/sharepoint/appAccessService';
import type { ApprovalWorkflowService } from '../../../services/sharepoint/approvalWorkflowService';
import type { MasterDataService } from '../../../services/sharepoint/masterDataService';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { normalizeSalespersonCode } from '../../../utils/salespersonDataScope';
import { Button } from '../../common/buttons/Button';
import { ConfirmationDialog } from '../../common/confirmationDialog/ConfirmationDialog';
import { Dropdown } from '../../common/dropdowns/Dropdown';
import { ErrorState } from '../../common/errorState/ErrorState';
import { EntityModal } from '../../common/forms/EntityModal';
import { InputField } from '../../common/inputs/InputField';
import { AppLoader } from '../../common/loaders/AppLoader';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { EntityTable } from '../../common/table/EntityTable';
import { useToast } from '../../common/toast/useToast';
import styles from './PermissionSettingsPage.module.scss';

type SettingsSectionKey = 'appUsers' | 'userPermissions' | 'approvalManagement' | MasterDataListKey;

interface IMasterDataFormState {
  id?: number;
  code: string;
  name: string;
}

interface IMasterDataDeleteTarget {
  listKey: MasterDataListKey;
  item: IMasterCodeItem;
}

interface ISectionConfig {
  key: SettingsSectionKey;
  title: string;
  description: string;
  iconName: string;
  group: 'Access' | 'Approvals' | 'Masters';
  visible: boolean;
}

export interface IPermissionSettingsPageProps {
  access: IUseAppAccessResult;
  appAccessService: AppAccessService;
  approvalWorkflowService: ApprovalWorkflowService;
  masterDataService: MasterDataService;
  salespersonService: SalespersonService;
  onPermissionsChanged: () => Promise<void>;
}

const masterListKeys: readonly MasterDataListKey[] = ['stateCodes', 'countryCodes'];

const emptyUserForm: IAppUserInput = {
  title: '',
  email: '',
  role: '',
  canAccessApp: true,
  isActive: true,
  isSalesperson: false,
  salespersonCode: ''
};

const emptyMasterForm: IMasterDataFormState = {
  code: '',
  name: ''
};

const newWorkflow = (entityType: MefriendApprovalEntityType): IApprovalWorkflow => ({
  title: '',
  workflowCode: '',
  entityType,
  version: 1,
  isActive: false,
  allowRejection: true,
  allowResubmission: true,
  finalAction: 'ApproveOnly'
});

const newLevel = (levelNumber: number): IWorkflowLevel => ({
  localId: `new-${Date.now()}-${levelNumber}`,
  levelNumber,
  stepName: `Level ${levelNumber} Approval`,
  approvalMode: 'Any',
  requiredApprovals: 1,
  isFinalLevel: true,
  sequence: levelNumber,
  isActive: true,
  approverIds: []
});

const isMasterSection = (key: SettingsSectionKey): key is MasterDataListKey =>
  masterListKeys.indexOf(key as MasterDataListKey) !== -1;

const getMasterNameLabel = (listKey: MasterDataListKey): string => (listKey === 'stateCodes' ? 'Description' : 'Name');

const canApproveModule = (moduleKey: MefriendModuleKey): boolean =>
  moduleKey === 'customers' || moduleKey === 'salesOrders' || moduleKey === 'approvals' || moduleKey === 'approvalManagement';

const canPostModule = (moduleKey: MefriendModuleKey): boolean => moduleKey === 'customers' || moduleKey === 'salesOrders';

const userFilterOptions: readonly ILookupOption<'active' | 'inactive' | 'all'>[] = [
  { key: 'active', text: 'Active', value: 'active' },
  { key: 'inactive', text: 'Inactive', value: 'inactive' },
  { key: 'all', text: 'All', value: 'all' }
];

const entityTypeOptions: readonly ILookupOption<MefriendApprovalEntityType>[] = mefriendEntityTypes.map(entityType => ({
  key: entityType,
  text: entityType,
  value: entityType
}));

const finalActionOptions: readonly ILookupOption<'PostToBC' | 'ApproveOnly'>[] = mefriendWorkflowFinalActions.map(action => ({
  key: action,
  text: action,
  value: action
}));

const approvalModeOptions: readonly ILookupOption<'Any' | 'All'>[] = mefriendApprovalModes.map(mode => ({
  key: mode,
  text: mode,
  value: mode
}));

export const PermissionSettingsPage: React.FC<IPermissionSettingsPageProps> = ({
  access,
  appAccessService,
  approvalWorkflowService,
  masterDataService,
  salespersonService,
  onPermissionsChanged
}) => {
  const toast = useToast();
  const canViewSettings = access.canView('settings');
  const canManageSettings = access.canManage('settings');
  const canViewUsers = access.canView('appUsers') || access.canManage('appUsers');
  const canManageUsers = access.canManage('appUsers');
  const canViewWorkflows = access.canView('approvalManagement') || access.canManage('approvalManagement');
  const canManageWorkflows = access.canManage('approvalManagement');
  const sections = React.useMemo<readonly ISectionConfig[]>(() => [
    {
      key: 'appUsers',
      title: 'App Users',
      description: 'Manage application users and app-level access.',
      iconName: 'Contact',
      group: 'Access',
      visible: canViewUsers
    },
    {
      key: 'userPermissions',
      title: 'User Permissions',
      description: 'Configure module permissions per app user.',
      iconName: 'Permissions',
      group: 'Access',
      visible: canViewUsers
    },
    {
      key: 'approvalManagement',
      title: 'Approval Management',
      description: 'Configure Customer and SalesOrder workflow levels and approvers.',
      iconName: 'Flow',
      group: 'Approvals',
      visible: canViewWorkflows
    },
    {
      key: 'stateCodes',
      title: 'State Codes',
      description: 'Sales order state code master.',
      iconName: 'MapPin',
      group: 'Masters',
      visible: canViewSettings
    },
    {
      key: 'countryCodes',
      title: 'Country Codes',
      description: 'Sales order country code master.',
      iconName: 'Globe',
      group: 'Masters',
      visible: canViewSettings
    }
  ], [canViewSettings, canViewUsers, canViewWorkflows]);
  const visibleSections = sections.filter(section => section.visible);
  const [activeSectionKey, setActiveSectionKey] = React.useState<SettingsSectionKey>(visibleSections[0] ? visibleSections[0].key : 'stateCodes');
  const [users, setUsers] = React.useState<readonly IAppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<number | undefined>();
  const [userPermissions, setUserPermissions] = React.useState<readonly IAppUserPermission[]>([]);
  const [workflows, setWorkflows] = React.useState<readonly IApprovalWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<number | undefined>();
  const [workflowForm, setWorkflowForm] = React.useState<IApprovalWorkflow>(newWorkflow('Customer'));
  const [workflowLevels, setWorkflowLevels] = React.useState<readonly IWorkflowLevel[]>([]);
  const [masterData, setMasterData] = React.useState<Readonly<Record<MasterDataListKey, readonly IMasterCodeItem[]>>>({
    stateCodes: [],
    countryCodes: []
  });
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [searchText, setSearchText] = React.useState<string>('');
  const [userFilter, setUserFilter] = React.useState<'all' | 'active' | 'inactive'>('active');
  const [userDialogOpen, setUserDialogOpen] = React.useState<boolean>(false);
  const [userForm, setUserForm] = React.useState<IAppUserInput>(emptyUserForm);
  const [salespersonOptions, setSalespersonOptions] = React.useState<readonly ILookupOption<string>[]>([]);
  const [salespersonLookupLoading, setSalespersonLookupLoading] = React.useState<boolean>(false);
  const [salespersonLookupError, setSalespersonLookupError] = React.useState<string | undefined>();
  const [masterDialogListKey, setMasterDialogListKey] = React.useState<MasterDataListKey | undefined>();
  const [masterForm, setMasterForm] = React.useState<IMasterDataFormState>(emptyMasterForm);
  const [deleteTarget, setDeleteTarget] = React.useState<IMasterDataDeleteTarget | undefined>();
  const [confirmUserToggle, setConfirmUserToggle] = React.useState<IAppUser | undefined>();

  const selectedUser = users.filter(user => user.id === selectedUserId)[0];
  const selectedWorkflow = workflows.filter(workflow => workflow.id === selectedWorkflowId)[0];
  const hasValidSalespersonSelection = !userForm.isSalesperson || salespersonOptions.some(
    option => normalizeSalespersonCode(option.value) === normalizeSalespersonCode(userForm.salespersonCode)
  );

  const loadSettings = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const [loadedUsers, loadedWorkflows, stateCodes, countryCodes] = await Promise.all([
        canViewUsers ? appAccessService.getUsers() : Promise.resolve([]),
        canViewWorkflows ? approvalWorkflowService.getWorkflows() : Promise.resolve([]),
        canViewSettings ? masterDataService.getCodes('stateCodes') : Promise.resolve([]),
        canViewSettings ? masterDataService.getCodes('countryCodes') : Promise.resolve([])
      ]);

      setUsers(loadedUsers);
      setWorkflows(loadedWorkflows);
      setMasterData({ stateCodes, countryCodes });
      setSelectedUserId(current => current || (loadedUsers[0] ? loadedUsers[0].id : undefined));
      setSelectedWorkflowId(current => current || (loadedWorkflows[0] ? loadedWorkflows[0].id : undefined));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, [
    appAccessService,
    approvalWorkflowService,
    canViewSettings,
    canViewUsers,
    canViewWorkflows,
    masterDataService
  ]);

  React.useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

  React.useEffect(() => {
    if (!canManageUsers) {
      return;
    }

    const loadSalespersonOptions = async (): Promise<void> => {
      setSalespersonLookupLoading(true);
      setSalespersonLookupError(undefined);

      try {
        const lookupItems = await salespersonService.getSalespersonLookup();
        setSalespersonOptions(lookupItems.map(item => ({
          key: item.code,
          text: item.code,
          value: normalizeSalespersonCode(item.code),
          description: item.name
        })));
      } catch (lookupError) {
        setSalespersonOptions([]);
        setSalespersonLookupError(
          lookupError instanceof Error ? lookupError.message : 'Unable to load Salesperson Master.'
        );
      } finally {
        setSalespersonLookupLoading(false);
      }
    };

    loadSalespersonOptions().catch(() => undefined);
  }, [canManageUsers, salespersonService]);

  React.useEffect(() => {
    if (visibleSections.length && !visibleSections.some(section => section.key === activeSectionKey)) {
      setActiveSectionKey(visibleSections[0].key);
    }
  }, [activeSectionKey, visibleSections]);

  React.useEffect(() => {
    if (!selectedUser) {
      setUserPermissions([]);
      return;
    }

    appAccessService
      .getPermissionsForUser(selectedUser.id)
      .then(permissions => setUserPermissions(appAccessService.toPermissionMatrix(selectedUser, permissions)))
      .catch(errorValue => toast.error(errorValue instanceof Error ? errorValue.message : 'Unable to load user permissions.'));
  }, [appAccessService, selectedUser, toast]);

  React.useEffect(() => {
    if (!selectedWorkflow || !selectedWorkflow.id) {
      setWorkflowForm(newWorkflow('Customer'));
      setWorkflowLevels([]);
      return;
    }

    setWorkflowForm(selectedWorkflow);
    approvalWorkflowService
      .getWorkflowSteps(selectedWorkflow.id)
      .then(steps => setWorkflowLevels(approvalWorkflowService.toLevels(steps)))
      .catch(errorValue => toast.error(errorValue instanceof Error ? errorValue.message : 'Unable to load workflow steps.'));
  }, [approvalWorkflowService, selectedWorkflow, toast]);

  React.useEffect(() => {
    setSearchText('');
  }, [activeSectionKey]);

  const filteredUsers = users.filter(user => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || user.title.toLowerCase().indexOf(normalizedSearch) !== -1 || user.email.indexOf(normalizedSearch) !== -1;
    const matchesStatus = userFilter === 'all' || (userFilter === 'active' ? user.isActive : !user.isActive);
    return matchesSearch && matchesStatus;
  });

  const userOptions = React.useMemo<readonly ILookupOption<number>[]>(() => users.map(user => ({
    key: String(user.id),
    text: user.title,
    value: user.id,
    description: user.email
  })), [users]);

  const activeApproverOptions = React.useMemo<readonly ILookupOption<number>[]>(() => users
    .filter(user => user.isActive && user.canAccessApp)
    .map(user => ({
      key: String(user.id),
      text: user.title,
      value: user.id,
      description: user.email
    })), [users]);

  const renderRecordTitle = (title: string, subtitle?: string): React.ReactNode => (
    <div className={styles.recordTitle}>
      <strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  );

  const updatePermission = (moduleKey: MefriendModuleKey, updater: (permission: IAppUserPermission) => IAppUserPermission): void => {
    setUserPermissions(current => current.map(permission => (permission.moduleKey === moduleKey ? updater(permission) : permission)));
  };

  const saveUser = async (): Promise<void> => {
    if (!canManageUsers || saving) {
      return;
    }

    const salespersonCode = normalizeSalespersonCode(userForm.salespersonCode);

    if (userForm.isSalesperson && !salespersonCode) {
      toast.error('Salesperson Code is required when Is Salesperson is selected.');
      return;
    }

    if (
      userForm.isSalesperson &&
      !salespersonOptions.some(option => normalizeSalespersonCode(option.value) === salespersonCode)
    ) {
      toast.error('Select a valid Salesperson Code from Salesperson Master.');
      return;
    }

    setSaving(true);

    try {
      await appAccessService.saveUser({
        ...userForm,
        email: normalizeEmail(userForm.email),
        title: userForm.title.trim(),
        salespersonCode: userForm.isSalesperson ? salespersonCode : ''
      });
      toast.success('App user saved.');
      setUserDialogOpen(false);
      setUserForm(emptyUserForm);
      await loadSettings();
      await onPermissionsChanged();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save app user.');
    } finally {
      setSaving(false);
    }
  };

  const saveUserPermissions = async (): Promise<void> => {
    if (!selectedUser || !canManageUsers || saving) {
      return;
    }

    setSaving(true);

    try {
      await appAccessService.savePermissions(selectedUser, userPermissions);
      toast.success('User permissions saved.');
      await onPermissionsChanged();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save user permissions.');
    } finally {
      setSaving(false);
    }
  };

  const saveWorkflow = async (): Promise<void> => {
    if (!canManageWorkflows || saving) {
      return;
    }

    setSaving(true);

    try {
      const saved = await approvalWorkflowService.saveWorkflow(workflowForm, workflowLevels);
      toast.success('Workflow saved.');
      await loadSettings();
      setSelectedWorkflowId(saved.id);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save workflow.');
    } finally {
      setSaving(false);
    }
  };

  const saveMaster = async (): Promise<void> => {
    if (!masterDialogListKey || !canManageSettings || saving) {
      return;
    }

    if (!masterForm.code.trim() || !masterForm.name.trim()) {
      toast.error('Code and value are required.');
      return;
    }

    setSaving(true);

    try {
      await masterDataService.saveCode(masterDialogListKey, {
        code: masterForm.code.trim().toUpperCase(),
        name: masterForm.name.trim()
      }, masterForm.id);
      toast.success(`${masterDataService.getListLabel(masterDialogListKey)} saved.`);
      setMasterDialogListKey(undefined);
      setMasterForm(emptyMasterForm);
      await loadSettings();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save master data.');
    } finally {
      setSaving(false);
    }
  };

  const renderSectionNav = (): React.ReactNode => (
    <aside className={styles.sideNav} aria-label="Settings sections">
      {['Access', 'Approvals', 'Masters'].map(groupName => {
        const groupSections = visibleSections.filter(section => section.group === groupName);

        return groupSections.length ? (
          <div className={styles.navGroup} key={groupName}>
            <span className={styles.navGroupTitle}>{groupName}</span>
            {groupSections.map(section => (
              <button
                aria-current={activeSectionKey === section.key ? 'page' : undefined}
                className={activeSectionKey === section.key ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                key={section.key}
                onClick={() => setActiveSectionKey(section.key)}
                type="button"
              >
                <Icon iconName={section.iconName} aria-hidden="true" />
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        ) : null;
      })}
    </aside>
  );

  const renderUserManagement = (): React.ReactNode => (
    <EntityTable
      columns={[
        {
          key: 'user',
          header: 'User',
          fieldName: 'title',
          sortable: false,
          renderType: 'custom',
          minWidth: 260,
          customRender: user => renderRecordTitle(user.title, user.email)
        },
        { key: 'role', header: 'Role', fieldName: 'role', sortable: false, renderType: 'text', minWidth: 150 },
        {
          key: 'salesperson',
          header: 'Salesperson',
          fieldName: 'salespersonCode',
          sortable: false,
          renderType: 'custom',
          minWidth: 140,
          customRender: user => (user.isSalesperson ? user.salespersonCode || 'Not configured' : 'No')
        },
        {
          key: 'access',
          header: 'Access',
          fieldName: 'canAccessApp',
          sortable: false,
          renderType: 'tag',
          minWidth: 120,
          customRender: user => (user.canAccessApp && user.isActive ? 'Allowed' : 'Blocked')
        }
      ] as readonly ITableColumn<IAppUser>[]}
      emptyMessage="No app users match the current filters."
      emptyTitle="No app users found"
      getRowKey={user => String(user.id)}
      items={filteredUsers}
      actions={(
        <div className={styles.toolbarControls}>
          <div className={styles.searchBox}>
            <Icon iconName="Search" aria-hidden="true" />
            <input aria-label="Search app users" onChange={event => setSearchText(event.currentTarget.value)} placeholder="Search users" type="search" value={searchText} />
          </div>
          <div className={styles.toolbarDropdown}>
            <Dropdown
              label="Status"
              onChange={value => setUserFilter(typeof value === 'string' ? value as 'all' | 'active' | 'inactive' : 'active')}
              options={userFilterOptions}
              value={userFilter}
            />
          </div>
          <Button disabled={!canManageUsers} icon={<Icon iconName="Add" aria-hidden="true" />} label="Add User" onClick={() => { setUserForm(emptyUserForm); setUserDialogOpen(true); }} />
        </div>
      )}
      rowActions={[
        {
          key: 'edit',
          label: 'Edit',
          icon: 'edit',
          disabled: !canManageUsers,
          onClick: user => { setUserForm(user); setUserDialogOpen(true); }
        }
      ]}
      overflowActions={[
        {
          key: 'toggleAccess',
          label: 'Activate/deactivate',
          disabled: !canManageUsers,
          onClick: (user: IAppUser) => setConfirmUserToggle(user)
        }
      ]}
    />
  );

  const renderPermissionCheckbox = (permission: IAppUserPermission, flag: keyof Pick<IAppUserPermission, 'isActive' | 'canView' | 'canCreate' | 'canApprove' | 'canPostToBC' | 'canManage'>): React.ReactNode => {
    const disabled =
      !canManageUsers ||
      (flag === 'canCreate' && !permission.canView) ||
      (flag === 'canApprove' && !canApproveModule(permission.moduleKey)) ||
      (flag === 'canPostToBC' && !canPostModule(permission.moduleKey));

    return (
      <label className={styles.checkCell}>
        <input
          aria-label={`${mefriendModuleLabels[permission.moduleKey]} ${flag}`}
          checked={permission[flag]}
          disabled={disabled}
          onChange={event => {
            const checked = event.currentTarget.checked;
            updatePermission(permission.moduleKey, current => ({
              ...current,
              [flag]: checked,
              canView: flag === 'canManage' && checked ? true : current.canView
            }));
          }}
          type="checkbox"
        />
      </label>
    );
  };

  const permissionColumns: readonly ITableColumn<IAppUserPermission>[] = [
    {
      key: 'module',
      header: 'Module',
      fieldName: 'moduleKey',
      sortable: false,
      renderType: 'custom',
      minWidth: 220,
      customRender: permission => mefriendModuleLabels[permission.moduleKey]
    },
    { key: 'active', header: 'Active', fieldName: 'isActive', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'isActive') },
    { key: 'view', header: 'View', fieldName: 'canView', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'canView') },
    { key: 'create', header: 'Create', fieldName: 'canCreate', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'canCreate') },
    { key: 'approve', header: 'Approve', fieldName: 'canApprove', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'canApprove') },
    { key: 'postBc', header: 'Post BC', fieldName: 'canPostToBC', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'canPostToBC') },
    { key: 'manage', header: 'Manage', fieldName: 'canManage', sortable: false, renderType: 'custom', align: 'center', width: 92, customRender: permission => renderPermissionCheckbox(permission, 'canManage') }
  ];

  const renderPermissionMatrix = (): React.ReactNode => (
    <EntityTable
      columns={permissionColumns}
      emptyMessage={selectedUser ? 'No module permissions are configured for this user.' : 'Select an app user to configure module permissions.'}
      emptyTitle="No permissions found"
      getRowKey={permission => permission.moduleKey}
      items={userPermissions}
      actions={(
        <div className={styles.toolbarControls}>
          <div className={styles.userPermissionDropdown}>
            <Dropdown
              label="App user"
              onChange={value => setSelectedUserId(typeof value === 'number' ? value : undefined)}
              options={userOptions}
              searchable
              showSelectedDetail
              value={selectedUserId}
            />
          </div>
          <Button disabled={!selectedUser || !canManageUsers} label="Save Permissions" loading={saving} onClick={() => saveUserPermissions().catch(() => undefined)} />
        </div>
      )}
    />
  );

  /*
    Keep the Settings workflow builder as a framed editor, but use common controls
    for every reusable input surface inside it.
  */
  const renderWorkflowManagement = (): React.ReactNode => {
    return (
      <div className={styles.workflowGrid}>
        <div className={styles.tablePanel}>
          <div className={styles.toolbar}>
            <div className={styles.fullWidthDropdown}>
              <Dropdown
                label="Entity type"
                onChange={value => setWorkflowForm(newWorkflow(typeof value === 'string' ? value as MefriendApprovalEntityType : 'Customer'))}
                options={entityTypeOptions}
                value={workflowForm.entityType}
              />
            </div>
            <Button disabled={!canManageWorkflows} icon={<Icon iconName="Add" aria-hidden="true" />} label="New Workflow" onClick={() => { setSelectedWorkflowId(undefined); setWorkflowForm(newWorkflow(workflowForm.entityType)); setWorkflowLevels([]); }} />
          </div>
          <div className={styles.table}>
            {workflows.map(workflow => (
              <button className={selectedWorkflowId === workflow.id ? `${styles.workflowListItem} ${styles.workflowListItemActive}` : styles.workflowListItem} key={workflow.id || workflow.workflowCode} onClick={() => setSelectedWorkflowId(workflow.id)} type="button">
                <strong>{workflow.title}</strong>
                <span>{workflow.workflowCode} · {workflow.entityType} · v{workflow.version}</span>
                <small>{workflow.isActive ? 'Active' : 'Inactive'}</small>
              </button>
            ))}
            {!workflows.length ? <div className={styles.emptyRow}>No workflows configured.</div> : null}
          </div>
        </div>
        <div className={styles.tablePanel}>
          <div className={styles.formGrid}>
            <InputField disabled={!canManageWorkflows} label="Title" onChange={value => setWorkflowForm(current => ({ ...current, title: value }))} required value={workflowForm.title} />
            <InputField disabled={!canManageWorkflows} label="Workflow Code" onChange={value => setWorkflowForm(current => ({ ...current, workflowCode: value }))} required value={workflowForm.workflowCode} />
            <Dropdown
              disabled={!canManageWorkflows || !!workflowForm.id}
              label="Entity Type"
              onChange={value => setWorkflowForm(current => ({ ...current, entityType: typeof value === 'string' ? value as MefriendApprovalEntityType : current.entityType }))}
              options={entityTypeOptions}
              required
              value={workflowForm.entityType}
            />
            <InputField disabled={!canManageWorkflows} label="Version" min={1} onChange={value => setWorkflowForm(current => ({ ...current, version: Number(value) || 1 }))} required type="number" value={workflowForm.version} />
            <Dropdown
              disabled={!canManageWorkflows}
              label="Final Action"
              onChange={value => setWorkflowForm(current => ({ ...current, finalAction: typeof value === 'string' ? value as 'PostToBC' | 'ApproveOnly' : current.finalAction }))}
              options={finalActionOptions}
              value={workflowForm.finalAction}
            />
            {(['isActive', 'allowRejection', 'allowResubmission'] as const).map(flag => (
              <label className={styles.toggle} key={flag}>
                <input checked={workflowForm[flag]} disabled={!canManageWorkflows} onChange={event => {
                  const checked = event.currentTarget.checked;
                  setWorkflowForm(current => ({ ...current, [flag]: checked }));
                }} type="checkbox" />
                <span>{flag}</span>
              </label>
            ))}
          </div>
          <div className={styles.levelToolbar}>
            <strong>Approval Levels</strong>
            <Button disabled={!canManageWorkflows} icon={<Icon iconName="Add" aria-hidden="true" />} label="Add Level" onClick={() => {
              const next = workflowLevels.length + 1;
              setWorkflowLevels(current => current.map(level => ({ ...level, isFinalLevel: false })).concat(newLevel(next)));
            }} variant="secondary" />
          </div>
          {workflowLevels.map((level, index) => (
            <div className={level.isFinalLevel ? `${styles.levelCard} ${styles.finalLevel}` : styles.levelCard} key={level.localId}>
              <div className={styles.levelHeader}>
                <strong>Level {level.levelNumber}</strong>
                <div className={styles.rowActions}>
                  <button aria-label="Move level up" disabled={!canManageWorkflows || index === 0} onClick={() => setWorkflowLevels(current => current.map((item, itemIndex, all) => itemIndex === index - 1 ? { ...level, levelNumber: itemIndex + 1, sequence: itemIndex + 1 } : itemIndex === index ? { ...all[index - 1], levelNumber: itemIndex + 1, sequence: itemIndex + 1 } : item))} type="button"><Icon iconName="Up" aria-hidden="true" /></button>
                  <button aria-label="Remove level" disabled={!canManageWorkflows} onClick={() => setWorkflowLevels(current => current.filter(item => item.localId !== level.localId).map((item, itemIndex, all) => ({ ...item, levelNumber: itemIndex + 1, sequence: itemIndex + 1, isFinalLevel: itemIndex === all.length - 1 ? item.isFinalLevel || level.isFinalLevel : item.isFinalLevel })))} type="button"><Icon iconName="Delete" aria-hidden="true" /></button>
                </div>
              </div>
              <div className={styles.formGrid}>
                <InputField disabled={!canManageWorkflows} label="Step Name" onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, stepName: value } : item))} value={level.stepName} />
                <Dropdown
                  disabled={!canManageWorkflows}
                  label="Approval Mode"
                  onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, approvalMode: typeof value === 'string' ? value as 'Any' | 'All' : item.approvalMode } : item))}
                  options={approvalModeOptions}
                  value={level.approvalMode}
                />
                <InputField disabled={!canManageWorkflows} label="Required Approvals" min={1} onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, requiredApprovals: Number(value) || 1 } : item))} type="number" value={level.requiredApprovals} />
                <label className={styles.toggle}><input checked={level.isFinalLevel} disabled={!canManageWorkflows} onChange={event => {
                  const checked = event.currentTarget.checked;
                  setWorkflowLevels(current => current.map(item => ({ ...item, isFinalLevel: item.localId === level.localId ? checked : false })));
                }} type="checkbox" /><span>Final level</span></label>
                <label className={styles.toggle}><input checked={level.isActive} disabled={!canManageWorkflows} onChange={event => {
                  const checked = event.currentTarget.checked;
                  setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, isActive: checked } : item));
                }} type="checkbox" /><span>Active</span></label>
              </div>
              <div className={styles.approverList}>
                {level.approverIds.map((approverId, approverIndex) => (
                  <div className={styles.approverDropdown} key={`${level.localId}-${approverIndex}`}>
                    <Dropdown
                      disabled={!canManageWorkflows}
                      label="Approver"
                      onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, approverIds: item.approverIds.map((id, idIndex) => idIndex === approverIndex ? (typeof value === 'number' ? value : id) : id) } : item))}
                      options={activeApproverOptions}
                      placeholder="Select approver"
                      searchable
                      showSelectedDetail
                      value={approverId || undefined}
                    />
                  </div>
                ))}
                <Button disabled={!canManageWorkflows} icon={<Icon iconName="AddFriend" aria-hidden="true" />} label="Add Approver" onClick={() => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, approverIds: item.approverIds.concat(0) } : item))} variant="secondary" />
              </div>
            </div>
          ))}
          <div className={styles.formActions}>
            <Button disabled={!canManageWorkflows} label="Save Workflow" loading={saving} onClick={() => saveWorkflow().catch(() => undefined)} />
          </div>
        </div>
      </div>
    );
  };

  const renderMasterTable = (listKey: MasterDataListKey): React.ReactNode => {
    const filteredMasterData = masterData[listKey].filter(item => !searchText || item.code.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || item.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1);

    return (
      <EntityTable
        columns={[
          { key: 'code', header: 'Code', fieldName: 'code', sortable: false, renderType: 'text', minWidth: 160 },
          { key: 'name', header: getMasterNameLabel(listKey), fieldName: 'name', sortable: false, renderType: 'text', minWidth: 260 }
        ] as readonly ITableColumn<IMasterCodeItem>[]}
        emptyMessage={`No ${masterDataService.getListLabel(listKey).toLowerCase()} records match the current filters.`}
        emptyTitle={`No ${masterDataService.getListLabel(listKey)} found`}
        getRowKey={item => `${item.id || item.code}-${item.code}`}
        items={filteredMasterData}
        actions={(
          <div className={styles.toolbarControls}>
            <div className={styles.searchBox}>
              <Icon iconName="Search" aria-hidden="true" />
              <input aria-label={`Search ${listKey}`} onChange={event => setSearchText(event.currentTarget.value)} placeholder="Search records" type="search" value={searchText} />
            </div>
            <Button disabled={!canManageSettings} icon={<Icon iconName="Add" aria-hidden="true" />} label={`New ${masterDataService.getListLabel(listKey)}`} onClick={() => { setMasterDialogListKey(listKey); setMasterForm(emptyMasterForm); }} />
          </div>
        )}
        rowActions={[
          {
            key: 'edit',
            label: 'Edit',
            icon: 'edit',
            disabled: !canManageSettings,
            onClick: item => { setMasterDialogListKey(listKey); setMasterForm({ id: item.id, code: item.code, name: item.name }); }
          },
          {
            key: 'remove',
            label: 'Delete',
            icon: 'delete',
            disabled: !canManageSettings,
            onClick: item => setDeleteTarget({ listKey, item })
          }
        ]}
      />
    );
  };

  const activeSection = visibleSections.filter(section => section.key === activeSectionKey)[0];

  const renderContent = (): React.ReactNode => {
    if (loading) {
      return <AppLoader label="Loading settings" />;
    }

    if (error) {
      return <ErrorState title="Unable to load settings" message={error} retry={() => loadSettings().catch(() => undefined)} />;
    }

    if (!activeSection) {
      return <ErrorState title="No settings available" message="You do not have permission to view any settings sections." />;
    }

    return (
      <div className={styles.content}>
        <section className={styles.summaryCard}>
          <span className={styles.summaryIcon}><Icon iconName={activeSection.iconName} aria-hidden="true" /></span>
          <div><h2>{activeSection.title}</h2><p>{activeSection.description}</p></div>
        </section>
        {activeSectionKey === 'appUsers' ? renderUserManagement() : null}
        {activeSectionKey === 'userPermissions' ? renderPermissionMatrix() : null}
        {activeSectionKey === 'approvalManagement' ? renderWorkflowManagement() : null}
        {isMasterSection(activeSectionKey) ? renderMasterTable(activeSectionKey) : null}
      </div>
    );
  };

  return (
    <PageContainer title="Settings" description="Configure application access, workflow approvals, and sales order master data.">
      <div className={styles.settingsShell}>{renderSectionNav()}{renderContent()}</div>
      <EntityModal isOpen={userDialogOpen} title={userForm.id ? 'Edit App User' : 'Add App User'} size="small" onDismiss={() => setUserDialogOpen(false)} confirmLabel={userForm.id ? 'Update' : 'Create'} confirmLoading={saving} confirmDisabled={!canManageUsers || !hasValidSalespersonSelection} onConfirm={() => saveUser().catch(() => undefined)} onCancel={() => setUserDialogOpen(false)}>
        <div className={styles.masterForm}>
          <InputField disabled={saving} label="Display Name" onChange={value => setUserForm(current => ({ ...current, title: value }))} required value={userForm.title} />
          <InputField disabled={saving} label="Email" onChange={value => setUserForm(current => ({ ...current, email: value }))} required type="email" value={userForm.email} />
          <InputField disabled={saving} label="Role" onChange={value => setUserForm(current => ({ ...current, role: value }))} value={userForm.role} />
          <label className={styles.toggle}><input checked={userForm.isSalesperson} disabled={saving} onChange={event => {
            const checked = event.currentTarget.checked;
            setUserForm(current => ({ ...current, isSalesperson: checked, salespersonCode: checked ? current.salespersonCode : '' }));
          }} type="checkbox" /><span>Is Salesperson</span></label>
          {userForm.isSalesperson ? (
            <Dropdown
              disabled={saving}
              errorMessage={salespersonLookupError || (!normalizeSalespersonCode(userForm.salespersonCode) ? 'Salesperson Code is required.' : undefined)}
              label="Salesperson Code"
              loading={salespersonLookupLoading}
              onChange={value => setUserForm(current => ({ ...current, salespersonCode: typeof value === 'string' ? value : '' }))}
              options={salespersonOptions}
              placeholder="Select salesperson"
              required
              searchable
              showSelectedDetail
              value={userForm.salespersonCode}
            />
          ) : null}
          <label className={styles.toggle}><input checked={userForm.canAccessApp} disabled={saving} onChange={event => {
            const checked = event.currentTarget.checked;
            setUserForm(current => ({ ...current, canAccessApp: checked }));
          }} type="checkbox" /><span>Can access app</span></label>
          <label className={styles.toggle}><input checked={userForm.isActive} disabled={saving} onChange={event => {
            const checked = event.currentTarget.checked;
            setUserForm(current => ({ ...current, isActive: checked }));
          }} type="checkbox" /><span>Active</span></label>
        </div>
      </EntityModal>
      <EntityModal isOpen={!!masterDialogListKey} title={masterDialogListKey ? `${masterForm.id ? 'Edit' : 'Add'} ${masterDataService.getListLabel(masterDialogListKey)}` : 'Master Data'} size="small" onDismiss={() => setMasterDialogListKey(undefined)} confirmLabel={masterForm.id ? 'Update' : 'Create'} confirmLoading={saving} confirmDisabled={!canManageSettings} onConfirm={() => saveMaster().catch(() => undefined)} onCancel={() => setMasterDialogListKey(undefined)}>
        <div className={styles.masterForm}>
          <InputField disabled={saving} label="Code" maxLength={10} onChange={value => setMasterForm(current => ({ ...current, code: value.toUpperCase() }))} required value={masterForm.code} />
          <InputField disabled={saving} label={masterDialogListKey ? getMasterNameLabel(masterDialogListKey) : 'Name'} onChange={value => setMasterForm(current => ({ ...current, name: value }))} required value={masterForm.name} />
        </div>
      </EntityModal>
      <ConfirmationDialog isOpen={!!confirmUserToggle} title={confirmUserToggle && confirmUserToggle.isActive ? 'Deactivate user?' : 'Activate user?'} message={confirmUserToggle ? `${confirmUserToggle.isActive ? 'Deactivate' : 'Activate'} ${confirmUserToggle.title}?` : ''} confirmLabel={confirmUserToggle && confirmUserToggle.isActive ? 'Deactivate' : 'Activate'} loading={saving} onCancel={() => setConfirmUserToggle(undefined)} onConfirm={async () => {
        if (!confirmUserToggle) { return; }
        setSaving(true);
        await appAccessService.setUserActive(confirmUserToggle.id, !confirmUserToggle.isActive);
        setSaving(false);
        setConfirmUserToggle(undefined);
        await loadSettings();
        await onPermissionsChanged();
      }} />
      <ConfirmationDialog isOpen={!!deleteTarget} title="Delete master record?" message={deleteTarget ? `Delete ${deleteTarget.item.code}? Sales order forms will no longer show this option.` : ''} confirmLabel="Delete" variant="danger" loading={saving} onCancel={() => setDeleteTarget(undefined)} onConfirm={async () => {
        if (!deleteTarget || !deleteTarget.item.id) { return; }
        setSaving(true);
        await masterDataService.deleteCode(deleteTarget.listKey, deleteTarget.item.id);
        setSaving(false);
        setDeleteTarget(undefined);
        await loadSettings();
      }} />
    </PageContainer>
  );
};
