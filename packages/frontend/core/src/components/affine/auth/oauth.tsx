import { Button } from '@affine/component/ui/button';
import { OAuthProviderType } from '@affine/graphql';
import { GithubIcon, GoogleDuotoneIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { AffineCloudServerConfigService } from '../../../modules/cloud';
import { mixpanel } from '../../../utils';
import { useAuth } from './use-auth';

const OAuthProviderMap: Record<
  OAuthProviderType,
  {
    icon: ReactElement;
  }
> = {
  [OAuthProviderType.Google]: {
    icon: <GoogleDuotoneIcon />,
  },

  [OAuthProviderType.GitHub]: {
    icon: <GithubIcon />,
  },
};

export function OAuth() {
  const serverConfig = useService(AffineCloudServerConfigService).serverConfig;
  useEffect(() => {
    // load server config
    serverConfig.revalidateIfNeeded();
  }, [serverConfig]);
  const oauth = useLiveData(serverConfig.features$.map(r => r?.oauth));
  const oauthProviders = useLiveData(
    serverConfig.config$.map(r => r?.oauthProviders)
  );

  if (!oauth) {
    // TODO: loading & error UI
    return null;
  }

  return oauthProviders?.map(provider => (
    <OAuthProvider key={provider} provider={provider} />
  ));
}

function OAuthProvider({ provider }: { provider: OAuthProviderType }) {
  const { icon } = OAuthProviderMap[provider];
  const { oauthSignIn } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const onClick = useCallback(() => {
    setIsConnecting(true);
    oauthSignIn(provider);
    mixpanel.track('OAuth', { provider });
  }, [provider, oauthSignIn]);

  return (
    <Button
      key={provider}
      type="primary"
      block
      size="extraLarge"
      style={{ marginTop: 30 }}
      icon={icon}
      onClick={onClick}
    >
      Continue with {provider}
      {isConnecting && '...'}
    </Button>
  );
}
