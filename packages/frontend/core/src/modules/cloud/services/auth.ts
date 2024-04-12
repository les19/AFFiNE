import {
  ApplicationStarted,
  createEvent,
  OnEvent,
  Service,
} from '@toeverything/infra';
import { distinctUntilChanged, map, skip } from 'rxjs';

import { AuthSession } from '../entities/session';

export const AccountChanged = createEvent<string | null>('AccountChanged');

@OnEvent(ApplicationStarted, e => e.onApplicationStart)
export class AuthService extends Service {
  session = this.framework.createEntity(AuthSession);

  constructor() {
    super();

    this.session.account$
      .pipe(
        map(a => a?.id),
        distinctUntilChanged(), // only emit when the value changes
        skip(1) // skip the initial value
      )
      .subscribe(accountId => {
        this.eventBus.emit(AccountChanged, accountId ?? null);
      });
  }

  private onApplicationStart() {
    this.session.revalidate(true);
  }
}
