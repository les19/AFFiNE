import { DebugLogger } from '@affine/debug';
import type { GetWorkspacePublicPagesQuery } from '@affine/graphql';
import type { GlobalCache, WorkspaceService } from '@toeverything/infra';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  tapError,
} from '@toeverything/infra';
import { EMPTY, mergeMap, switchMap } from 'rxjs';

import type { ShareDocsStoreService } from '../services/share-docs-store';

type ShareDocListType =
  GetWorkspacePublicPagesQuery['workspace']['publicPages'];

export const logger = new DebugLogger('affine:share-doc-list');

export class ShareDocsList extends Entity {
  list$ = LiveData.from(this.cache.watch<ShareDocListType>('share-docs'), []);
  isLoading$ = new LiveData<boolean>(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: ShareDocsStoreService,
    private readonly cache: GlobalCache
  ) {
    super();
  }

  revalidate = effect(
    switchMap(() =>
      fromPromise(signal =>
        this.store.getWorkspacesShareDocs(
          this.workspaceService.workspace.id,
          signal
        )
      ).pipe(
        backoffRetry(),
        mergeMap(list => {
          this.cache.set('share-docs', list);
          return EMPTY;
        }),
        tapError(err => logger.error('revalidate share docs error', err)),
        catchErrorInto(this.error$),
        onStart(() => {
          this.isLoading$.next(true);
        }),
        onComplete(() => {
          this.isLoading$.next(false);
        })
      )
    )
  );
}
