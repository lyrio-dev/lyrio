import { Locale } from "@/common/locale.type";

export interface UserPreference {
  locale?: Locale;
  formatCodeByDefault?: boolean;
  codeFormatterOptions?: string;
  languageOptions?: Record<string, Record<string, string>>;
}
