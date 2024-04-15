import { Button } from '@affine/component/ui/button';
import { Tooltip } from '@affine/component/ui/tooltip';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import { AffineCloudSubscriptionService } from '@affine/core/modules/cloud';
import { popupWindow } from '@affine/core/utils';
import type { SubscriptionRecurring } from '@affine/graphql';
import { SubscriptionPlan, SubscriptionStatus } from '@affine/graphql';
import { Trans } from '@affine/i18n';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { DoneIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import { useAtom, useSetAtom } from 'jotai';
import { nanoid } from 'nanoid';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { openPaymentDisableAtom } from '../../../../../atoms';
import { authAtom } from '../../../../../atoms/index';
import { useCurrentLoginStatus } from '../../../../../hooks/affine/use-current-login-status';
import { mixpanel } from '../../../../../utils';
import { CancelAction, ResumeAction } from './actions';
import type { DynamicPrice, FixedPrice } from './cloud-plans';
import { ConfirmLoadingModal } from './modals';
import * as styles from './style.css';

interface PlanCardProps {
  detail: FixedPrice | DynamicPrice;
  recurring: SubscriptionRecurring;
  onNotify: (info: {
    detail: FixedPrice | DynamicPrice;
    recurring: string;
  }) => void;
}

export const PlanCard = (props: PlanCardProps) => {
  const { detail, recurring } = props;
  const loggedIn = useCurrentLoginStatus() === 'authenticated';
  const subscriptionService = useService(AffineCloudSubscriptionService);
  const primarySubscription = useLiveData(
    subscriptionService.subscription.primary$
  );
  const currentPlan = primarySubscription?.plan ?? SubscriptionPlan.Free;

  const isCurrent =
    loggedIn &&
    detail.plan === currentPlan &&
    recurring === primarySubscription?.recurring;
  const isPro = detail.plan === SubscriptionPlan.Pro;

  return (
    <div
      data-current={isCurrent}
      key={detail.plan}
      className={isPro ? styles.proPlanCard : styles.planCard}
    >
      <div className={styles.planCardBorderMock} />
      <div className={styles.planTitle}>
        <div style={{ paddingBottom: 12 }}>
          <section className={styles.planTitleName}>{detail.name}</section>
          <section className={styles.planTitleDescription}>
            {detail.description}
          </section>
          <section className={styles.planTitleTitle}>
            {detail.titleRenderer(recurring, detail as any)}
          </section>
        </div>
        <ActionButton {...props} />
      </div>
      <div className={styles.planBenefits}>
        {Object.entries(detail.benefits).map(([groupName, benefitList]) => {
          return (
            <ul className={styles.planBenefitGroup} key={groupName}>
              <section className={styles.planBenefitGroupTitle}>
                {groupName}:
              </section>
              {benefitList.map(({ icon, title }, index) => {
                return (
                  <li className={styles.planBenefit} key={index}>
                    <div className={styles.planBenefitIcon}>
                      {icon ?? <DoneIcon />}
                    </div>
                    <div className={styles.planBenefitText}>{title}</div>
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
    </div>
  );
};

const ActionButton = ({ detail, recurring, onNotify }: PlanCardProps) => {
  const t = useAFFiNEI18N();
  const loggedIn = useCurrentLoginStatus() === 'authenticated';
  const subscriptionService = useService(AffineCloudSubscriptionService);
  const primarySubscription = useLiveData(
    subscriptionService.subscription.primary$
  );
  const currentPlan = primarySubscription?.plan ?? SubscriptionPlan.Free;
  const currentRecurring = primarySubscription?.recurring;

  const handleOnSuccess = useCallback(() => {
    mixpanel.track_forms('Subscription', detail.plan);
    onNotify?.({ detail, recurring });
  }, [onNotify, detail, recurring]);

  // branches:
  //  if contact                                => 'Contact Sales'
  //  if not signed in:
  //    if free                                 => 'Sign up free'
  //    else                                    => 'Buy Pro'
  //  else
  //    if isCurrent
  //      if canceled                           => 'Resume'
  //      else                                  => 'Current Plan'
  //    if isCurrent                            => 'Current Plan'
  //    else if free                            => 'Downgrade'
  //    else if currentRecurring !== recurring  => 'Change to {recurring} Billing'
  //    else                                    => 'Upgrade'

  // contact
  if (detail.type === 'dynamic') {
    return <BookDemo plan={detail.plan} />;
  }

  // not signed in
  if (!loggedIn) {
    return (
      <SignUpAction>
        {detail.plan === SubscriptionPlan.Free
          ? t['com.affine.payment.sign-up-free']()
          : t['com.affine.payment.buy-pro']()}
      </SignUpAction>
    );
  }

  const isCanceled = !!primarySubscription?.canceledAt;
  const isFree = detail.plan === SubscriptionPlan.Free;
  const isCurrent =
    detail.plan === currentPlan &&
    (isFree
      ? true
      : currentRecurring === recurring &&
        primarySubscription?.status === SubscriptionStatus.Active);

  // is current
  if (isCurrent) {
    return isCanceled ? <ResumeButton /> : <CurrentPlan />;
  }

  if (isFree) {
    return <Downgrade disabled={isCanceled} />;
  }

  return currentPlan === detail.plan ? (
    <ChangeRecurring
      from={currentRecurring as SubscriptionRecurring}
      to={recurring as SubscriptionRecurring}
      due={primarySubscription?.nextBillAt || ''}
      disabled={isCanceled}
    />
  ) : (
    <Upgrade
      recurring={recurring as SubscriptionRecurring}
      onSuccess={handleOnSuccess}
    />
  );
};

const CurrentPlan = () => {
  const t = useAFFiNEI18N();
  return (
    <Button className={styles.planAction}>
      {t['com.affine.payment.current-plan']()}
    </Button>
  );
};

const Downgrade = ({ disabled }: { disabled?: boolean }) => {
  const t = useAFFiNEI18N();
  const [open, setOpen] = useState(false);

  const tooltipContent = disabled
    ? t['com.affine.payment.downgraded-tooltip']()
    : null;

  return (
    <CancelAction open={open} onOpenChange={setOpen}>
      <Tooltip content={tooltipContent} rootOptions={{ delayDuration: 0 }}>
        <div className={styles.planAction}>
          <Button
            className={styles.planAction}
            type="primary"
            onClick={() => setOpen(true)}
            disabled={disabled}
          >
            {t['com.affine.payment.downgrade']()}
          </Button>
        </div>
      </Tooltip>
    </CancelAction>
  );
};

const BookDemo = ({ plan }: { plan: SubscriptionPlan }) => {
  const t = useAFFiNEI18N();
  const url = useMemo(() => {
    switch (plan) {
      case SubscriptionPlan.Team:
        return 'https://6dxre9ihosp.typeform.com/to/niBcdkvs';
      case SubscriptionPlan.Enterprise:
        return 'https://6dxre9ihosp.typeform.com/to/rFfobTjf';
      default:
        return 'https://affine.pro/pricing';
    }
  }, [plan]);

  return (
    <a
      className={styles.planAction}
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        mixpanel.track('Button', {
          resolve: 'BookDemo',
          url,
        });
      }}
    >
      <Button className={styles.planAction} type="primary">
        {t['com.affine.payment.book-a-demo']()}
      </Button>
    </a>
  );
};

const Upgrade = ({
  recurring,
  onSuccess,
}: {
  recurring: SubscriptionRecurring;
  onSuccess: () => void;
}) => {
  const [isMutating, setMutating] = useState(false);
  const t = useAFFiNEI18N();

  const subscriptionService = useService(AffineCloudSubscriptionService);

  const newTabRef = useRef<Window | null>(null);

  // allow replay request on network error until component unmount
  const idempotencyKey = useMemo(() => `${nanoid()}-${recurring}`, [recurring]);

  const onClose = useCallback(() => {
    newTabRef.current = null;
    subscriptionService.subscription.revalidate();
    onSuccess();
  }, [onSuccess, subscriptionService.subscription]);

  const [, openPaymentDisableModal] = useAtom(openPaymentDisableAtom);
  const upgrade = useAsyncCallback(async () => {
    if (!runtimeConfig.enablePayment) {
      openPaymentDisableModal(true);
      return;
    }

    if (newTabRef.current) {
      newTabRef.current.focus();
    } else {
      setMutating(true);
      const link = await subscriptionService.createCheckoutSession({
        recurring,
        idempotencyKey,
        plan: SubscriptionPlan.Pro, // Only support prod plan now.
        coupon: null,
        successCallbackLink: null,
      });
      setMutating(false);
      const newTab = popupWindow(link);

      if (newTab) {
        newTabRef.current = newTab;

        newTab.addEventListener('close', onClose);
      }
    }
  }, [
    openPaymentDisableModal,
    subscriptionService,
    recurring,
    idempotencyKey,
    onClose,
  ]);

  useEffect(() => {
    return () => {
      if (newTabRef.current) {
        newTabRef.current.removeEventListener('close', onClose);
        newTabRef.current = null;
      }
    };
  }, [onClose]);

  return (
    <Button
      className={styles.planAction}
      type="primary"
      onClick={upgrade}
      disabled={isMutating}
      loading={isMutating}
    >
      {t['com.affine.payment.upgrade']()}
    </Button>
  );
};

const ChangeRecurring = ({
  from,
  to,
  disabled,
  due,
}: {
  from: SubscriptionRecurring;
  to: SubscriptionRecurring;
  disabled?: boolean;
  due: string;
}) => {
  const t = useAFFiNEI18N();
  const [open, setOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  // allow replay request on network error until component unmount or success
  const [idempotencyKey, setIdempotencyKey] = useState(nanoid());
  const subscription = useService(AffineCloudSubscriptionService).subscription;

  const change = useAsyncCallback(async () => {
    setIsMutating(true);
    await subscription.setSubscriptionRecurring(idempotencyKey, to);
    setIdempotencyKey(nanoid());
    setIsMutating(false);
  }, [subscription, to, idempotencyKey]);

  const changeCurringContent = (
    <Trans values={{ from, to, due }} className={styles.downgradeContent}>
      You are changing your <span className={styles.textEmphasis}>{from}</span>{' '}
      subscription to <span className={styles.textEmphasis}>{to}</span>{' '}
      subscription. This change will take effect in the next billing cycle, with
      an effective date of{' '}
      <span className={styles.textEmphasis}>
        {new Date(due).toLocaleDateString()}
      </span>
      .
    </Trans>
  );

  return (
    <>
      <Button
        className={styles.planAction}
        type="primary"
        onClick={() => setOpen(true)}
        disabled={disabled || isMutating}
        loading={isMutating}
      >
        {t['com.affine.payment.change-to']({ to })}
      </Button>

      <ConfirmLoadingModal
        type={'change'}
        loading={isMutating}
        open={open}
        onConfirm={change}
        onOpenChange={setOpen}
        content={changeCurringContent}
      />
    </>
  );
};

const SignUpAction = ({ children }: PropsWithChildren) => {
  const setOpen = useSetAtom(authAtom);

  const onClickSignIn = useCallback(() => {
    setOpen(state => ({
      ...state,
      openModal: true,
    }));
  }, [setOpen]);

  return (
    <Button
      onClick={onClickSignIn}
      className={styles.planAction}
      type="primary"
    >
      {children}
    </Button>
  );
};

const ResumeButton = () => {
  const t = useAFFiNEI18N();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <ResumeAction open={open} onOpenChange={setOpen}>
      <Button
        className={styles.planAction}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen(true)}
      >
        {hovered
          ? t['com.affine.payment.resume-renewal']()
          : t['com.affine.payment.current-plan']()}
      </Button>
    </ResumeAction>
  );
};
