import { Avatar } from '@affine/component/ui/avatar';
import {
  Menu,
  MenuIcon,
  MenuItem,
  MenuSeparator,
} from '@affine/component/ui/menu';
import { useCurrentUser } from '@affine/core/hooks/affine/use-current-user';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import { signOutCloud } from '@affine/core/utils/cloud-utils';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { SignOutIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { AffineCloudSubscriptionService } from '../../../modules/cloud';
import * as styles from './styles.css';

const UserInfo = () => {
  const user = useCurrentUser();
  const subscription = useService(AffineCloudSubscriptionService).subscription;
  useEffect(() => {
    subscription.revalidate();
  }, [subscription]);
  const primary = useLiveData(subscription.primary$);
  const plan = primary?.plan;
  return (
    <div className={styles.accountCard}>
      <Avatar
        size={28}
        name={user.name}
        url={user.avatarUrl}
        className={styles.avatar}
      />

      <div className={styles.content}>
        <div className={styles.nameContainer}>
          <div className={styles.userName} title={user.name}>
            {user.name}
          </div>
          {plan && <div className={styles.userPlanButton}>{plan}</div>}
        </div>
        <div className={styles.userEmail} title={user.email}>
          {user.email}
        </div>
      </div>
    </div>
  );
};

export const PublishPageUserAvatar = () => {
  const user = useCurrentUser();
  const t = useAFFiNEI18N();
  const location = useLocation();

  const handleSignOut = useAsyncCallback(async () => {
    await signOutCloud(location.pathname);
  }, [location.pathname]);

  const menuItem = useMemo(() => {
    return (
      <>
        <UserInfo />
        <MenuSeparator />
        <MenuItem
          preFix={
            <MenuIcon>
              <SignOutIcon />
            </MenuIcon>
          }
          data-testid="share-page-sign-out-option"
          onClick={handleSignOut}
        >
          {t['com.affine.workspace.cloud.account.logout']()}
        </MenuItem>
      </>
    );
  }, [handleSignOut, t]);

  return (
    <Menu
      items={menuItem}
      contentOptions={{
        style: {
          transform: 'translateX(-16px)',
        },
      }}
    >
      <div className={styles.iconWrapper} data-testid="share-page-user-avatar">
        <Avatar size={24} url={user.avatarUrl} name={user.name} />
      </div>
    </Menu>
  );
};
