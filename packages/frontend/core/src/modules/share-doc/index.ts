export { ShareDocsService } from './services/share-docs';

import {
  type Framework,
  WorkspaceLocalCache,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { AffineCloudGraphQLService } from '../cloud';
import { ShareDocsList } from './entities/share-docs-list';
import { ShareDocsService } from './services/share-docs';
import { ShareDocsStoreService } from './services/share-docs-store';

export function configureShareDocsModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(ShareDocsService)
    .service(ShareDocsStoreService, [AffineCloudGraphQLService])
    .entity(ShareDocsList, [
      WorkspaceService,
      ShareDocsStoreService,
      WorkspaceLocalCache,
    ]);
}
