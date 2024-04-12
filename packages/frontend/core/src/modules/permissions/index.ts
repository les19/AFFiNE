export { WorkspacePermissionService } from './services/permission';

import { AffineCloudGraphQLService } from '@affine/core/modules/cloud';
import {
  type Framework,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { WorkspacePermission } from './entities/permission';
import { WorkspacePermissionService } from './services/permission';
import { WorkspacePermissionStoreService } from './services/permission-store';

export function configurePermissionsModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(WorkspacePermissionService)
    .service(WorkspacePermissionStoreService, [AffineCloudGraphQLService])
    .entity(WorkspacePermission, [
      WorkspaceService,
      WorkspacePermissionStoreService,
    ]);
}
