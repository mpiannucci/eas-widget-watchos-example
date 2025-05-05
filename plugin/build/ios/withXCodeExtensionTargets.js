"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withXCodeExtensionTargets = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const xcode_1 = require("@bacons/xcode");
const xcode_2 = require("@bacons/xcode");
const xcodeParse = __importStar(require("@bacons/xcode/json"));
const WATCH_BUILD_CONFIGURATION_SETTINGS = {
    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: "YES",
    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS: "NO",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    ENABLE_PREVIEWS: "YES",
    GENERATE_INFOPLIST_FILE: "YES",
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks"',
    MARKETING_VERSION: "1.0",
    SDKROOT: "watchos",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "4",
    WATCHOS_DEPLOYMENT_TARGET: "9.4"
};
const WIDGET_BUILD_CONFIGURATION_SETTINGS = {
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: '"gnu++17"',
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEBUG_INFORMATION_FORMAT: "dwarf",
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_KEY_NSHumanReadableCopyright: '""',
    IPHONEOS_DEPLOYMENT_TARGET: "14.0",
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    MARKETING_VERSION: "1.0",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    MTL_FAST_MATH: "YES",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: '"1"',
};
const withXCodeExtensionTargets = (config, options) => {
    return (0, config_plugins_1.withXcodeProject)(config, async (newConfig) => {
        try {
            const projectName = newConfig.modRequest.projectName;
            const projectRoot = newConfig.modRequest.projectRoot;
            const platformProjectPath = newConfig.modRequest.platformProjectRoot;
            const bundleId = config.ios?.bundleIdentifier || "";
            const projectPath = `${newConfig.modRequest.platformProjectRoot}/${projectName}.xcodeproj/project.pbxproj`;
            await updateXCodeProj(projectRoot, projectPath, platformProjectPath, options.devTeamId, options.targets);
            return newConfig;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    });
};
exports.withXCodeExtensionTargets = withXCodeExtensionTargets;
async function updateXCodeProj(projectRoot, projectPath, platformProjectPath, developmentTeamId, targets) {
    const xcodeProject = await xcode_1.XcodeProject.open(projectPath);
    targets.forEach(target => addXcodeTarget(xcodeProject, projectRoot, platformProjectPath, developmentTeamId, target));
    const contents = xcodeParse.build(xcodeProject.toJSON());
    if (contents.trim().length) {
        fs_extra_1.default.writeFileSync(projectPath, contents);
        fs_extra_1.default.writeFileSync("reference/generated.pbxproj", contents);
    }
}
async function addXcodeTarget(xcodeProject, projectRoot, platformProjectPath, developmentTeamId, target) {
    const targetSourceDirPath = path_1.default.join(projectRoot, target.sourceDir);
    const targetFilesDir = path_1.default.join(platformProjectPath, target.name);
    fs_extra_1.default.copySync(targetSourceDirPath, targetFilesDir);
    let commonSourceFiles = [];
    if (target.commonSourceDir) {
        const commonSourceDirPath = path_1.default.join(projectRoot, target.commonSourceDir);
        target.commonSourceFiles?.forEach(file => {
            const filePath = path_1.default.join(commonSourceDirPath, file);
            const newFileName = file.replace(".swift", `_${target.name}.swift`);
            commonSourceFiles.push(newFileName);
            fs_extra_1.default.copySync(filePath, `${targetFilesDir}/${newFileName}`);
        });
    }
    const targetSourceFiles = [...target.sourceFiles, ...commonSourceFiles];
    const targetResourceFiles = ["Assets.xcassets", "Info.plist"];
    if (target.entitlementsFile) {
        targetResourceFiles.push(target.entitlementsFile);
    }
    const targetFiles = [...targetResourceFiles, ...targetSourceFiles];
    // Create the group
    const pbxGroup = xcode_1.PBXGroup.create(xcodeProject, {
        name: target.name,
        path: target.name,
        children: []
    });
    // Create file references and build files
    const fileReferences = [];
    // const buildFiles: PBXBuildFile[] = [];
    targetFiles.forEach(file => {
        // Create file reference
        const fileReference = xcode_1.PBXFileReference.create(xcodeProject, {
            path: file,
            sourceTree: "<group>"
        });
        // Add file reference to group
        pbxGroup.props.children.push(fileReference);
        fileReferences.push(fileReference);
        // Create build file
        // const buildFile = PBXBuildFile.create(xcodeProject, {
        //     fileRef: fileReference
        // });
        // buildFiles.push(buildFile);
    });
    // Add group to main group
    const mainGroup = xcodeProject.rootObject.props.mainGroup;
    mainGroup.props.children.push(pbxGroup);
    // Determine target type and product extension
    let targetType;
    let productExtension;
    let productType;
    switch (target.type) {
        case "widget":
            targetType = "com.apple.product-type.app-extension";
            productType = "appExtension";
            productExtension = "appex";
            break;
        case "complication":
            targetType = "com.apple.product-type.app-extension";
            productType = "appExtension";
            productExtension = "appex";
            break;
        case "watch":
            targetType = "com.apple.product-type.application";
            productExtension = "app";
            productType = "application";
            break;
        default:
            targetType = "com.apple.product-type.application";
            productExtension = "app";
            productType = "application";
            break;
    }
    // Create product reference
    const productReference = xcode_1.PBXFileReference.create(xcodeProject, {
        explicitFileType: `wrapper.${productExtension}`,
        includeInIndex: 0,
        path: `${target.name}.${productExtension}`,
        sourceTree: "BUILT_PRODUCTS_DIR"
    });
    // Add product reference to Products group
    const productsGroup = xcodeProject.rootObject.props.mainGroup.getChildGroups().find(group => group.props.name === "Products");
    if (productsGroup) {
        productsGroup.createNewProductRefForTarget(target.name, productType);
    }
    // Create configuration list for the target
    const configurationList = xcode_2.XCConfigurationList.create(xcodeProject, {
        defaultConfigurationName: "Release",
        buildConfigurations: [
            xcode_2.XCBuildConfiguration.create(xcodeProject, {
                name: "Debug",
                buildSettings: {
                    ...(target.type === "watch" ? WATCH_BUILD_CONFIGURATION_SETTINGS : WIDGET_BUILD_CONFIGURATION_SETTINGS),
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    DEVELOPMENT_TEAM: developmentTeamId,
                    PRODUCT_NAME: `"${target.displayName ?? target.name}"`,
                    INFOPLIST_KEY_CFBundleDisplayName: '"${PRODUCT_NAME}"',
                    ...(target.entitlementsFile ? { CODE_SIGN_ENTITLEMENTS: `${target.name}/${target.entitlementsFile}` } : {}),
                    ...(target.type === "watch" ? {
                        INFOPLIST_KEY_WKCompanionAppBundleIdentifier: target.companionAppBundleId,
                        INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp: "YES",
                    } : {}),
                    SDKROOT: target.type === "watch" ? "watchos" : "iphoneos",
                    WATCHOS_DEPLOYMENT_TARGET: "9.4",
                    SWIFT_VERSION: "5.0",
                    SWIFT_COMPILATION_MODE: "singlefile",
                    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
                    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: "YES",
                    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
                    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
                    ENABLE_PREVIEWS: "YES",
                    SKIP_INSTALL: "YES",
                    SWIFT_EMIT_LOC_STRINGS: "YES",
                    TARGETED_DEVICE_FAMILY: "4"
                }
            }),
            xcode_2.XCBuildConfiguration.create(xcodeProject, {
                name: "Release",
                buildSettings: {
                    ...(target.type === "watch" ? WATCH_BUILD_CONFIGURATION_SETTINGS : WIDGET_BUILD_CONFIGURATION_SETTINGS),
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    DEVELOPMENT_TEAM: developmentTeamId,
                    PRODUCT_NAME: `"${target.displayName ?? target.name}"`,
                    INFOPLIST_KEY_CFBundleDisplayName: '"${PRODUCT_NAME}"',
                    ...(target.entitlementsFile ? { CODE_SIGN_ENTITLEMENTS: `${target.name}/${target.entitlementsFile}` } : {}),
                    ...(target.type === "watch" ? {
                        INFOPLIST_KEY_WKCompanionAppBundleIdentifier: target.companionAppBundleId,
                        INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp: "YES",
                    } : {}),
                    SDKROOT: target.type === "watch" ? "watchos" : "iphoneos",
                    WATCHOS_DEPLOYMENT_TARGET: "9.4",
                    SWIFT_VERSION: "5.0",
                    SWIFT_COMPILATION_MODE: "wholemodule",
                    SWIFT_OPTIMIZATION_LEVEL: "-O",
                    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: "YES",
                    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
                    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
                    ENABLE_PREVIEWS: "YES",
                    SKIP_INSTALL: "YES",
                    SWIFT_EMIT_LOC_STRINGS: "YES",
                    TARGETED_DEVICE_FAMILY: "4"
                }
            })
        ]
    });
    // Create target
    const targetObject = xcode_2.PBXNativeTarget.create(xcodeProject, {
        name: target.name,
        productName: target.name,
        productReference: productReference,
        productType: targetType,
        buildConfigurationList: configurationList,
        buildPhases: []
    });
    const sourcesBuildPhase = targetObject.getSourcesBuildPhase();
    targetSourceFiles.forEach(file => {
        const fileRef = fileReferences.find(fr => fr.props.path === file);
        if (fileRef) {
            sourcesBuildPhase.ensureFile({
                fileRef: fileRef
            });
        }
    });
    targetObject.ensureFrameworks(target.frameworks ?? []);
    const resourcesBuildPhase = targetObject.getResourcesBuildPhase();
    targetResourceFiles.forEach(file => {
        const fileRef = fileReferences.find(fr => fr.props.path === file);
        if (fileRef) {
            resourcesBuildPhase.ensureFile({
                fileRef: fileRef
            });
        }
    });
    // Add Copy Files build phase for extensions
    if (target.type !== "watch") {
        const copyFilesPhase = targetObject.createBuildPhase(xcode_2.PBXCopyFilesBuildPhase, {
            dstPath: "",
            dstSubfolderSpec: 6,
            files: [xcode_1.PBXBuildFile.create(xcodeProject, {
                    fileRef: productReference
                })],
            runOnlyForDeploymentPostprocessing: 0
        });
    }
    // Add target to project
    xcodeProject.rootObject.props.targets.push(targetObject);
    // Handle complication specific setup
    if (target.type === 'complication') {
        // Get the watch app target (should be the previous target)
        const targets = xcodeProject.rootObject.props.targets;
        const watchAppIndex = targets.indexOf(targetObject) - 1;
        const watchAppTarget = targets[watchAppIndex];
        if (watchAppTarget) {
            // Add dependency
            const targetDependency = xcode_1.PBXTargetDependency.create(xcodeProject, {
                target: targetObject,
                targetProxy: xcode_1.PBXContainerItemProxy.create(xcodeProject, {
                    containerPortal: xcodeProject.rootObject,
                    proxyType: 1,
                    remoteGlobalIDString: targetObject.uuid,
                    remoteInfo: targetObject.props.name
                })
            });
            watchAppTarget.props.dependencies.push(targetDependency);
        }
    }
}
