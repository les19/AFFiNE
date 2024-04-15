import { Wrapper } from '@affine/component';
import {
  AuthInput,
  BackButton,
  ModalHeader,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useSession } from '@affine/core/hooks/affine/use-current-user';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import { signInCloud } from '../../../utils/cloud-utils';
import type { AuthPanelProps } from './index';
import * as styles from './style.css';
import { useAuth } from './use-auth';
import { useCaptcha } from './use-captcha';

export const SignInWithPassword: FC<AuthPanelProps> = ({
  setAuthState,
  setEmailType,
  email,
  onSignedIn,
}) => {
  const t = useAFFiNEI18N();
  const { reload } = useSession();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const { signIn, allowSendEmail, isMutating: sendingEmail } = useAuth();
  const [verifyToken, challenge] = useCaptcha();
  const [isLoading, setIsLoading] = useState(false);

  const onSignIn = useAsyncCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    const res = await signInCloud('credentials', {
      email,
      password,
    }).catch(console.error);

    if (res?.ok) {
      await reload();
      onSignedIn?.();
    } else {
      setPasswordError(true);
    }

    setIsLoading(false);
  }, [email, password, isLoading, onSignedIn, reload]);

  const sendMagicLink = useAsyncCallback(async () => {
    if (allowSendEmail && verifyToken && !sendingEmail) {
      await signIn(email, verifyToken, challenge);
      setAuthState('afterSignInSendEmail');
    }
  }, [
    email,
    signIn,
    allowSendEmail,
    sendingEmail,
    setAuthState,
    verifyToken,
    challenge,
  ]);

  const sendChangePasswordEmail = useCallback(() => {
    setEmailType('changePassword');
    setAuthState('sendEmail');
  }, [setAuthState, setEmailType]);

  return (
    <>
      <ModalHeader
        title={t['com.affine.auth.sign.in']()}
        subTitle={t['com.affine.brand.affineCloud']()}
      />

      <Wrapper
        marginTop={30}
        style={{
          position: 'relative',
        }}
      >
        <AuthInput
          label={t['com.affine.settings.email']()}
          disabled={true}
          value={email}
        />
        <AuthInput
          data-testid="password-input"
          label={t['com.affine.auth.password']()}
          value={password}
          type="password"
          onChange={useCallback((value: string) => {
            setPassword(value);
          }, [])}
          error={passwordError}
          errorHint={t['com.affine.auth.password.error']()}
          onEnter={onSignIn}
        />
        <div
          className={styles.forgetPasswordButtonRow}
          style={{ display: 'none' }} // Not implemented yet.
        >
          <a
            className={styles.linkButton}
            onClick={sendChangePasswordEmail}
            style={{
              color: 'var(--affine-text-secondary-color)',
              fontSize: 'var(--affine-font-sm)',
            }}
          >
            {t['com.affine.auth.forget']()}
          </a>
        </div>
        <div className={styles.sendMagicLinkButtonRow}>
          <a
            data-testid="send-magic-link-button"
            className={styles.linkButton}
            onClick={sendMagicLink}
          >
            {t['com.affine.auth.sign.auth.code.send-email.sign-in']()}
          </a>
        </div>
        <Button
          data-testid="sign-in-button"
          type="primary"
          size="extraLarge"
          style={{ width: '100%' }}
          disabled={isLoading}
          onClick={onSignIn}
        >
          {t['com.affine.auth.sign.in']()}
        </Button>
      </Wrapper>
      <BackButton
        onClick={useCallback(() => {
          setAuthState('signIn');
        }, [setAuthState])}
      />
    </>
  );
};
