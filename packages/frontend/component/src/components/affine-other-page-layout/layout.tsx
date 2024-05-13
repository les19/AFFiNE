import { Button } from '@affine/component/ui/button';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useCallback } from 'react';

import { DesktopNavbar } from './desktop-navbar';
import * as styles from './index.css';
import { MobileNavbar } from './mobile-navbar';
import { SmallLogoIcon } from '../icons/smallLogoIcon';

export const AffineOtherPageLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const t = useAFFiNEI18N();

  const openDownloadLink = useCallback(() => {
    open(runtimeConfig.downloadUrl, '_blank');
  }, []);

  return (
    <div className={styles.root}>
      {environment.isDesktop ? null : (
        <div className={styles.topNav}>
          <a href="/" rel="noreferrer" className={styles.affineLogo}>
            <SmallLogoIcon width={24} height={24} />
          </a>

          <DesktopNavbar />
          <MobileNavbar />
        </div>
      )}

      {children}
    </div>
  );
};
