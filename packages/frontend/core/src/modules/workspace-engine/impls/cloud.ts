import { DebugLogger } from '@affine/debug';
import { WorkspaceFlavour } from '@affine/env/workspace';
import {
  createWorkspaceMutation,
  deleteWorkspaceMutation,
  getIsOwnerQuery,
  getWorkspacesQuery,
} from '@affine/graphql';
import { DocCollection } from '@blocksuite/store';
import {
  ApplicationStarted,
  backoffRetry,
  type BlobStorage,
  catchErrorInto,
  exhaustMapSwitchUntilChanged,
  fromPromise,
  type GlobalState,
  LiveData,
  onComplete,
  OnEvent,
  onStart,
  tapError,
  type Workspace,
  type WorkspaceEngineProvider,
  type WorkspaceFlavourProvider,
  type WorkspaceMetadata,
  type WorkspaceProfileInfo,
} from '@toeverything/infra';
import { effect, globalBlockSuiteSchema, Service } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { EMPTY, lastValueFrom, map, mergeMap, timeout } from 'rxjs';
import { applyUpdate, encodeStateAsUpdate } from 'yjs';

import {
  AffineCloudAuthChanged,
  type AffineCloudAuthService,
  type AffineCloudGraphQLService,
} from '../../cloud';
import type { WorkspaceEngineStorageProvider } from '../providers/engine';
import { BroadcastChannelAwarenessConnection } from './engine/awareness-broadcast-channel';
import { CloudAwarenessConnection } from './engine/awareness-cloud';
import { CloudBlobStorage } from './engine/blob-cloud';
import { CloudDocEngineServer } from './engine/doc-cloud';
import { CloudStaticDocStorage } from './engine/doc-cloud-static';

const CLOUD_WORKSPACES_CACHE_KEY = 'cloud-workspace:';

const logger = new DebugLogger('affine:cloud-workspace-flavour-provider');

@OnEvent(ApplicationStarted, e => e.revalidate)
@OnEvent(AffineCloudAuthChanged, e => e.revalidate)
export class CloudWorkspaceFlavourProvider
  extends Service
  implements WorkspaceFlavourProvider
{
  constructor(
    private readonly globalState: GlobalState,
    private readonly authService: AffineCloudAuthService,
    private readonly storageProvider: WorkspaceEngineStorageProvider,
    private readonly graphqlService: AffineCloudGraphQLService
  ) {
    super();
  }
  flavour: WorkspaceFlavour = WorkspaceFlavour.AFFINE_CLOUD;

  async deleteWorkspace(id: string): Promise<void> {
    await this.graphqlService.gql({
      query: deleteWorkspaceMutation,
      variables: {
        id: id,
      },
    });
    this.revalidate();
    await this.waitForLoaded();
  }
  async createWorkspace(
    initial: (
      docCollection: DocCollection,
      blobStorage: BlobStorage
    ) => Promise<void>
  ): Promise<WorkspaceMetadata> {
    const tempId = nanoid();

    const docCollection = new DocCollection({
      id: tempId,
      idGenerator: () => nanoid(),
      schema: globalBlockSuiteSchema,
    });

    // create workspace on cloud, get workspace id
    const {
      createWorkspace: { id: workspaceId },
    } = await this.graphqlService.gql({
      query: createWorkspaceMutation,
    });

    // save the initial state to local storage, then sync to cloud
    const blobStorage = this.storageProvider.getBlobStorage(workspaceId);
    const docStorage = this.storageProvider.getDocStorage(workspaceId);

    // apply initial state
    await initial(docCollection, blobStorage);

    // save workspace to local storage, should be vary fast
    await docStorage.doc.set(
      workspaceId,
      encodeStateAsUpdate(docCollection.doc)
    );
    for (const subdocs of docCollection.doc.getSubdocs()) {
      await docStorage.doc.set(subdocs.guid, encodeStateAsUpdate(subdocs));
    }

    this.revalidate();
    await this.waitForLoaded();

    return { id: workspaceId, flavour: WorkspaceFlavour.AFFINE_CLOUD };
  }
  revalidate = effect(
    map(() => ({ accountId: this.authService.session.account$.value?.id })),
    exhaustMapSwitchUntilChanged(
      (a, b) => a.accountId === b.accountId,
      ({ accountId }) => {
        return fromPromise(async signal => {
          if (!accountId) {
            return null; // no cloud workspace if no account
          }

          const { workspaces } = await this.graphqlService.gql({
            query: getWorkspacesQuery,
            context: {
              signal,
            },
          });

          const ids = workspaces.map(({ id }) => id);
          return {
            accountId,
            workspaces: ids.map(id => ({
              id,
              flavour: WorkspaceFlavour.AFFINE_CLOUD,
            })),
          };
        }).pipe(
          timeout(5000),
          backoffRetry(),
          mergeMap(data => {
            if (data) {
              const { accountId, workspaces } = data;
              this.globalState.set(
                CLOUD_WORKSPACES_CACHE_KEY + accountId,
                workspaces
              );
              this.workspaces$.next(workspaces);
            } else {
              this.workspaces$.next([]);
            }
            return EMPTY;
          }),
          tapError(err => {
            logger.error('error to revalidate cloud workspaces', err);
          }),
          catchErrorInto(this.error$),
          onStart(() => this.isLoading$.next(true)),
          onComplete(() => this.isLoading$.next(false))
        );
      },
      ({ accountId }) => {
        if (accountId) {
          this.workspaces$.next(
            this.globalState.get(CLOUD_WORKSPACES_CACHE_KEY + accountId) ?? []
          );
        } else {
          this.workspaces$.next([]);
        }
      }
    )
  );
  error$ = new LiveData<any>(null);
  isLoading$ = new LiveData(false);
  workspaces$ = new LiveData<WorkspaceMetadata[]>([]);
  async getWorkspaceProfile(
    id: string
  ): Promise<WorkspaceProfileInfo | undefined> {
    // get information from both cloud and local storage

    // we use affine 'static' storage here, which use http protocol, no need to websocket.
    const cloudStorage = new CloudStaticDocStorage(id);
    const docStorage = this.storageProvider.getDocStorage(id);
    // download root doc
    const localData = await docStorage.doc.get(id);
    const cloudData = await cloudStorage.pull(id);

    const isOwner = await this.getIsOwner(id);

    if (!cloudData && !localData) {
      return {
        isOwner,
      };
    }

    const bs = new DocCollection({
      id,
      schema: globalBlockSuiteSchema,
    });

    if (localData) applyUpdate(bs.doc, localData);
    if (cloudData) applyUpdate(bs.doc, cloudData.data);

    return {
      name: bs.meta.name,
      avatar: bs.meta.avatar,
      isOwner,
    };
  }
  async getWorkspaceBlob(id: string, blob: string): Promise<Blob | null> {
    const localBlob = await this.storageProvider.getBlobStorage(id).get(blob);

    if (localBlob) {
      return localBlob;
    }

    const cloudBlob = new CloudBlobStorage(id);
    return await cloudBlob.get(blob);
  }
  getEngineProvider(workspace: Workspace): WorkspaceEngineProvider {
    return {
      getAwarenessConnections() {
        return [
          new BroadcastChannelAwarenessConnection(
            workspace.id,
            workspace.awareness
          ),
          new CloudAwarenessConnection(workspace.id, workspace.awareness),
        ];
      },
      getDocServer() {
        return new CloudDocEngineServer(workspace.id);
      },
      getDocStorage: () => {
        return this.storageProvider.getDocStorage(workspace.id);
      },
      getLocalBlobStorage: () => {
        return this.storageProvider.getBlobStorage(workspace.id);
      },
      getRemoteBlobStorages() {
        return [new CloudBlobStorage(workspace.id)];
      },
    };
  }

  private async getIsOwner(workspaceId: string) {
    return (
      await lastValueFrom(
        this.graphqlService
          .rxGql({
            query: getIsOwnerQuery,
            variables: {
              workspaceId,
            },
          })
          .pipe(timeout(3000))
      )
    ).isOwner;
  }

  private waitForLoaded() {
    return this.isLoading$.waitFor(loading => !loading);
  }
}
