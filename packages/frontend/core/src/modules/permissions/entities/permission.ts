import { DebugLogger } from '@affine/debug';
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

import type { WorkspacePermissionStoreService } from '../services/permission-store';

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspacePermission extends Entity {
  isOwner$ = new LiveData<boolean | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspacePermissionStoreService
  ) {
    super();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.fetchIsOwner(this.workspaceService.workspace.id, signal)
      ).pipe(
        timeout(5000),
        backoffRetry(),
        mapInto(this.isOwner$),
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
