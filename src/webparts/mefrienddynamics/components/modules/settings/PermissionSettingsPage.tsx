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
import type { IEditablePermissionSetting, PermissionKey } from '../../../models/common/IPermissionModels';
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

type SettingsSectionKey = 'appUsers' | 'userPermissions' | 'approvalManagement' | 'legacyPermissions' | MasterDataListKey;

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

interface ISectionConfig {
  key: SettingsSectionKey;
  title: string;
  description: string;
  iconName: string;
  group: 'Access' | 'Approvals' | 'Masters' | 'Legacy';
  visible: boolean;
}

export interface IPermissionSettingsPageProps {
  access: IUseAppAccessResult;
  appAccessService: AppAccessService;
  approvalWorkflowService: ApprovalWorkflowService;
  masterDataService: MasterDataService;
  permissionService: PermissionService;
  onPermissionsChanged: () => Promise<void>;
}

const masterListKeys: readonly MasterDataListKey[] = ['stateCodes', 'countryCodes'];

const emptyUserForm: IAppUserInput = {
  title: '',
  email: '',
  role: '',
  canAccessApp: true,
  isActive: true
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
  instructions: '',
  approverIds: []
});

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

const isMasterSection = (key: SettingsSectionKey): key is MasterDataListKey =>
  masterListKeys.indexOf(key as MasterDataListKey) !== -1;

const getMasterNameLabel = (listKey: MasterDataListKey): string => (listKey === 'stateCodes' ? 'Description' : 'Name');

const canApproveModule = (moduleKey: MefriendModuleKey): boolean =>
  moduleKey === 'customers' || moduleKey === 'salesOrders' || moduleKey === 'approvals' || moduleKey === 'approvalManagement';

const canPostModule = (moduleKey: MefriendModuleKey): boolean => moduleKey === 'customers' || moduleKey === 'salesOrders';

export const PermissionSettingsPage: React.FC<IPermissionSettingsPageProps> = ({
  access,
  appAccessService,
  approvalWorkflowService,
  masterDataService,
  permissionService,
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
    },
    {
      key: 'legacyPermissions',
      title: 'Legacy Permission Settings',
      description: 'Temporary SharePoint-group settings retained for compatibility.',
      iconName: 'Group',
      group: 'Legacy',
      visible: canManageSettings
    }
  ], [canManageSettings, canViewSettings, canViewUsers, canViewWorkflows]);
  const visibleSections = sections.filter(section => section.visible);
  const [activeSectionKey, setActiveSectionKey] = React.useState<SettingsSectionKey>(visibleSections[0] ? visibleSections[0].key : 'stateCodes');
  const [users, setUsers] = React.useState<readonly IAppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<number | undefined>();
  const [userPermissions, setUserPermissions] = React.useState<readonly IAppUserPermission[]>([]);
  const [workflows, setWorkflows] = React.useState<readonly IApprovalWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<number | undefined>();
  const [workflowForm, setWorkflowForm] = React.useState<IApprovalWorkflow>(newWorkflow('Customer'));
  const [workflowLevels, setWorkflowLevels] = React.useState<readonly IWorkflowLevel[]>([]);
  const [legacySettings, setLegacySettings] = React.useState<readonly ILocalPermissionSetting[]>([]);
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
  const [masterDialogListKey, setMasterDialogListKey] = React.useState<MasterDataListKey | undefined>();
  const [masterForm, setMasterForm] = React.useState<IMasterDataFormState>(emptyMasterForm);
  const [deleteTarget, setDeleteTarget] = React.useState<IMasterDataDeleteTarget | undefined>();
  const [confirmUserToggle, setConfirmUserToggle] = React.useState<IAppUser | undefined>();

  const selectedUser = users.filter(user => user.id === selectedUserId)[0];
  const selectedWorkflow = workflows.filter(workflow => workflow.id === selectedWorkflowId)[0];

  const loadLegacyPermissionSettings = React.useCallback(async (): Promise<readonly ILocalPermissionSetting[]> => {
    try {
      const editableSettings = await permissionService.getEditablePermissionSettings();
      return editableSettings.map(toLocalSetting);
    } catch {
      return [];
    }
  }, [permissionService]);

  const loadSettings = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const [loadedUsers, loadedWorkflows, stateCodes, countryCodes, loadedLegacySettings] = await Promise.all([
        canViewUsers ? appAccessService.getUsers() : Promise.resolve([]),
        canViewWorkflows ? approvalWorkflowService.getWorkflows() : Promise.resolve([]),
        canViewSettings ? masterDataService.getCodes('stateCodes') : Promise.resolve([]),
        canViewSettings ? masterDataService.getCodes('countryCodes') : Promise.resolve([]),
        canManageSettings ? loadLegacyPermissionSettings() : Promise.resolve([])
      ]);

      setUsers(loadedUsers);
      setWorkflows(loadedWorkflows);
      setMasterData({ stateCodes, countryCodes });
      setLegacySettings(loadedLegacySettings);
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
    canManageSettings,
    canViewSettings,
    canViewUsers,
    canViewWorkflows,
    loadLegacyPermissionSettings,
    masterDataService
  ]);

  React.useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

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

  const updatePermission = (moduleKey: MefriendModuleKey, updater: (permission: IAppUserPermission) => IAppUserPermission): void => {
    setUserPermissions(current => current.map(permission => (permission.moduleKey === moduleKey ? updater(permission) : permission)));
  };

  const saveUser = async (): Promise<void> => {
    if (!canManageUsers || saving) {
      return;
    }

    setSaving(true);

    try {
      await appAccessService.saveUser({ ...userForm, email: normalizeEmail(userForm.email), title: userForm.title.trim() });
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
      {['Access', 'Approvals', 'Masters', 'Legacy'].map(groupName => {
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
    <div className={styles.tablePanel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Icon iconName="Search" aria-hidden="true" />
          <input aria-label="Search app users" onChange={event => setSearchText(event.currentTarget.value)} placeholder="Search users" type="search" value={searchText} />
        </div>
        <select aria-label="Filter users by status" className={styles.select} onChange={event => setUserFilter(event.currentTarget.value as 'all' | 'active' | 'inactive')} value={userFilter}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <Button disabled={!canManageUsers} icon={<Icon iconName="Add" aria-hidden="true" />} label="Add User" onClick={() => { setUserForm(emptyUserForm); setUserDialogOpen(true); }} />
      </div>
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader} ${styles.userGrid}`}>
          <span>User</span>
          <span>Role</span>
          <span>Access</span>
          <span>Actions</span>
        </div>
        {filteredUsers.length ? filteredUsers.map(user => (
          <div className={`${styles.tableRow} ${styles.userGrid}`} key={user.id}>
            <div className={styles.recordTitle}>
              <strong>{user.title}</strong>
              <span>{user.email}</span>
            </div>
            <span>{user.role || '-'}</span>
            <span>{user.canAccessApp && user.isActive ? 'Allowed' : 'Blocked'}</span>
            <div className={styles.rowActions}>
              <button aria-label={`Edit ${user.title}`} disabled={!canManageUsers} onClick={() => { setUserForm(user); setUserDialogOpen(true); }} type="button">
                <Icon iconName="Edit" aria-hidden="true" />
              </button>
              <button aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.title}`} disabled={!canManageUsers} onClick={() => setConfirmUserToggle(user)} type="button">
                <Icon iconName={user.isActive ? 'Blocked' : 'Completed'} aria-hidden="true" />
              </button>
            </div>
          </div>
        )) : <div className={styles.emptyRow}>No app users found.</div>}
      </div>
    </div>
  );

  const renderPermissionMatrix = (): React.ReactNode => (
    <div className={styles.tablePanel}>
      <div className={styles.toolbar}>
        <select
          aria-label="Select app user"
          className={styles.select}
          onChange={event => setSelectedUserId(Number(event.currentTarget.value) || undefined)}
          value={selectedUserId || ''}
        >
          {users.map(user => <option key={user.id} value={user.id}>{user.title} ({user.email})</option>)}
        </select>
        <Button disabled={!selectedUser || !canManageUsers} label="Save Permissions" loading={saving} onClick={() => saveUserPermissions().catch(() => undefined)} />
      </div>
      <div className={styles.matrix}>
        <div className={`${styles.matrixRow} ${styles.tableHeader}`}>
          <span>Module</span>
          <span>Active</span>
          <span>View</span>
          <span>Create</span>
          <span>Approve</span>
          <span>Post BC</span>
          <span>Manage</span>
        </div>
        {userPermissions.map(permission => (
          <div className={styles.matrixRow} key={permission.moduleKey}>
            <strong>{mefriendModuleLabels[permission.moduleKey]}</strong>
            {(['isActive', 'canView', 'canCreate', 'canApprove', 'canPostToBC', 'canManage'] as const).map(flag => {
              const disabled =
                !canManageUsers ||
                (flag === 'canCreate' && !permission.canView) ||
                (flag === 'canApprove' && !canApproveModule(permission.moduleKey)) ||
                (flag === 'canPostToBC' && !canPostModule(permission.moduleKey));

              return (
                <label className={styles.checkCell} key={flag}>
                  <input
                    aria-label={`${mefriendModuleLabels[permission.moduleKey]} ${flag}`}
                    checked={permission[flag]}
                    disabled={disabled}
                    onChange={event => updatePermission(permission.moduleKey, current => ({
                      ...current,
                      [flag]: event.currentTarget.checked,
                      canView: flag === 'canManage' && event.currentTarget.checked ? true : current.canView
                    }))}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const renderWorkflowManagement = (): React.ReactNode => {
    const activeApprovers = users.filter(user => user.isActive && user.canAccessApp);

    return (
      <div className={styles.workflowGrid}>
        <div className={styles.tablePanel}>
          <div className={styles.toolbar}>
            <select aria-label="Filter workflow entity type" className={styles.select} onChange={event => setWorkflowForm(newWorkflow(event.currentTarget.value as MefriendApprovalEntityType))} value={workflowForm.entityType}>
              {mefriendEntityTypes.map(entityType => <option key={entityType} value={entityType}>{entityType}</option>)}
            </select>
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
            <label className={styles.fieldLabel}>Entity Type<select disabled={!canManageWorkflows || !!workflowForm.id} onChange={event => setWorkflowForm(current => ({ ...current, entityType: event.currentTarget.value as MefriendApprovalEntityType }))} value={workflowForm.entityType}>{mefriendEntityTypes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <InputField disabled={!canManageWorkflows} label="Version" min={1} onChange={value => setWorkflowForm(current => ({ ...current, version: Number(value) || 1 }))} required type="number" value={workflowForm.version} />
            <label className={styles.fieldLabel}>Final Action<select disabled={!canManageWorkflows} onChange={event => setWorkflowForm(current => ({ ...current, finalAction: event.currentTarget.value as 'PostToBC' | 'ApproveOnly' }))} value={workflowForm.finalAction}>{mefriendWorkflowFinalActions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            {(['isActive', 'allowRejection', 'allowResubmission'] as const).map(flag => (
              <label className={styles.toggle} key={flag}>
                <input checked={workflowForm[flag]} disabled={!canManageWorkflows} onChange={event => setWorkflowForm(current => ({ ...current, [flag]: event.currentTarget.checked }))} type="checkbox" />
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
                <label className={styles.fieldLabel}>Approval Mode<select disabled={!canManageWorkflows} onChange={event => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, approvalMode: event.currentTarget.value as 'Any' | 'All' } : item))} value={level.approvalMode}>{mefriendApprovalModes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                <InputField disabled={!canManageWorkflows} label="Required Approvals" min={1} onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, requiredApprovals: Number(value) || 1 } : item))} type="number" value={level.requiredApprovals} />
                <label className={styles.toggle}><input checked={level.isFinalLevel} disabled={!canManageWorkflows} onChange={event => setWorkflowLevels(current => current.map(item => ({ ...item, isFinalLevel: item.localId === level.localId ? event.currentTarget.checked : false })))} type="checkbox" /><span>Final level</span></label>
                <label className={styles.toggle}><input checked={level.isActive} disabled={!canManageWorkflows} onChange={event => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, isActive: event.currentTarget.checked } : item))} type="checkbox" /><span>Active</span></label>
              </div>
              <InputField disabled={!canManageWorkflows} label="Instructions" onChange={value => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, instructions: value } : item))} type="textarea" value={level.instructions} />
              <div className={styles.approverList}>
                {level.approverIds.map((approverId, approverIndex) => (
                  <label className={styles.fieldLabel} key={`${level.localId}-${approverIndex}`}>Approver<select disabled={!canManageWorkflows} onChange={event => setWorkflowLevels(current => current.map(item => item.localId === level.localId ? { ...item, approverIds: item.approverIds.map((id, idIndex) => idIndex === approverIndex ? Number(event.currentTarget.value) : id) } : item))} value={approverId || ''}><option value="">Select approver</option>{activeApprovers.map(user => <option key={user.id} value={user.id}>{user.title} ({user.email})</option>)}</select></label>
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

  const renderMasterTable = (listKey: MasterDataListKey): React.ReactNode => (
    <div className={styles.tablePanel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}><Icon iconName="Search" aria-hidden="true" /><input aria-label={`Search ${listKey}`} onChange={event => setSearchText(event.currentTarget.value)} placeholder="Search records" type="search" value={searchText} /></div>
        <Button disabled={!canManageSettings} icon={<Icon iconName="Add" aria-hidden="true" />} label={`New ${masterDataService.getListLabel(listKey)}`} onClick={() => { setMasterDialogListKey(listKey); setMasterForm(emptyMasterForm); }} />
      </div>
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader} ${styles.masterGrid}`}><span>Code</span><span>{getMasterNameLabel(listKey)}</span><span>Actions</span></div>
        {masterData[listKey].filter(item => !searchText || item.code.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || item.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1).map(item => (
          <div className={`${styles.tableRow} ${styles.masterGrid}`} key={`${item.id || item.code}-${item.code}`}>
            <strong>{item.code}</strong><span>{item.name}</span>
            <div className={styles.rowActions}>
              <button aria-label={`Edit ${item.code}`} disabled={!canManageSettings} onClick={() => { setMasterDialogListKey(listKey); setMasterForm({ id: item.id, code: item.code, name: item.name }); }} type="button"><Icon iconName="Edit" aria-hidden="true" /></button>
              <button aria-label={`Delete ${item.code}`} disabled={!canManageSettings} onClick={() => setDeleteTarget({ listKey, item })} type="button"><Icon iconName="Delete" aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLegacyPermissions = (): React.ReactNode => (
    <div className={styles.tablePanel}>
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Permission</span><span>Allowed Groups</span><span>Status</span><span>Actions</span></div>
        {legacySettings.map(setting => (
          <div className={styles.tableRow} key={setting.permissionKey}>
            <div className={styles.recordTitle}><strong>{setting.title}</strong><small>{setting.permissionKey}</small></div>
            <InputField disabled={!canManageSettings} label="Allowed roles" onChange={value => setLegacySettings(current => current.map(item => item.permissionKey === setting.permissionKey ? { ...item, roleText: value } : item))} type="textarea" value={setting.roleText} />
            <label className={styles.toggle}><input checked={setting.enabled} disabled={!canManageSettings} onChange={event => setLegacySettings(current => current.map(item => item.permissionKey === setting.permissionKey ? { ...item, enabled: event.currentTarget.checked } : item))} type="checkbox" /><span>{setting.enabled ? 'Enabled' : 'Disabled'}</span></label>
            <Button disabled={!canManageSettings} label="Save" loading={setting.saving} onClick={async () => {
              setLegacySettings(current => current.map(item => item.permissionKey === setting.permissionKey ? { ...item, saving: true } : item));
              await permissionService.savePermissionSetting({ permissionKey: setting.permissionKey as PermissionKey, enabled: setting.enabled, allowedSharePointGroupNames: toGroupNames(setting.roleText) });
              setLegacySettings(current => current.map(item => item.permissionKey === setting.permissionKey ? { ...item, saving: false } : item));
              toast.success('Legacy permission saved.');
            }} size="small" />
          </div>
        ))}
      </div>
    </div>
  );

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
        {activeSectionKey === 'legacyPermissions' ? renderLegacyPermissions() : null}
      </div>
    );
  };

  return (
    <PageContainer title="Settings" description="Configure application access, workflow approvals, and sales order master data.">
      <div className={styles.settingsShell}>{renderSectionNav()}{renderContent()}</div>
      <EntityModal isOpen={userDialogOpen} title={userForm.id ? 'Edit App User' : 'Add App User'} size="small" onDismiss={() => setUserDialogOpen(false)} confirmLabel={userForm.id ? 'Update' : 'Create'} confirmLoading={saving} confirmDisabled={!canManageUsers} onConfirm={() => saveUser().catch(() => undefined)} onCancel={() => setUserDialogOpen(false)}>
        <div className={styles.masterForm}>
          <InputField disabled={saving} label="Display Name" onChange={value => setUserForm(current => ({ ...current, title: value }))} required value={userForm.title} />
          <InputField disabled={saving} label="Email" onChange={value => setUserForm(current => ({ ...current, email: value }))} required type="email" value={userForm.email} />
          <InputField disabled={saving} label="Role" onChange={value => setUserForm(current => ({ ...current, role: value }))} value={userForm.role} />
          <label className={styles.toggle}><input checked={userForm.canAccessApp} disabled={saving} onChange={event => setUserForm(current => ({ ...current, canAccessApp: event.currentTarget.checked }))} type="checkbox" /><span>Can access app</span></label>
          <label className={styles.toggle}><input checked={userForm.isActive} disabled={saving} onChange={event => setUserForm(current => ({ ...current, isActive: event.currentTarget.checked }))} type="checkbox" /><span>Active</span></label>
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
