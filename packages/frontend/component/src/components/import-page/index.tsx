import {
  CloseIcon,
  ExportToHtmlIcon,
  ExportToMarkdownIcon,
  HelpIcon,
  NewIcon,
  NotionIcon,
} from '@blocksuite/icons';

import { IconButton } from '../../ui/button';
import { Tooltip } from '../../ui/tooltip';
import { BlockCard } from '../card/block-card';
import {
  importPageBodyStyle,
  importPageButtonContainerStyle,
  importPageContainerStyle,
} from './index.css';

export const ImportPage = ({
  importMarkdown,
  importHtml,
  importNotion,
  onClose,
}: {
  importMarkdown: () => void;
  importHtml: () => void;
  importNotion: () => void;
  onClose: () => void;
}) => (
  <div className={importPageContainerStyle}>
    <IconButton
      style={{
        position: 'absolute',
        right: 6,
        top: 6,
      }}
      onClick={() => {
        onClose();
      }}
      icon={<CloseIcon />}
    />
    <div className={importPageButtonContainerStyle}>
      <BlockCard
        left={<ExportToMarkdownIcon width={20} height={20} />}
        title="Markdown"
        onClick={importMarkdown}
      />
      <BlockCard
        left={<ExportToHtmlIcon width={20} height={20} />}
        title="HTML"
        onClick={importHtml}
      />
      <BlockCard
        left={<NotionIcon width={20} height={20} />}
        title="Notion"
        right={
          <Tooltip
            content={'Learn how to Import your Notion pages into AFFiNE.'}
          >
            <HelpIcon width={20} height={20} />
          </Tooltip>
        }
        onClick={importNotion}
      />
      <BlockCard
        left={<NewIcon width={20} height={20} />}
        title="Coming soon..."
        disabled
        onClick={importHtml}
      />
    </div>
  </div>
);
