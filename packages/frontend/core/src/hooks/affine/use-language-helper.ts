import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import { LOCALES, useI18N } from '@affine/i18n';
import { useEffect, useMemo } from 'react';

export function useLanguageHelper() {
  const i18n = useI18N();
  const currentLanguage = useMemo(
    () => LOCALES.find(item => item.tag === i18n.language),
    [i18n.language]
  );
  const languagesList = useMemo(
    () =>
      LOCALES.filter(item => item.name === 'English').map(item => ({
        tag: item.tag,
        originalName: item.originalName,
        name: item.name,
        Completeness: item.completeRate,
      })),
    []
  );
  const onLanguageChange = useAsyncCallback(
    async (event: string) => {
      await i18n.changeLanguage(event);
    },
    [i18n]
  );

  useEffect(() => {
    if (currentLanguage) {
      document.documentElement.lang = currentLanguage.tag;
    }
  }, [currentLanguage]);

  return useMemo(
    () => ({
      currentLanguage,
      languagesList,
      onLanguageChange,
    }),
    [currentLanguage, languagesList, onLanguageChange]
  );
}
