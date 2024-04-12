import { DebugLogger } from '@affine/debug';
import { catchError, EMPTY, from, mergeMap, switchMap } from 'rxjs';

import { Entity } from '../../../framework';
import { effect, LiveData, onComplete, onStart } from '../../../livedata';
import type { WorkspaceMetadata } from '../metadata';
import type { WorkspaceFlavourProvider } from '../providers/flavour';
import type { WorkspaceProfileCacheStore } from '../services/profile-cache-store';
import type { Workspace } from './workspace';

const logger = new DebugLogger('affine:workspace-profile');

export interface WorkspaceProfileInfo {
  avatar?: string;
  name?: string;
}

/**
 * # WorkspaceProfile
 *
 * This class take care of workspace avatar and name
 */
export class WorkspaceProfile extends Entity<{ metadata: WorkspaceMetadata }> {
  private readonly provider: WorkspaceFlavourProvider | null;

  get id() {
    return this.props.metadata.id;
  }

  profile$ = LiveData.from<WorkspaceProfileInfo | null>(
    this.cache.watchProfileCache(this.props.metadata.id),
    null
  );

  avatar$ = this.profile$.map(v => v?.avatar);
  name$ = this.profile$.map(v => v?.name);

  isLoading$ = new LiveData(false);

  constructor(
    private readonly cache: WorkspaceProfileCacheStore,
    providers: WorkspaceFlavourProvider[]
  ) {
    super();

    this.provider =
      providers.find(p => p.flavour === this.props.metadata.flavour) ?? null;
  }

  private setCache(info: WorkspaceProfileInfo) {
    this.cache.setProfileCache(this.props.metadata.id, info);
  }

  revalidate = effect(
    switchMap(() => {
      if (!this.provider) {
        return EMPTY;
      }
      return from(
        this.provider.getWorkspaceProfile(this.props.metadata.id)
      ).pipe(
        mergeMap(info => {
          if (info) {
            this.setCache(info);
          }
          return EMPTY;
        }),
        catchError(err => {
          logger.error(err);
          return EMPTY;
        }),
        onStart(() => this.isLoading$.next(true)),
        onComplete(() => this.isLoading$.next(false))
      );
    })
  );

  syncWithWorkspace(workspace: Workspace) {
    this.setCache({
      avatar:
        workspace.docCollection.meta.avatar ?? this.profile$.value?.avatar,
      name: workspace.docCollection.meta.name ?? this.profile$.value?.name,
    });
    workspace.docCollection.meta.commonFieldsUpdated.on(() => {
      this.setCache({
        avatar:
          workspace.docCollection.meta.avatar ?? this.profile$.value?.avatar,
        name: workspace.docCollection.meta.name ?? this.profile$.value?.name,
      });
    });
  }
}
