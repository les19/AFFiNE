import { useBlockSuitePageReferences } from '@affine/core/hooks/use-block-suite-page-references';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { EdgelessIcon, PageIcon } from '@blocksuite/icons';
import type { DocCollection, DocMeta } from '@blocksuite/store';
import { useDraggable } from '@dnd-kit/core';
import * as Collapsible from '@radix-ui/react-collapsible';
import { DocsService, useLiveData, useService } from '@toeverything/infra';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  type DNDIdentifier,
  getDNDId,
} from '../../../../hooks/affine/use-global-dnd-helper';
import { useNavigateHelper } from '../../../../hooks/use-navigate-helper';
import { MenuItem as CollectionItem } from '../../../app-sidebar';
import { DragMenuItemOverlay } from '../components/drag-menu-item-overlay';
import { PostfixItem } from '../components/postfix-item';
import { ReferencePage } from '../components/reference-page';
import * as styles from './styles.css';

export const Doc = ({
  doc,
  parentId,
  docCollection,
  allPageMeta,
  inAllowList,
  removeFromAllowList,
}: {
  parentId: DNDIdentifier;
  doc: DocMeta;
  inAllowList: boolean;
  removeFromAllowList: (id: string) => void;
  docCollection: DocCollection;
  allPageMeta: Record<string, DocMeta>;
}) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const params = useParams();

  const t = useAFFiNEI18N();

  const docId = doc.id;
  const active = params.pageId === docId;
  const docRecord = useLiveData(
    useService(DocsService).docRecordList.record$(docId)
  );
  const docMode = useLiveData(docRecord?.mode$);
  const dragItemId = getDNDId('collection-list', 'doc', docId, parentId);

  const icon = useMemo(() => {
    return docMode === 'edgeless' ? <EdgelessIcon /> : <PageIcon />;
  }, [docMode]);

  const { jumpToPage } = useNavigateHelper();
  const clickDoc = useCallback(() => {
    jumpToPage(docCollection.id, doc.id);
  }, [jumpToPage, doc.id, docCollection.id]);

  const references = useBlockSuitePageReferences(docCollection, docId);
  const referencesToRender = references.filter(
    id => allPageMeta[id] && !allPageMeta[id]?.trash
  );

  const docTitle = doc.title || t['Untitled']();
  const docTitleElement = useMemo(() => {
    return <DragMenuItemOverlay icon={icon} title={docTitle} />;
  }, [icon, docTitle]);

  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: dragItemId,
    data: {
      preview: docTitleElement,
    },
  });

  return (
    <Collapsible.Root
      open={!collapsed}
      data-draggable={true}
      data-dragging={isDragging}
    >
      <CollectionItem
        data-testid="collection-page"
        data-type="collection-list-item"
        icon={icon}
        onClick={clickDoc}
        className={styles.title}
        active={active}
        collapsed={referencesToRender.length > 0 ? collapsed : undefined}
        onCollapsedChange={setCollapsed}
        postfix={
          <PostfixItem
            docCollection={docCollection}
            pageId={docId}
            pageTitle={docTitle}
            removeFromAllowList={removeFromAllowList}
            inAllowList={inAllowList}
          />
        }
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        {doc.title || t['Untitled']()}
      </CollectionItem>
      <Collapsible.Content className={styles.collapsibleContent}>
        {referencesToRender.map(id => {
          return (
            <ReferencePage
              key={id}
              docCollection={docCollection}
              pageId={id}
              metaMapping={allPageMeta}
              parentIds={new Set([docId])}
            />
          );
        })}
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
