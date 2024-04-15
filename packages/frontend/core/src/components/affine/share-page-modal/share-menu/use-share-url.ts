import { toast } from '@affine/component';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { AffineCloudServerConfigService } from '../../../../modules/cloud';

type UrlType = 'share' | 'workspace';

type UseSharingUrl = {
  workspaceId: string;
  pageId: string;
  urlType: UrlType;
};

const useGenerateUrl = ({ workspaceId, pageId, urlType }: UseSharingUrl) => {
  // to generate a private url like https://app.affine.app/workspace/123/456
  // to generate a public url like https://app.affine.app/share/123/456
  // or https://app.affine.app/share/123/456?mode=edgeless

  const serverConfig = useService(AffineCloudServerConfigService).serverConfig;

  const baseUrl = useLiveData(serverConfig.config$.map(c => c?.baseUrl));

  const url = useMemo(() => {
    // baseUrl is null when running in electron and without network
    if (!baseUrl) return null;

    try {
      return new URL(
        `${baseUrl}/${urlType}/${workspaceId}/${pageId}`
      ).toString();
    } catch (e) {
      return null;
    }
  }, [baseUrl, pageId, urlType, workspaceId]);

  return url;
};

export const useSharingUrl = ({
  workspaceId,
  pageId,
  urlType,
}: UseSharingUrl) => {
  const t = useAFFiNEI18N();
  const sharingUrl = useGenerateUrl({ workspaceId, pageId, urlType });

  const onClickCopyLink = useCallback(() => {
    if (sharingUrl) {
      navigator.clipboard
        .writeText(sharingUrl)
        .then(() => {
          toast(t['Copied link to clipboard']());
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      toast('Network not available');
    }
  }, [sharingUrl, t]);

  return {
    sharingUrl,
    onClickCopyLink,
  };
};
