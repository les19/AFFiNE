import {
  AuthInput,
  CountDownRender,
  ModalHeader,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import type { GetUserQuery } from '@affine/graphql';
import { getUserQuery } from '@affine/graphql';
import { Trans } from '@affine/i18n';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { ArrowDownBigIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useMutation } from '../../../hooks/use-mutation';
import { AffineCloudAuthService } from '../../../modules/cloud';
import { mixpanel } from '../../../utils';
import { emailRegex } from '../../../utils/email-regex';
import type { AuthPanelProps } from './index';
import { OAuth } from './oauth';
import * as style from './style.css';
import { useAuth } from './use-auth';
import { Captcha, useCaptcha } from './use-captcha';

function validateEmail(email: string) {
  return emailRegex.test(email);
}

export const SignIn: FC<AuthPanelProps> = ({
  setAuthState,
  setAuthEmail,
  email,
  onSignedIn,
}) => {
  const t = useAFFiNEI18N();
  const session = useService(AffineCloudAuthService).session;
  const loginStatus = useLiveData(session.status$);
  useEffect(() => {
    const timeout = setInterval(() => {
      // revalidate session to get the latest status
      session.revalidate(true);
    }, 1000);
    return () => {
      clearInterval(timeout);
    };
  }, [session]);
  const [verifyToken, challenge] = useCaptcha();

  const {
    isMutating: isSigningIn,
    resendCountDown,
    allowSendEmail,
    signIn,
    signUp,
  } = useAuth();

  const { trigger: verifyUser, isMutating } = useMutation({
    mutation: getUserQuery,
  });
  const [isValidEmail, setIsValidEmail] = useState(true);

  if (loginStatus === 'authenticated') {
    onSignedIn?.();
  }

  const onContinue = useAsyncCallback(async () => {
    if (!allowSendEmail) {
      return;
    }

    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    setIsValidEmail(true);
    // 0 for no access for internal beta
    const user: GetUserQuery['user'] | null | 0 = await verifyUser({ email })
      .then(({ user }) => user)
      .catch(err => {
        throw err;
      });

    setAuthEmail(email);

    if (verifyToken) {
      if (user) {
        // provider password sign-in if user has by default
        //  If with payment, onl support email sign in to avoid redirect to affine app
        if (user.hasPassword) {
          setAuthState('signInWithPassword');
        } else {
          mixpanel.track_forms('SignIn', 'Email', {
            email,
          });
          await signIn(email, verifyToken, challenge);
          // TODO, should always get id from user
          if ('id' in user) {
            mixpanel.identify(user.id);
          }
          setAuthState('afterSignInSendEmail');
        }
      } else {
        const res = await signUp(email, verifyToken, challenge);
        mixpanel.track_forms('SignUp', 'Email', {
          email,
        });
        if (!res || res.status >= 400) {
          return;
        }
        setAuthState('afterSignUpSendEmail');
      }
    }
  }, [
    allowSendEmail,
    challenge,
    email,
    setAuthEmail,
    setAuthState,
    signIn,
    signUp,
    verifyToken,
    verifyUser,
  ]);

  return (
    <>
      <ModalHeader
        title={t['com.affine.auth.sign.in']()}
        subTitle={t['com.affine.brand.affineCloud']()}
      />

      <OAuth />

      <div className={style.authModalContent}>
        <AuthInput
          label={t['com.affine.settings.email']()}
          placeholder={t['com.affine.auth.sign.email.placeholder']()}
          value={email}
          onChange={useCallback(
            (value: string) => {
              setAuthEmail(value);
            },
            [setAuthEmail]
          )}
          error={!isValidEmail}
          errorHint={
            isValidEmail ? '' : t['com.affine.auth.sign.email.error']()
          }
          onEnter={onContinue}
        />

        {verifyToken ? null : <Captcha />}

        {verifyToken ? (
          <Button
            size="extraLarge"
            data-testid="continue-login-button"
            block
            loading={isMutating || isSigningIn}
            disabled={!allowSendEmail}
            icon={
              allowSendEmail || isMutating ? (
                <ArrowDownBigIcon
                  width={20}
                  height={20}
                  style={{
                    transform: 'rotate(-90deg)',
                    color: 'var(--affine-blue)',
                  }}
                />
              ) : (
                <CountDownRender
                  className={style.resendCountdownInButton}
                  timeLeft={resendCountDown}
                />
              )
            }
            iconPosition="end"
            onClick={onContinue}
          >
            {t['com.affine.auth.sign.email.continue']()}
          </Button>
        ) : null}

        <div className={style.authMessage}>
          {/*prettier-ignore*/}
          <Trans i18nKey="com.affine.auth.sign.message">
              By clicking &quot;Continue with Google/Email&quot; above, you acknowledge that
              you agree to AFFiNE&apos;s <a href="https://affine.pro/terms" target="_blank" rel="noreferrer">Terms of Conditions</a> and <a href="https://affine.pro/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </Trans>
        </div>
      </div>
    </>
  );
};
