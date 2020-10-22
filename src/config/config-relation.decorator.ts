import objectPath from "object-path";

export enum ConfigRelationType {
  LessThan = "LessThan",
  LessThanOrEqual = "LessThanOrEqual",
  MoreThan = "MoreThan",
  MoreThanOrEqual = "MoreThanOrEqual"
}

function satisfy(thisValue: number, referencedValue: number, relationType: ConfigRelationType) {
  switch (relationType) {
    case ConfigRelationType.LessThan:
      return thisValue < referencedValue;
    case ConfigRelationType.LessThanOrEqual:
      return thisValue <= referencedValue;
    case ConfigRelationType.MoreThan:
      return thisValue > referencedValue;
    case ConfigRelationType.MoreThanOrEqual:
      return thisValue >= referencedValue;
    default:
      return false;
  }
}

export interface ConfigRelationMetadata {
  referencedValuePath: string;
  relationType: ConfigRelationType;
}

const CONFIG_RELATION_METADATA_KEY = "config-relation";

/**
 * Ensure this config item must satisfy `relationType` relation comparing to `referencedValuePath`
 * of config.
 *
 * @param referencedValuePath
 * @param type
 */
export function ConfigRelation(referencedValuePath: string, relationType: ConfigRelationType) {
  return Reflect.metadata(CONFIG_RELATION_METADATA_KEY, <ConfigRelationMetadata>{
    referencedValuePath,
    relationType
  });
}

function checkConfigRelationRecursively(
  configSubtree: Record<string, unknown>,
  currentPath: string,
  configRoot: Record<string, unknown>
) {
  if (!configSubtree) return;

  Object.keys(configSubtree).forEach(key => {
    const metadata = Reflect.getMetadata(CONFIG_RELATION_METADATA_KEY, configSubtree, key) as ConfigRelationMetadata;
    const item = configSubtree[key];

    if (typeof item === "number" && metadata) {
      const thisValue = item;
      const referencedValue = objectPath.get(configRoot, metadata.referencedValuePath) as number;
      if (!satisfy(thisValue, referencedValue, metadata.relationType)) {
        throw new Error(
          `Config validation error: ${currentPath}${key} must satisfy the relation "${metadata.relationType}" when comparing to ${metadata.referencedValuePath}`
        );
      }
    }

    if (typeof item === "object") {
      checkConfigRelationRecursively(item as Record<string, unknown>, `${currentPath}.${key}`, configRoot);
    }
  });
}

export function checkConfigRelation(config: Record<string, unknown>) {
  checkConfigRelationRecursively(config, "", config);
}
