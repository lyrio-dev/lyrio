const KEY_SETTINGS_KEY = "settings-key";

export function Settings(key: string): ClassDecorator {
  return Reflect.metadata(KEY_SETTINGS_KEY, key);
}

export function getSettingsKey<T>(Class: T): string {
  return Reflect.getMetadata(KEY_SETTINGS_KEY, Class);
}
