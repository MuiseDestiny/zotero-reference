import { config } from "../../package.json";

/**
 * Initialize locale data
 */
export function initLocale() {
  const l10n = ztoolkit.getGlobal("L10nRegistry").getInstance();
  const bundleGenerator = l10n.generateBundlesSync(
    [Zotero.locale, "en-US"],
    [`${config.addonRef}-addon.ftl`]
  );
  const currentBundle = bundleGenerator.next().value;
  const defaultBundle =
    Zotero.locale !== "en-US" ? bundleGenerator.next().value : null;
  addon.data.locale = {
    current: currentBundle,
    default: defaultBundle,
  };
}

/**
 * Get locale string
 * @param localString
 * @param branch branch name
 * @example
 * ```ftl
 * # addon.ftl
 * addon-name = Addon Template
 *     .label = Addon Template Label
 * ```
 * ```js
 * getString("addon-name"); // Addon Template
 * getString("addon-name", "label"); // Addon Template Label
 * ```
 */
export function getString(localString: string, branch = ""): string {
  return (
    // @ts-ignore
    getStringFromBundle(addon.data.locale?.current, localString, branch) ||
    // @ts-ignore
    getStringFromBundle(addon.data.locale?.default, localString, branch) ||
    localString
  );
}

function getStringFromBundle(bundle: any, localString: string, branch = "") {
  if (!bundle) {
    return "";
  }
  const patterns = bundle.getMessage(localString);
  if (!patterns) {
    return "";
  }
  if (branch) {
    return bundle.formatPattern(patterns.attributes[branch]);
  } else {
    return bundle.formatPattern(patterns.value);
  }
}