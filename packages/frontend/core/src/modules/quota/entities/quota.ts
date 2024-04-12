import { DebugLogger } from '@affine/debug';
import type { WorkspaceQuotaQuery } from '@affine/graphql';
import type { WorkspaceService } from '@toeverything/infra';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  mapInto,
  onComplete,
  onStart,
  tapError,
} from '@toeverything/infra';
import { exhaustMap, timeout } from 'rxjs';

import type { WorkspaceQuotaStoreService } from '../services/quota-store';

type QuotaType = WorkspaceQuotaQuery['workspace']['quota'];

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspaceQuota extends Entity {
  quota$ = new LiveData<QuotaType | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspaceQuotaStoreService
  ) {
    super();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.fetchWorkspaceQuota(
          this.workspaceService.workspace.id,
          signal
        )
      ).pipe(
        timeout(5000),
        backoffRetry(),
        mapInto(this.quota$),
        tapError(error => {
          logger.error('Failed to fetch isOwner', error);
        }),
        catchErrorInto(this.error$),
        onStart(() => this.isLoading$.setValue(true)),
        onComplete(() => this.isLoading$.setValue(false))
      );
    })
  );
}
