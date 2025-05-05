import { ConfigPlugin, withXcodeProject } from "@expo/config-plugins"
import fs from "fs-extra"
import path from "path"
import xcode from "xcode"
import { PBXGroup, XcodeProject, PBXFileReference, PBXBuildFile, PBXTargetDependency, PBXContainerItemProxy } from "@bacons/xcode"
import { XCConfigurationList, XCBuildConfiguration, PBXNativeTarget, PBXSourcesBuildPhase, PBXFrameworksBuildPhase, PBXResourcesBuildPhase, PBXCopyFilesBuildPhase } from "@bacons/xcode"
import * as xcodeParse from "@bacons/xcode/json";
import type { BuildSettings } from "@bacons/xcode/json";
import type { SubFolder, PBXProductType } from "@bacons/xcode/json";
import { ISA } from "@bacons/xcode/json";

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
}

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
    LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    MARKETING_VERSION: "1.0",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    MTL_FAST_MATH: "YES",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: '"1"',
}

export const withXCodeExtensionTargets: ConfigPlugin<WithExtensionProps> = (
    config,
    options: WithExtensionProps,
) => {
    return withXcodeProject(config, async newConfig => {
        try {
            const projectName = newConfig.modRequest.projectName
            const projectRoot = newConfig.modRequest.projectRoot
            const platformProjectPath = newConfig.modRequest.platformProjectRoot
            const bundleId = config.ios?.bundleIdentifier || ""
            const projectPath = `${newConfig.modRequest.platformProjectRoot}/${projectName}.xcodeproj/project.pbxproj`

            await updateXCodeProj(projectRoot, projectPath, platformProjectPath, options.devTeamId, options.targets)
            return newConfig
        } catch (e) {
            console.error(e)
            throw e
        }
    })
}

async function updateXCodeProj(
    projectRoot: string,
    projectPath: string,
    platformProjectPath: string,
    developmentTeamId: string,
    targets: IosExtensionTarget[],
) {
    const xcodeProject = await XcodeProject.open(projectPath);

    targets.forEach(target => addXcodeTarget(xcodeProject, projectRoot, platformProjectPath, developmentTeamId, target))
    const contents = xcodeParse.build(xcodeProject.toJSON());
    if (contents.trim().length) {
        await fs.promises.writeFile(projectPath, contents)
    }
}

async function addXcodeTarget(
    xcodeProject: XcodeProject,
    projectRoot: string,
    platformProjectPath: string,
    developmentTeamId: string,
    target: IosExtensionTarget,
) {
    const targetSourceDirPath = path.join(
        projectRoot,
        target.sourceDir,
    )

    const targetFilesDir = path.join(
        platformProjectPath,
        target.name
    )
    fs.copySync(targetSourceDirPath, targetFilesDir)

    let commonSourceFiles: string[] = []
    if (target.commonSourceDir) {
        const commonSourceDirPath = path.join(
            projectRoot,
            target.commonSourceDir,
        )
        
        target.commonSourceFiles?.forEach(file => {
            const filePath = path.join(
                commonSourceDirPath,
                file
            )
            const newFileName = file.replace(".swift", `_${target.name}.swift`)
            commonSourceFiles.push(newFileName)
            fs.copySync(filePath, `${targetFilesDir}/${newFileName}`)
        })
    }

    const targetSourceFiles = [...target.sourceFiles, ...commonSourceFiles];
    const targetFiles = ["Assets.xcassets", "Info.plist", ...targetSourceFiles];
    if (target.entitlementsFile) {
        targetFiles.push(target.entitlementsFile)
    }

    // Create the group
    const pbxGroup = PBXGroup.create(xcodeProject, {
        name: target.name,
        path: target.name,
        children: []
    });

    // For each file in targetFiles, create file references and build files
    const buildFiles = targetFiles.map(file => {
        // Create file reference
        const fileReference = PBXFileReference.create(xcodeProject, {
            path: file,
            sourceTree: "SOURCE_ROOT" as const
        });
        
        // Add file reference to group
        pbxGroup.props.children.push(fileReference);
        
        // Create build file
        return PBXBuildFile.create(xcodeProject, {
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
    const projObjects = xcodeProject.hash.project.objects
    projObjects["PBXTargetDependency"] =
        projObjects["PBXTargetDependency"] || {}
    projObjects["PBXContainerItemProxy"] =
        projObjects["PBXTargetDependency"] || {}

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
    };

    // Create configuration list for the target
    const configurationList = XCConfigurationList.create(xcodeProject, {
        defaultConfigurationName: "Release",
        buildConfigurations: [
            XCBuildConfiguration.create(xcodeProject, {
                name: "Debug",
                buildSettings: {
                    ...WATCH_BUILD_CONFIGURATION_SETTINGS,
                    SWIFT_COMPILATION_MODE: "singlefile",
                    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    GENERATE_INFOPLIST_FILE: "YES",
                } as BuildSettings
            }),
            XCBuildConfiguration.create(xcodeProject, {
                name: "Release",
                buildSettings: {
                    ...WATCH_BUILD_CONFIGURATION_SETTINGS,
                    SWIFT_COMPILATION_MODE: "wholemodule",
                    SWIFT_OPTIMIZATION_LEVEL: "-O",
                    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
                    INFOPLIST_FILE: `${target.name}/Info.plist`,
                    GENERATE_INFOPLIST_FILE: "YES",
                } as BuildSettings
            })
        ]
    });

    // Create the target
    const nativeTarget = PBXNativeTarget.create(xcodeProject, {
        name: target.name,
        productName: target.name,
        productType: targetType as PBXProductType,
        buildConfigurationList: configurationList,
        buildPhases: [],
        dependencies: []
    });

    // Add target to project
    xcodeProject.rootObject.props.targets.push(nativeTarget);

    // Create and add build phases
    const sourcesBuildPhase = nativeTarget.createBuildPhase(PBXSourcesBuildPhase, {
        files: buildFiles.filter(bf => {
            const fileRef = bf.props.fileRef;
            return fileRef.props.path?.endsWith('.swift') || fileRef.props.path?.endsWith('.m');
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });

    const frameworksBuildPhase = nativeTarget.createBuildPhase(PBXFrameworksBuildPhase, {
        files: target.frameworks.map(framework => {
            const fileRef = PBXFileReference.create(xcodeProject, {
                path: framework,
                sourceTree: "SDKROOT" as const
            });
            return PBXBuildFile.create(xcodeProject, { fileRef });
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });

    const resourcesBuildPhase = nativeTarget.createBuildPhase(PBXResourcesBuildPhase, {
        files: buildFiles.filter(bf => {
            const fileRef = bf.props.fileRef;
            return fileRef.props.path?.endsWith('.xcassets');
        }),
        buildActionMask: 2147483647,
        runOnlyForDeploymentPostprocessing: 0
    });

    // Handle watch app specific setup
    if (target.type === 'watch') {
        // Create copy files phase to embed watch app in main app
        const copyFilesPhase = nativeTarget.createBuildPhase(PBXCopyFilesBuildPhase, {
            dstPath: '$(CONTENTS_FOLDER_PATH)/Watch',
            dstSubfolderSpec: 16, // productsDirectory
            files: [PBXBuildFile.create(xcodeProject, {
                fileRef: nativeTarget.props.productReference!
            })],
            buildActionMask: 2147483647,
            runOnlyForDeploymentPostprocessing: 0
        });
        
        const mainTarget = xcodeProject.rootObject.getMainAppTarget('ios');
        if (mainTarget) {
            mainTarget.props.buildPhases.push(copyFilesPhase);
        }
    }

    // Handle complication specific setup
    if (target.type === 'complication') {
        // Get the watch app target (should be the previous target)
        const targets = xcodeProject.rootObject.props.targets;
        const watchAppIndex = targets.indexOf(nativeTarget) - 1;
        const watchAppTarget = targets[watchAppIndex] as PBXNativeTarget;

        if (watchAppTarget) {
            // Add dependency
            watchAppTarget.props.dependencies.push(PBXTargetDependency.create(xcodeProject, {
                target: nativeTarget,
                targetProxy: PBXContainerItemProxy.create(xcodeProject, {
                    containerPortal: xcodeProject.rootObject,
                    proxyType: 1,
                    remoteGlobalIDString: nativeTarget.uuid,
                    remoteInfo: nativeTarget.props.name
                })
            }));

            // Create copy files phase to embed complication in watch app
            const copyFilesPhase = watchAppTarget.createBuildPhase(PBXCopyFilesBuildPhase, {
                dstPath: '',
                dstSubfolderSpec: 13, // plugins
                files: [PBXBuildFile.create(xcodeProject, {
                    fileRef: nativeTarget.props.productReference!
                })],
                buildActionMask: 2147483647,
                runOnlyForDeploymentPostprocessing: 0
            });
        }
    }

    /* Update build configurations */
    const configurations = xcodeProject.rootObject.props.buildConfigurationList.props.buildConfigurations;

    let extras: any = {}
    let buildSettings: any = {};

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
    };

    if (target.entitlementsFile) {
        buildSettings["CODE_SIGN_ENTITLEMENTS"] = `${target.name}/${target.entitlementsFile}`;
    }

    // Update build settings for each configuration
    configurations.forEach((config: XCBuildConfiguration) => {
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

function getTargetUuids(project: any) {
    // Find target by product type
    return project.getFirstProject()['firstProject']['targets'].map((t: any) => t.value);
}