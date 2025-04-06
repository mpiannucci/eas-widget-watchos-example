"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const withXCodeExtensionTargets_1 = require("./ios/withXCodeExtensionTargets");
const withAppConfigs = (config, options) => {
    config = (0, withXCodeExtensionTargets_1.withXCodeExtensionTargets)(config, options);
    return config;
};
exports.default = withAppConfigs;
