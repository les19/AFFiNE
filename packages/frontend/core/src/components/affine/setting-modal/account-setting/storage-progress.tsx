import { Button, Tooltip } from '@affine/component';
import { SubscriptionPlan } from '@affine/graphql';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useEffect, useMemo } from 'react';

import {
  AffineCloudSubscriptionService,
  AffineCloudUserQuotaService,
} from '../../../../modules/cloud';
import * as styles from './storage-progress.css';

export interface StorageProgressProgress {
  upgradable?: boolean;
  onUpgrade: () => void;
}

enum ButtonType {
  Primary = 'primary',
  Default = 'default',
}

export const StorageProgress = ({
  upgradable = true,
  onUpgrade,
}: StorageProgressProgress) => {
  const t = useAFFiNEI18N();
  const quota = useService(AffineCloudUserQuotaService).quota;

  useEffect(() => {
    // revalidate quota to get the latest status
    quota.revalidate();
  }, [quota]);
  const color = useLiveData(quota.color$);
  const usedFormatted = useLiveData(quota.usedFormatted$);
  const maxFormatted = useLiveData(quota.maxFormatted$);
  const percent = useLiveData(quota.percent$);

  const subscription = useService(AffineCloudSubscriptionService).subscription;
  useEffect(() => {
    // revalidate subscription to get the latest status
    subscription.revalidate();
  }, [subscription]);

  const plan = useLiveData(subscription.primary$.map(sub => sub?.plan));

  const buttonType = useMemo(() => {
    if (plan === SubscriptionPlan.Free) {
      return ButtonType.Primary;
    }
    return ButtonType.Default;
  }, [plan]);

  if (!plan || percent == null) {
    // TODO: loading UI
    return null;
  }

  return (
    <div className={styles.storageProgressContainer}>
      <div className={styles.storageProgressWrapper}>
        <div className="storage-progress-desc">
          <span>{t['com.affine.storage.used.hint']()}</span>
          <span>
            {usedFormatted}/{maxFormatted}
            {` (${plan} ${t['com.affine.storage.plan']()})`}
          </span>
        </div>

        <div className="storage-progress-bar-wrapper">
          <div
            className={styles.storageProgressBar}
            style={{
              width: `${percent}%`,
              backgroundColor: color ?? cssVar('processingColor'),
            }}
          ></div>
        </div>
      </div>

      {upgradable ? (
        <Tooltip
          options={{ hidden: percent < 100 }}
          content={
            plan === 'Free'
              ? t['com.affine.storage.maximum-tips']()
              : t['com.affine.storage.maximum-tips.pro']()
          }
        >
          <span tabIndex={0}>
            <Button
              type={buttonType}
              onClick={onUpgrade}
              className={styles.storageButton}
            >
              {plan === 'Free'
                ? t['com.affine.storage.upgrade']()
                : t['com.affine.storage.change-plan']()}
            </Button>
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
};
