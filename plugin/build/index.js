"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const withXCodeExtensionTargets_1 = require("./ios/withXCodeExtensionTargets");
const withXcparse_1 = require("./ios/withXcparse");
const withAppConfigs = (config, options) => {
    config = (0, withXCodeExtensionTargets_1.withXCodeExtensionTargets)(config, options);
    config = (0, withXcparse_1.withXcodeProjectBetaBaseMod)(config);
    return config;
};
exports.default = withAppConfigs;
