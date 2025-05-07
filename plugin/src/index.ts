import { ConfigPlugin } from "@expo/config-plugins"
import { withXCodeExtensionTargets } from "./ios/withXCodeExtensionTargets"
import { withXcodeProjectBetaBaseMod } from "./ios/withXcparse"

const withAppConfigs: ConfigPlugin<WithExtensionProps> = (config, options) => {
  config = withXCodeExtensionTargets(config, options)
  config = withXcodeProjectBetaBaseMod(config)
  return config
}

export default withAppConfigs
