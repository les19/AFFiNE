import { ConfirmModal } from '@affine/component/ui/modal';
import { openQuotaModalAtom, openSettingModalAtom } from '@affine/core/atoms';
import { AffineCloudUserQuotaService } from '@affine/core/modules/cloud';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { WorkspaceQuotaService } from '@affine/core/modules/quota';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useLiveData, useService, WorkspaceService } from '@toeverything/infra';
import bytes from 'bytes';
import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';

import { mixpanel } from '../../../utils';

export const CloudQuotaModal = () => {
  const t = useAFFiNEI18N();
  const currentWorkspace = useService(WorkspaceService).workspace;
  const [open, setOpen] = useAtom(openQuotaModalAtom);
  const workspaceQuotaService = useService(WorkspaceQuotaService);
  useEffect(() => {
    workspaceQuotaService.quota.revalidate();
  }, [workspaceQuotaService]);
  const workspaceQuota = useLiveData(workspaceQuotaService.quota.quota$);
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  useEffect(() => {
    // revalidate permission
    permissionService.permission.revalidate();
  }, [permissionService]);

  const quotaService = useService(AffineCloudUserQuotaService);
  const userQuota = useLiveData(
    quotaService.quota.quota$.map(q =>
      q
        ? {
            name: q.humanReadable.name,
            blobLimit: q.humanReadable.blobLimit,
          }
        : null
    )
  );

  const isFreePlanOwner = useMemo(() => {
    return isOwner && userQuota?.name === 'free';
  }, [isOwner, userQuota]);

  const setSettingModalAtom = useSetAtom(openSettingModalAtom);
  const handleUpgradeConfirm = useCallback(() => {
    setSettingModalAtom({
      open: true,
      activeTab: 'plans',
    });

    setOpen(false);
  }, [setOpen, setSettingModalAtom]);

  const description = useMemo(() => {
    if (userQuota && isFreePlanOwner) {
      return t['com.affine.payment.blob-limit.description.owner.free']({
        planName: userQuota.name,
        currentQuota: userQuota.blobLimit,
        upgradeQuota: '100MB',
      });
    }
    if (isOwner && userQuota && userQuota.name.toLowerCase() === 'pro') {
      return t['com.affine.payment.blob-limit.description.owner.pro']({
        planName: userQuota.name,
        quota: userQuota.blobLimit,
      });
    }
    if (workspaceQuota) {
      return t['com.affine.payment.blob-limit.description.member']({
        quota: workspaceQuota.humanReadable.blobLimit,
      });
    } else {
      // loading
      return null;
    }
  }, [userQuota, isFreePlanOwner, isOwner, workspaceQuota, t]);

  useEffect(() => {
    if (!workspaceQuota) {
      return;
    }
    currentWorkspace.engine.blob.singleBlobSizeLimit = bytes.parse(
      workspaceQuota.blobLimit.toString()
    );

    const disposable = currentWorkspace.engine.blob.onAbortLargeBlob.on(() => {
      setOpen(true);
    });
    return () => {
      disposable?.dispose();
    };
  }, [currentWorkspace.engine.blob, setOpen, workspaceQuota]);

  useEffect(() => {
    if (userQuota?.name) {
      mixpanel.people.set({
        plan: userQuota.name,
      });
    }
  }, [userQuota?.name]);

  return (
    <ConfirmModal
      open={open}
      title={t['com.affine.payment.blob-limit.title']()}
      onOpenChange={setOpen}
      description={description}
      cancelButtonOptions={{
        hidden: !isFreePlanOwner,
      }}
      onConfirm={handleUpgradeConfirm}
      confirmButtonOptions={{
        type: 'primary',
        children: isFreePlanOwner
          ? t['com.affine.payment.upgrade']()
          : t['Got it'](),
      }}
    />
  );
};
