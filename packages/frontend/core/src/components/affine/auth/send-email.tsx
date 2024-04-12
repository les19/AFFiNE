import { notify, Wrapper } from '@affine/component';
import {
  AuthContent,
  AuthInput,
  BackButton,
  ModalHeader,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import {
  sendChangeEmailMutation,
  sendChangePasswordEmailMutation,
  sendSetPasswordEmailMutation,
  sendVerifyEmailMutation,
} from '@affine/graphql';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import { useMutation } from '../../../hooks/use-mutation';
import { AffineCloudServerConfigService } from '../../../modules/cloud';
import type { AuthPanelProps } from './index';

const useEmailTitle = (emailType: AuthPanelProps['emailType']) => {
  const t = useAFFiNEI18N();

  switch (emailType) {
    case 'setPassword':
      return t['com.affine.auth.set.password']();
    case 'changePassword':
      return t['com.affine.auth.reset.password']();
    case 'changeEmail':
      return t['com.affine.settings.email.action.change']();
    case 'verifyEmail':
      return t['com.affine.settings.email.action.verify']();
  }
};

const useNotificationHint = (emailType: AuthPanelProps['emailType']) => {
  const t = useAFFiNEI18N();

  switch (emailType) {
    case 'setPassword':
      return t['com.affine.auth.sent.set.password.hint']();
    case 'changePassword':
      return t['com.affine.auth.sent.change.password.hint']();
    case 'changeEmail':
    case 'verifyEmail':
      return t['com.affine.auth.sent.verify.email.hint']();
  }
};
const useButtonContent = (emailType: AuthPanelProps['emailType']) => {
  const t = useAFFiNEI18N();

  switch (emailType) {
    case 'setPassword':
      return t['com.affine.auth.send.set.password.link']();
    case 'changePassword':
      return t['com.affine.auth.send.reset.password.link']();
    case 'changeEmail':
    case 'verifyEmail':
      return t['com.affine.auth.send.verify.email.hint']();
  }
};

const useSendEmail = (emailType: AuthPanelProps['emailType']) => {
  const {
    trigger: sendChangePasswordEmail,
    isMutating: isChangePasswordMutating,
  } = useMutation({
    mutation: sendChangePasswordEmailMutation,
  });
  const { trigger: sendSetPasswordEmail, isMutating: isSetPasswordMutating } =
    useMutation({
      mutation: sendSetPasswordEmailMutation,
    });
  const { trigger: sendChangeEmail, isMutating: isChangeEmailMutating } =
    useMutation({
      mutation: sendChangeEmailMutation,
    });
  const { trigger: sendVerifyEmail, isMutating: isVerifyEmailMutation } =
    useMutation({
      mutation: sendVerifyEmailMutation,
    });

  return {
    loading:
      isChangePasswordMutating ||
      isSetPasswordMutating ||
      isChangeEmailMutating ||
      isVerifyEmailMutation,
    sendEmail: useCallback(
      (email: string) => {
        let trigger: (args: {
          email: string;
          callbackUrl: string;
        }) => Promise<unknown>;
        let callbackUrl;
        switch (emailType) {
          case 'setPassword':
            trigger = sendSetPasswordEmail;
            callbackUrl = 'setPassword';
            break;
          case 'changePassword':
            trigger = sendChangePasswordEmail;
            callbackUrl = 'changePassword';
            break;
          case 'changeEmail':
            trigger = sendChangeEmail;
            callbackUrl = 'changeEmail';
            break;
          case 'verifyEmail':
            trigger = sendVerifyEmail;
            callbackUrl = 'verify-email';
            break;
        }
        // TODO: add error handler
        return trigger({
          email,
          callbackUrl: `/auth/${callbackUrl}?isClient=${
            environment.isDesktop ? 'true' : 'false'
          }`,
        });
      },
      [
        emailType,
        sendChangeEmail,
        sendChangePasswordEmail,
        sendSetPasswordEmail,
        sendVerifyEmail,
      ]
    ),
  };
};

export const SendEmail = ({
  setAuthState,
  email,
  emailType,
}: AuthPanelProps) => {
  const t = useAFFiNEI18N();
  const serverConfig = useService(AffineCloudServerConfigService).serverConfig;
  useEffect(() => {
    // load server config
    serverConfig.revalidateIfNeeded();
  }, [serverConfig]);

  const passwordLimits = useLiveData(
    serverConfig.credentialsRequirement$.map(r => r?.password)
  );
  const [hasSentEmail, setHasSentEmail] = useState(false);

  const title = useEmailTitle(emailType);
  const hint = useNotificationHint(emailType);
  const buttonContent = useButtonContent(emailType);
  const { loading, sendEmail } = useSendEmail(emailType);

  const onSendEmail = useAsyncCallback(async () => {
    // TODO: add error handler
    await sendEmail(email);

    notify.success({ title: hint });
    setHasSentEmail(true);
  }, [email, hint, sendEmail]);

  const onBack = useCallback(() => {
    setAuthState('signIn');
  }, [setAuthState]);

  if (!passwordLimits) {
    // TODO: loading & error UI
    return null;
  }

  const content =
    emailType === 'setPassword'
      ? t['com.affine.auth.set.password.message']({
          min: String(passwordLimits.minLength),
          max: String(passwordLimits.maxLength),
        })
      : emailType === 'changePassword'
        ? t['com.affine.auth.reset.password.message']()
        : emailType === 'changeEmail' || emailType === 'verifyEmail'
          ? t['com.affine.auth.verify.email.message']({ email })
          : null;

  return (
    <>
      <ModalHeader
        title={t['com.affine.brand.affineCloud']()}
        subTitle={title}
      />
      <AuthContent>{content}</AuthContent>

      <Wrapper
        marginTop={30}
        marginBottom={50}
        style={{
          position: 'relative',
        }}
      >
        <AuthInput
          label={t['com.affine.settings.email']()}
          disabled={true}
          value={email}
        />
      </Wrapper>

      <Button
        type="primary"
        size="extraLarge"
        style={{ width: '100%' }}
        disabled={hasSentEmail}
        loading={loading}
        onClick={onSendEmail}
      >
        {hasSentEmail ? t['com.affine.auth.sent']() : buttonContent}
      </Button>
      <BackButton onClick={onBack} />
    </>
  );
};
