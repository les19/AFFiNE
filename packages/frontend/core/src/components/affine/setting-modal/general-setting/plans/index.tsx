import { notify, Switch } from '@affine/component';
import { SubscriptionPlan, SubscriptionRecurring } from '@affine/graphql';
import { Trans } from '@affine/i18n';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { SingleSelectSelectSolidIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { SWRErrorBoundary } from '../../../../../components/pure/swr-error-bundary';
import { useCurrentLoginStatus } from '../../../../../hooks/affine/use-current-login-status';
import { AffineCloudSubscriptionService } from '../../../../../modules/cloud';
import { AIPlan } from './ai/ai-plan';
import { type FixedPrice, getPlanDetail } from './cloud-plans';
import { CloudPlanLayout, PlanLayout } from './layout';
import { PlanCard } from './plan-card';
import { PlansSkeleton } from './skeleton';
import * as styles from './style.css';

const getRecurringLabel = ({
  recurring,
  t,
}: {
  recurring: SubscriptionRecurring;
  t: ReturnType<typeof useAFFiNEI18N>;
}) => {
  return recurring === SubscriptionRecurring.Monthly
    ? t['com.affine.payment.recurring-monthly']()
    : t['com.affine.payment.recurring-yearly']();
};

const Settings = () => {
  const t = useAFFiNEI18N();

  const loggedIn = useCurrentLoginStatus() === 'authenticated';
  const planDetail = useMemo(() => getPlanDetail(t), [t]);
  const scrollWrapper = useRef<HTMLDivElement>(null);

  const subscriptionService = useService(AffineCloudSubscriptionService);
  const primarySubscription = useLiveData(
    subscriptionService.subscription.primary$
  );

  useEffect(() => {
    subscriptionService.subscription.revalidate();
  }, [subscriptionService]);

  const [recurring, setRecurring] = useState<SubscriptionRecurring>(
    primarySubscription?.recurring ?? SubscriptionRecurring.Yearly
  );

  const currentPlan = primarySubscription?.plan ?? SubscriptionPlan.Free;
  const isCanceled = !!primarySubscription?.canceledAt;
  const currentRecurring =
    primarySubscription?.recurring ?? SubscriptionRecurring.Monthly;

  const yearlyDiscount = (
    planDetail.get(SubscriptionPlan.Pro) as FixedPrice | undefined
  )?.discount;

  // auto scroll to current plan card
  useEffect(() => {
    if (!scrollWrapper.current) return;
    const currentPlanCard = scrollWrapper.current?.querySelector(
      '[data-current="true"]'
    );
    const wrapperComputedStyle = getComputedStyle(scrollWrapper.current);
    const left = currentPlanCard
      ? currentPlanCard.getBoundingClientRect().left -
        scrollWrapper.current.getBoundingClientRect().left -
        parseInt(wrapperComputedStyle.paddingLeft)
      : 0;
    const appeared = scrollWrapper.current.dataset.appeared === 'true';
    const animationFrameId = requestAnimationFrame(() => {
      scrollWrapper.current?.scrollTo({
        behavior: appeared ? 'smooth' : 'instant',
        left,
      });
      scrollWrapper.current?.setAttribute('data-appeared', 'true');
    });
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [recurring]);

  const cloudCaption = loggedIn ? (
    isCanceled ? (
      <p>
        {t['com.affine.payment.subtitle-canceled']({
          plan: `${getRecurringLabel({
            recurring: currentRecurring,
            t,
          })} ${currentPlan}`,
        })}
      </p>
    ) : (
      <p>
        <Trans
          plan={currentPlan}
          i18nKey="com.affine.payment.subtitle-active"
          values={{ currentPlan }}
        >
          You are currently on the {{ currentPlan }} plan. If you have any
          questions, please contact our&nbsp;
          <a
            href="mailto:support@toeverything.info"
            style={{ color: 'var(--affine-link-color)' }}
          >
            customer support
          </a>
          .
        </Trans>
      </p>
    )
  ) : (
    <p>{t['com.affine.payment.subtitle-not-signed-in']()}</p>
  );

  const cloudToggle = (
    <div className={styles.recurringToggleWrapper}>
      <div>
        {recurring === SubscriptionRecurring.Yearly ? (
          <div className={styles.recurringToggleRecurring}>
            {t['com.affine.payment.cloud.pricing-plan.toggle-yearly']()}
          </div>
        ) : (
          <>
            <div className={styles.recurringToggleRecurring}>
              <span>
                {t[
                  'com.affine.payment.cloud.pricing-plan.toggle-billed-yearly'
                ]()}
              </span>
            </div>
            {yearlyDiscount ? (
              <div className={styles.recurringToggleDiscount}>
                {t['com.affine.payment.cloud.pricing-plan.toggle-discount']({
                  discount: yearlyDiscount,
                })}
              </div>
            ) : null}
          </>
        )}
      </div>
      <Switch
        checked={recurring === SubscriptionRecurring.Yearly}
        onChange={checked =>
          setRecurring(
            checked
              ? SubscriptionRecurring.Yearly
              : SubscriptionRecurring.Monthly
          )
        }
      />
    </div>
  );

  const cloudScroll = (
    <div className={styles.planCardsWrapper} ref={scrollWrapper}>
      {Array.from(planDetail.values()).map(detail => {
        return (
          <PlanCard
            key={detail.plan}
            onNotify={({ detail, recurring }) => {
              notify({
                style: 'normal',
                icon: (
                  <SingleSelectSelectSolidIcon color={cssVar('primaryColor')} />
                ),
                title: t['com.affine.payment.updated-notify-title'](),
                message:
                  detail.plan === SubscriptionPlan.Free
                    ? t[
                        'com.affine.payment.updated-notify-msg.cancel-subscription'
                      ]()
                    : t['com.affine.payment.updated-notify-msg']({
                        plan: getRecurringLabel({
                          recurring: recurring as SubscriptionRecurring,
                          t,
                        }),
                      }),
              });
            }}
            {...{ detail, recurring }}
          />
        );
      })}
    </div>
  );

  const cloudSelect = (
    <div className={styles.cloudSelect}>
      <b>{t['com.affine.payment.cloud.pricing-plan.select.title']()}</b>
      <span>{t['com.affine.payment.cloud.pricing-plan.select.caption']()}</span>
    </div>
  );

  return (
    <PlanLayout
      cloud={
        <CloudPlanLayout
          caption={cloudCaption}
          select={cloudSelect}
          toggle={cloudToggle}
          scroll={cloudScroll}
          scrollRef={scrollWrapper}
        />
      }
      ai={<AIPlan />}
    />
  );
};

export const AFFiNEPricingPlans = () => {
  return (
    <SWRErrorBoundary FallbackComponent={PlansErrorBoundary}>
      <Suspense fallback={<PlansSkeleton />}>
        <Settings />
      </Suspense>
    </SWRErrorBoundary>
  );
};

const PlansErrorBoundary = ({ resetErrorBoundary }: FallbackProps) => {
  const t = useAFFiNEI18N();

  const scroll = (
    <div className={styles.errorTip}>
      <span>{t['com.affine.payment.plans-error-tip']()}</span>
      <a onClick={resetErrorBoundary} className={styles.errorTipRetry}>
        {t['com.affine.payment.plans-error-retry']()}
      </a>
    </div>
  );

  return <PlanLayout cloud={<CloudPlanLayout scroll={scroll} />} />;
};
