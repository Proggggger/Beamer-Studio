import type { LanguageId } from '../model/types';

export type LanguageScript = 'latin' | 'greek' | 'cyrillic';

export interface LanguageOption {
  id: LanguageId;
  label: string;
  /** Language name understood by polyglossia. */
  tex: string;
  script: LanguageScript;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'english', label: 'English', tex: 'english', script: 'latin' },
  { id: 'german', label: 'German', tex: 'german', script: 'latin' },
  { id: 'french', label: 'French', tex: 'french', script: 'latin' },
  { id: 'spanish', label: 'Spanish', tex: 'spanish', script: 'latin' },
  { id: 'italian', label: 'Italian', tex: 'italian', script: 'latin' },
  { id: 'portuguese', label: 'Portuguese', tex: 'portuguese', script: 'latin' },
  { id: 'dutch', label: 'Dutch', tex: 'dutch', script: 'latin' },
  { id: 'swedish', label: 'Swedish', tex: 'swedish', script: 'latin' },
  { id: 'norsk', label: 'Norwegian', tex: 'norsk', script: 'latin' },
  { id: 'danish', label: 'Danish', tex: 'danish', script: 'latin' },
  { id: 'finnish', label: 'Finnish', tex: 'finnish', script: 'latin' },
  { id: 'icelandic', label: 'Icelandic', tex: 'icelandic', script: 'latin' },
  { id: 'polish', label: 'Polish', tex: 'polish', script: 'latin' },
  { id: 'czech', label: 'Czech', tex: 'czech', script: 'latin' },
  { id: 'slovak', label: 'Slovak', tex: 'slovak', script: 'latin' },
  { id: 'magyar', label: 'Hungarian', tex: 'magyar', script: 'latin' },
  { id: 'romanian', label: 'Romanian', tex: 'romanian', script: 'latin' },
  { id: 'catalan', label: 'Catalan', tex: 'catalan', script: 'latin' },
  { id: 'croatian', label: 'Croatian', tex: 'croatian', script: 'latin' },
  { id: 'turkish', label: 'Turkish', tex: 'turkish', script: 'latin' },
  { id: 'latin', label: 'Latin', tex: 'latin', script: 'latin' },
  { id: 'estonian', label: 'Estonian', tex: 'estonian', script: 'latin' },
  { id: 'latvian', label: 'Latvian', tex: 'latvian', script: 'latin' },
  { id: 'lithuanian', label: 'Lithuanian', tex: 'lithuanian', script: 'latin' },
  { id: 'greek', label: 'Greek', tex: 'greek', script: 'greek' },
  { id: 'russian', label: 'Russian', tex: 'russian', script: 'cyrillic' },
  { id: 'ukrainian', label: 'Ukrainian', tex: 'ukrainian', script: 'cyrillic' },
  { id: 'bulgarian', label: 'Bulgarian', tex: 'bulgarian', script: 'cyrillic' },
];

export const LANGUAGE_IDS = LANGUAGE_OPTIONS.map((option) => option.id);

export function languageOption(id: LanguageId): LanguageOption {
  return LANGUAGE_OPTIONS.find((option) => option.id === id) ?? LANGUAGE_OPTIONS[0];
}

export function languageScripts(ids: LanguageId[]): Set<LanguageScript> {
  return new Set(ids.map((id) => languageOption(id).script));
}
