import { Locale } from "@/common/locale.type";

export interface UserPreference {
  systemLocale?: Locale;
  contentLocale?: Locale;
  doNotFormatCodeByDefault?: boolean;
  defaultCodeLanguage?: string;
  defaultCodeLanguageOptions?: Record<string, string>;
}
