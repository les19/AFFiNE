import { AffineOtherPageLayout } from '@affine/component/affine-other-page-layout';
import { SignInPageContainer } from '@affine/component/auth-components';
import { AffineCloudAuthService } from '@affine/core/modules/cloud';
import { useLiveData, useService } from '@toeverything/infra';
import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { useLocation, useNavigate } from 'react-router-dom';

import { authAtom } from '../atoms';
import type { AuthProps } from '../components/affine/auth';
import { AuthPanel } from '../components/affine/auth';
import { RouteLogic, useNavigateHelper } from '../hooks/use-navigate-helper';

interface LocationState {
  state?: {
    callbackURL?: string;
  };
}
export const SignIn = () => {
  const [{ state, email = '', emailType = 'changePassword' }, setAuthAtom] =
    useAtom(authAtom);
  const session = useService(AffineCloudAuthService).session;
  const account = useLiveData(session.account$);
  const isRevalidating = useLiveData(session.isRevalidating$);
  const location = useLocation() as LocationState;
  const navigate = useNavigate();
  const { jumpToIndex } = useNavigateHelper();

  const isLoggedIn = !!account && !isRevalidating;

  useEffect(() => {
    if (isLoggedIn) {
      if (location.state?.callbackURL) {
        navigate(location.state.callbackURL, {
          replace: true,
        });
      } else {
        jumpToIndex(RouteLogic.REPLACE);
      }
    }
  }, [jumpToIndex, location.state, navigate, setAuthAtom, isLoggedIn]);

  const onSetEmailType = useCallback(
    (emailType: AuthProps['emailType']) => {
      setAuthAtom(prev => ({ ...prev, emailType }));
    },
    [setAuthAtom]
  );

  const onSetAuthState = useCallback(
    (state: AuthProps['state']) => {
      setAuthAtom(prev => ({ ...prev, state }));
    },
    [setAuthAtom]
  );

  const onSetAuthEmail = useCallback(
    (email: AuthProps['email']) => {
      setAuthAtom(prev => ({ ...prev, email }));
    },
    [setAuthAtom]
  );

  return (
    <SignInPageContainer>
      <div style={{ maxWidth: '400px' }}>
        <AuthPanel
          state={state}
          email={email}
          emailType={emailType}
          setEmailType={onSetEmailType}
          setAuthState={onSetAuthState}
          setAuthEmail={onSetAuthEmail}
        />
      </div>
    </SignInPageContainer>
  );
};

export const Component = () => {
  return (
    <AffineOtherPageLayout>
      <div style={{ padding: '0 20px' }}>
        <SignIn />
      </div>
    </AffineOtherPageLayout>
  );
};
