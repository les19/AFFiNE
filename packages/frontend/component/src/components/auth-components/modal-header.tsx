import { Logo1Icon } from '@blocksuite/icons';
import type { FC } from 'react';

import { modalHeaderWrapper } from './share.css';
import { SmallLogoIcon } from '../icons/smallLogoIcon';
export const ModalHeader: FC<{
  title: string;
  subTitle: string;
}> = ({ title, subTitle }) => {
  return (
    <div className={modalHeaderWrapper}>
      <p>
        <SmallLogoIcon className="logo" />
        {title}
      </p>
      <p>{subTitle}</p>
    </div>
  );
};
