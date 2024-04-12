import { useAppSettingHelper } from '@affine/core/hooks/affine/use-app-setting-helper';
import { popupWindow } from '@affine/core/utils';
import { useLiveData, useService } from '@toeverything/infra';
import type { To } from 'history';
import { useCallback } from 'react';

import { WorkbenchService } from '../services/workbench';

export const WorkbenchLink = ({
  to,
  children,
  onClick,
  ...other
}: React.PropsWithChildren<
  { to: To } & React.HTMLProps<HTMLAnchorElement>
>) => {
  const workbench = useService(WorkbenchService).workbench;
  const { appSettings } = useAppSettingHelper();
  const basename = useLiveData(workbench.basename$);
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (onClick?.(event)) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (appSettings.enableMultiView && environment.isDesktop) {
          workbench.open(to, { at: 'beside' });
        } else if (!environment.isDesktop) {
          const href =
            typeof to === 'string'
              ? to
              : `${to.pathname}${to.search}${to.hash}`;
          popupWindow(basename + href);
        }
      } else {
        workbench.open(to);
      }
    },
    [appSettings.enableMultiView, basename, onClick, to, workbench]
  );
  return (
    <a {...other} href="#" onClick={handleClick}>
      {children}
    </a>
  );
};
