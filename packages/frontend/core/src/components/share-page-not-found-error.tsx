import { Empty } from '@affine/component';
import { Logo1Icon } from '@blocksuite/icons';
import { SmallLogoIcon } from './icons/smallLogoIcon';

export const SharePageNotFoundError = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <a
        href="https://altertask.xyz/"
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          fontSize: '24px',
          cursor: 'pointer',
        }}
      >
        <SmallLogoIcon />
      </a>
      <Empty
        description={'You do not have access or this content does not exist.'}
      />
    </div>
  );
};
