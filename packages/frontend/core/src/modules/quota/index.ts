export { WorkspaceQuotaService } from './services/quota';

import { AffineCloudGraphQLService } from '@affine/core/modules/cloud';
import {
  type Framework,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { WorkspaceQuota } from './entities/quota';
import { WorkspaceQuotaService } from './services/quota';
import { WorkspaceQuotaStoreService } from './services/quota-store';

export function configureQuotaModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(WorkspaceQuotaService)
    .service(WorkspaceQuotaStoreService, [AffineCloudGraphQLService])
    .entity(WorkspaceQuota, [WorkspaceService, WorkspaceQuotaStoreService]);
}
