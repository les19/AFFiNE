import { useMemo } from 'react';

import * as style from './style.css';
import type { WorkspaceSettingDetailProps } from './types';

export interface LabelsPanelProps extends WorkspaceSettingDetailProps {}

type WorkspaceStatus =
  | 'local'
  | 'syncCloud'
  | 'syncDocker'
  | 'selfHosted'
  | 'joinedWorkspace'
  | 'availableOffline'
  | 'publishedToWeb';

type LabelProps = {
  value: string;
  background: string;
};

type LabelMap = {
  [key in WorkspaceStatus]: LabelProps;
};
type labelConditionsProps = {
  condition: boolean;
  label: WorkspaceStatus;
};
const Label = ({ value, background }: LabelProps) => {
  return (
    <div>
      <div className={style.workspaceLabel} style={{ background: background }}>
        {value}
      </div>
    </div>
  );
};
export const LabelsPanel = ({
  workspaceMetadata,
  isOwner,
}: LabelsPanelProps) => {
  const labelMap: LabelMap = useMemo(
    () => ({
      local: {
        value: 'Local',
        background: 'var(--affine-tag-orange)',
      },
      syncCloud: {
        value: 'Sync with Altertask Cloud',
        background: 'var(--affine-tag-blue)',
      },
      syncDocker: {
        value: 'Sync with Altertask Docker',
        background: 'var(--affine-tag-green)',
      },
      selfHosted: {
        value: 'Self-Hosted Server',
        background: 'var(--affine-tag-purple)',
      },
      joinedWorkspace: {
        value: 'Joined Workspace',
        background: 'var(--affine-tag-yellow)',
      },
      availableOffline: {
        value: 'Available Offline',
        background: 'var(--affine-tag-green)',
      },
      publishedToWeb: {
        value: 'Published to Web',
        background: 'var(--affine-tag-blue)',
      },
    }),
    []
  );
  const labelConditions: labelConditionsProps[] = [
    { condition: !isOwner, label: 'joinedWorkspace' },
    { condition: workspaceMetadata.flavour === 'local', label: 'local' },
    {
      condition: workspaceMetadata.flavour === 'affine-cloud',
      label: 'syncCloud',
    },
    //TODO: add these labels
    // { status==="synced", label: 'availableOffline' }
    // { workspace.flavour === 'affine-Docker', label: 'syncDocker' }
    // { workspace.flavour === 'self-hosted', label: 'selfHosted' }
  ];

  return (
    <div className={style.labelWrapper}>
      {labelConditions.map(
        ({ condition, label }) =>
          condition && (
            <Label
              key={label}
              value={labelMap[label].value}
              background={labelMap[label].background}
            />
          )
      )}
    </div>
  );
};
