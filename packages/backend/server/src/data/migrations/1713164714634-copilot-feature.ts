import { PrismaClient } from '@prisma/client';

import { FeatureKind, FeatureType } from '../../core/features';
import { QuotaType } from '../../core/quota/types';
import { upgradeLatestQuotaVersion } from './utils/user-quotas';

export class CopilotFeature1713164714634 {
  // do the migration
  static async up(db: PrismaClient) {
    await upgradeLatestQuotaVersion(
      db,
      QuotaType.ProPlanV1,
      'pro plan 1.1 migration'
    );
    await upgradeLatestQuotaVersion(
      db,
      QuotaType.RestrictedPlanV1,
      'restricted plan 1.1 migration'
    );

    // migrate ea users with copilot feature
    await addCopilotFeature(db);
  }

  // revert the migration
  static async down(_db: PrismaClient) {}
}

async function addCopilotFeature(db: PrismaClient) {
  await db.$transaction(async tx => {
    const featureId = await tx.features
      .findFirst({
        where: {
          feature: FeatureType.UnlimitedCopilot,
          version: 1,
        },
        select: { id: true },
      })
      .then(f => f?.id);
    if (!featureId) throw new Error('Copilot feature not exists');

    const userIds = await tx.userFeatures
      .findMany({
        where: {
          feature: {
            feature: FeatureType.EarlyAccess,
            type: FeatureKind.Feature,
          },
          OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
          activated: true,
        },
        select: {
          userId: true,
        },
      })
      .then(u => u.map(u => u.userId));

    const hasCopilotUserIds = await tx.userFeatures
      .findMany({
        where: {
          userId: { in: userIds },
          feature: {
            feature: FeatureType.UnlimitedCopilot,
          },
        },
        select: {
          userId: true,
        },
      })
      .then(u => u.map(u => u.userId));

    const newUsers = userIds.filter(u => !hasCopilotUserIds.includes(u));

    await tx.userFeatures.createMany({
      data: newUsers.map(userId => ({
        userId,
        featureId,
        reason: 'Early access bonus',
        activated: true,
        // 1 year
        expiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })),
    });
  });
}
