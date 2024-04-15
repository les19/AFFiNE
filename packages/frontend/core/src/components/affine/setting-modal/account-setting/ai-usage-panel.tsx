import { Button } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { openSettingModalAtom } from '@affine/core/atoms';
import {
  AffineCloudServerConfigService,
  AffineCloudSubscriptionService,
  AffineCloudUserQuotaService,
} from '@affine/core/modules/cloud';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';

import { AIResume, AISubscribe } from '../general-setting/plans/ai/actions';
import * as styles from './storage-progress.css';

export const AIUsagePanel = () => {
  const t = useAFFiNEI18N();
  const setOpenSettingModal = useSetAtom(openSettingModalAtom);
  const serverConfigService = useService(AffineCloudServerConfigService);
  const hasPaymentFeature = useLiveData(
    serverConfigService.serverConfig.features$.map(f => f?.payment)
  );
  const subscriptionService = useService(AffineCloudSubscriptionService);
  const aiSubscription = useLiveData(subscriptionService.subscription.ai$);
  const quotaService = useService(AffineCloudUserQuotaService);
  useEffect(() => {
    quotaService.quota.revalidate();
  }, [quotaService]);
  const aiActionLimit = useLiveData(quotaService.quota.aiActionLimit$);
  const aiActionUsed = useLiveData(quotaService.quota.aiActionUsed$);

  const openAiPricingPlan = useCallback(() => {
    setOpenSettingModal({
      open: true,
      activeTab: 'plans',
      scrollAnchor: 'aiPricingPlan',
    });
  }, [setOpenSettingModal]);

  if (aiActionLimit === null || aiActionUsed === null) {
    // loading UI
    return null;
  }

  const percent =
    aiActionLimit === 'unlimited'
      ? 0
      : Math.min(
          100,
          Math.max(
            0.5,
            Number(((aiActionUsed / aiActionLimit) * 100).toFixed(4))
          )
        );

  const color = percent > 80 ? cssVar('errorColor') : cssVar('processingColor');

  return (
    <SettingRow
      desc={
        aiSubscription
          ? t['com.affine.payment.ai.usage-description-purchased']()
          : ''
      }
      name={t['com.affine.payment.ai.usage-title']()}
    >
      {aiActionLimit === 'unlimited' ? (
        hasPaymentFeature && aiSubscription?.canceledAt ? (
          <Button onClick={openAiPricingPlan}>
            {t['com.affine.payment.ai.usage.change-button-label']()}
          </Button>
        ) : (
          <AIResume />
        )
      ) : (
        <div className={styles.storageProgressContainer}>
          <div className={styles.storageProgressWrapper}>
            <div className="storage-progress-desc">
              <span>{t['com.affine.payment.ai.usage.used-caption']()}</span>
              <span>
                {t['com.affine.payment.ai.usage.used-detail']({
                  used: aiActionUsed.toString(),
                  limit: aiActionLimit.toString(),
                })}
              </span>
            </div>

            <div className="storage-progress-bar-wrapper">
              <div
                className={styles.storageProgressBar}
                style={{ width: `${percent}%`, backgroundColor: color }}
              ></div>
            </div>
          </div>

          {hasPaymentFeature && (
            <AISubscribe type="primary" className={styles.storageButton}>
              {t['com.affine.payment.ai.usage.purchase-button-label']()}
            </AISubscribe>
          )}
        </div>
      )}
    </SettingRow>
  );
};
