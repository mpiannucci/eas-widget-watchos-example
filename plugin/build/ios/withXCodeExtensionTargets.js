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
        await fs_extra_1.default.promises.writeFile(projectPath, contents);
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
    const targetFiles = ["Assets.xcassets", "Info.plist", ...targetSourceFiles];
    if (target.entitlementsFile) {
        targetFiles.push(target.entitlementsFile);
    }
    // Create the group
    const pbxGroup = xcode_1.PBXGroup.create(xcodeProject, {
        name: target.name,
        path: target.name,
        children: []
    });
    // For each file in targetFiles, create file references and build files
    const buildFiles = targetFiles.map(file => {
        // Create file reference
        const fileReference = xcode_1.PBXFileReference.create(xcodeProject, {
            path: file,
            sourceTree: "<group>"
        });
        // Add file reference to group
        pbxGroup.props.children.push(fileReference);
        // Create build file
        return xcode_1.PBXBuildFile.create(xcodeProject, {
            fileRef: fileReference
        });
    });
    // Add group to main group
    const mainGroup = xcodeProject.rootObject.props.mainGroup;
    mainGroup.props.children.push(pbxGroup);
    // We'll add the build files to the appropriate build phases later
    // when we create the target and its build phases
    // // WORK AROUND for codeProject.addTarget BUG
    // // Xcode projects don't contain these if there is only one target
    // // An upstream fix should be made to the code referenced in this link:
    // //   - https://github.com/apache/cordova-node-xcode/blob/8b98cabc5978359db88dc9ff2d4c015cba40f150/lib/pbxProject.js#L860
    // const projObjects = xcodeProject.hash.project.objects
    // projObjects["PBXTargetDependency"] =
    //     projObjects["PBXTargetDependency"] || {}
    // projObjects["PBXContainerItemProxy"] =
    //     projObjects["PBXTargetDependency"] || {}
    // // add target
    // use application not watch2_app https://stackoverflow.com/a/75432468
    let targetType = "application";
    switch (target.type) {
        case "widget":
            targetType = "app_extension";
            break;
        case "complication":
            targetType = "app_extension";
            break;
        default:
            break;
    }
    ;
    // Create configuration list for the target
    const configurationList = xcode_2.XCConfigurationList.create(xcodeProject, {
        defaultConfigurationName: "Release",
        buildConfigurations: [
            xcode_2.XCBuildConfiguration.create(xcodeProject, {
                name: "Debug",
                buildSettings: {
                    ...WATCH_BUILD_CONFIGURATION_SETTINGS,
                    SWIFT_COMPILATION_MODE: "singlefile",
                    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    GENERATE_INFOPLIST_FILE: "YES",
                }
            }),
            xcode_2.XCBuildConfiguration.create(xcodeProject, {
                name: "Release",
                buildSettings: {
                    ...WATCH_BUILD_CONFIGURATION_SETTINGS,
                    SWIFT_COMPILATION_MODE: "wholemodule",
                    SWIFT_OPTIMIZATION_LEVEL: "-O",
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    GENERATE_INFOPLIST_FILE: "YES",
                }
            })
        ]
    });
    // Create the target
    const nativeTarget = xcode_2.PBXNativeTarget.create(xcodeProject, {
        name: target.name,
        productName: target.name,
        productType: targetType,
        buildConfigurationList: configurationList,
        buildPhases: [],
        dependencies: []
    });
    // Add target to project
    xcodeProject.rootObject.props.targets.push(nativeTarget);
    // Create and add build phases
    const sourcesBuildPhase = nativeTarget.createBuildPhase(xcode_2.PBXSourcesBuildPhase, {
        files: buildFiles.filter(bf => {
            const fileRef = bf.props.fileRef;
            return fileRef && (fileRef.props.path?.endsWith('.swift') || fileRef.props.path?.endsWith('.m'));
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });
    const frameworksBuildPhase = nativeTarget.createBuildPhase(xcode_2.PBXFrameworksBuildPhase, {
        files: target.frameworks.map(framework => {
            const fileRef = xcode_1.PBXFileReference.create(xcodeProject, {
                path: framework,
                sourceTree: "SDKROOT"
            });
            return xcode_1.PBXBuildFile.create(xcodeProject, { fileRef });
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });
    const resourcesBuildPhase = nativeTarget.createBuildPhase(xcode_2.PBXResourcesBuildPhase, {
        files: buildFiles.filter(bf => {
            const fileRef = bf.props.fileRef;
            return fileRef && fileRef.props.path?.endsWith('.xcassets');
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });
    // Handle watch app specific setup
    if (target.type === 'watch') {
        // Create copy files phase to embed watch app in main app
        if (nativeTarget.props.productReference) {
            const copyFilesPhase = nativeTarget.createBuildPhase(xcode_2.PBXCopyFilesBuildPhase, {
                dstPath: '$(CONTENTS_FOLDER_PATH)/Watch',
                dstSubfolderSpec: 16, // productsDirectory
                files: [xcode_1.PBXBuildFile.create(xcodeProject, {
                        fileRef: nativeTarget.props.productReference
                    })],
                buildActionMask: 2147483647,
                runOnlyForDeploymentPostprocessing: 0
            });
            const mainTarget = xcodeProject.rootObject.getMainAppTarget('ios');
            if (mainTarget) {
                mainTarget.props.buildPhases.push(copyFilesPhase);
            }
        }
    }
    // Handle complication specific setup
    if (target.type === 'complication') {
        // Get the watch app target (should be the previous target)
        const targets = xcodeProject.rootObject.props.targets;
        const watchAppIndex = targets.indexOf(nativeTarget) - 1;
        const watchAppTarget = targets[watchAppIndex];
        if (watchAppTarget && nativeTarget.props.productReference) {
            // Add dependency
            watchAppTarget.props.dependencies.push(xcode_1.PBXTargetDependency.create(xcodeProject, {
                target: nativeTarget,
                targetProxy: xcode_1.PBXContainerItemProxy.create(xcodeProject, {
                    containerPortal: xcodeProject.rootObject,
                    proxyType: 1,
                    remoteGlobalIDString: nativeTarget.uuid,
                    remoteInfo: nativeTarget.props.name
                })
            }));
            // Create copy files phase to embed complication in watch app
            const copyFilesPhase = watchAppTarget.createBuildPhase(xcode_2.PBXCopyFilesBuildPhase, {
                dstPath: '',
                dstSubfolderSpec: 13, // plugins
                files: [xcode_1.PBXBuildFile.create(xcodeProject, {
                        fileRef: nativeTarget.props.productReference
                    })],
                buildActionMask: 2147483647,
                runOnlyForDeploymentPostprocessing: 0
            });
        }
    }
    /* Update build configurations */
    const configurations = xcodeProject.rootObject.props.buildConfigurationList.props.buildConfigurations;
    let extras = {};
    let buildSettings = {};
    switch (target.type) {
        case "watch":
            extras = {
                INFOPLIST_KEY_WKCompanionAppBundleIdentifier: target.companionAppBundleId,
                INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp: "YES",
            };
            buildSettings = WATCH_BUILD_CONFIGURATION_SETTINGS;
            break;
        case "widget":
            buildSettings = WIDGET_BUILD_CONFIGURATION_SETTINGS;
            break;
        case "complication":
            buildSettings = WATCH_BUILD_CONFIGURATION_SETTINGS;
        default:
            break;
    }
    ;
    if (target.entitlementsFile) {
        buildSettings["CODE_SIGN_ENTITLEMENTS"] = `${target.name}/${target.entitlementsFile}`;
    }
    // Update build settings for each configuration
    configurations.forEach((config) => {
        if (config.props.name === "Debug" || config.props.name === "Release") {
            config.props.buildSettings = {
                ...config.props.buildSettings,
                ...buildSettings,
                DEVELOPMENT_TEAM: developmentTeamId,
                PRODUCT_NAME: `"${target.displayName ?? target.name}"`,
                PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                INFOPLIST_FILE: `${target.name}/Info.plist`,
                INFOPLIST_KEY_CFBundleDisplayName: '"${PRODUCT_NAME}"',
                ...extras,
            };
        }
    });
}
function getTargetUuids(project) {
    // Find target by product type
    return project.getFirstProject()['firstProject']['targets'].map((t) => t.value);
}
