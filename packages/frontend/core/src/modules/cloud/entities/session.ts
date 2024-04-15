import {
  backoffRetry,
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { EMPTY, exhaustMap, mergeMap, timeout } from 'rxjs';

import { validateAndReduceImage } from '../../../utils/reduce-image';
import type { AccountProfile, AuthStoreService } from '../services/auth-store';

export interface AuthSessionInfo {
  account: AuthAccountInfo;
}

export interface AuthAccountInfo {
  id: string;
  label: string;
  email?: string;
  info?: AccountProfile | null;
  avatar?: string | null;
}

export interface AuthSessionUnauthenticated {
  status: 'unauthenticated';
}

export interface AuthSessionAuthenticated {
  status: 'authenticated';
  session: AuthSessionInfo;
}

export class AuthSession extends Entity {
  id = 'affine-cloud' as const;

  session$: LiveData<AuthSessionUnauthenticated | AuthSessionAuthenticated> =
    LiveData.from(this.store.watchCachedAuthSession(), null).map(session =>
      session
        ? {
            status: 'authenticated',
            session: session as AuthSessionInfo,
          }
        : {
            status: 'unauthenticated',
          }
    );

  status$ = this.session$.map(session => session.status);

  account$ = this.session$.map(session =>
    session.status === 'authenticated' ? session.session.account : null
  );

  waitForAuthenticated = (signal?: AbortSignal) =>
    this.session$.waitFor(
      session => session.status === 'authenticated',
      signal
    ) as Promise<AuthSessionAuthenticated>;

  isRevalidating$ = new LiveData(false);

  constructor(private readonly store: AuthStoreService) {
    super();
  }

  revalidate = effect(
    exhaustMap((_: boolean) =>
      fromPromise(this.getSession()).pipe(
        timeout(5000),
        backoffRetry({
          count: Infinity,
          maxDelay: 10000,
        }),
        mergeMap(sessionInfo => {
          this.store.setCachedAuthSession(sessionInfo);
          return EMPTY;
        }),
        onStart(() => {
          console.log('onStart');
          this.isRevalidating$.next(true);
        }),
        onComplete(() => {
          console.log('onComplete');
          this.isRevalidating$.next(false);
        })
      )
    )
  );

  private async getSession(): Promise<AuthSessionInfo | null> {
    const session = await this.store.fetchSession();

    if (session?.user) {
      const account = {
        id: session.user.id,
        email: session.user.email,
        label: session.user.name,
        avatar: session.user.avatarUrl,
        info: session.user,
      };
      const result = {
        account,
      };
      return result;
    } else {
      return null;
    }
  }

  async waitForRevalidation() {
    this.revalidate(true);
    await this.isRevalidating$.waitFor(isRevalidating => !isRevalidating);
  }

  removeAvatar() {
    return this.store.removeAvatar();
  }

  async uploadAvatar(file: File) {
    const reducedFile = await validateAndReduceImage(file);
    await this.store.uploadAvatar(reducedFile);
    await this.waitForRevalidation();
  }

  async updateLabel(label: string) {
    await this.store.updateLabel(label);
    console.log('updateLabel');
    await this.waitForRevalidation();
  }

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
