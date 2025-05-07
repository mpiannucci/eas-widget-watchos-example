import {
  PBXBuildFile,
  PBXContainerItemProxy,
  PBXCopyFilesBuildPhase,
  PBXFileReference,
  PBXGroup,
  PBXNativeTarget,
  PBXTargetDependency,
  XCBuildConfiguration,
  XCConfigurationList,
  XcodeProject,
} from "@bacons/xcode";
import { PRODUCT_UTI_EXTENSIONS } from "@bacons/xcode/build/api/utils/constants";
import type { PBXProductType } from "@bacons/xcode/json";
import { ConfigPlugin } from "@expo/config-plugins";
import fs from "fs-extra";
import path from "path";
import { withXcodeProjectBeta } from "./withXcparse";

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
  WATCHOS_DEPLOYMENT_TARGET: "9.4",
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
  LD_RUNPATH_SEARCH_PATHS:
    '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
  MARKETING_VERSION: "1.0",
  MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
  MTL_FAST_MATH: "YES",
  SKIP_INSTALL: "YES",
  SWIFT_EMIT_LOC_STRINGS: "YES",
  SWIFT_VERSION: "5.0",
  TARGETED_DEVICE_FAMILY: "1,2",
  SDKROOT: "iphoneos",
};

export const withXCodeExtensionTargets: ConfigPlugin<WithExtensionProps> = (
  config,
  options: WithExtensionProps
) => {
  return withXcodeProjectBeta(config, async (config) => {
    try {
      const projectName = config.modRequest.projectName;
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectPath = config.modRequest.platformProjectRoot;
      const bundleId = config.ios?.bundleIdentifier || "";
      const projectPath = `${config.modRequest.platformProjectRoot}/${projectName}.xcodeproj/project.pbxproj`;

      await updateXCodeProj(
        config.modResults,
        projectRoot,
        projectPath,
        platformProjectPath,
        options.devTeamId,
        options.targets
      );
      return config;
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
};

async function updateXCodeProj(
  xcodeProject: XcodeProject,
  projectRoot: string,
  projectPath: string,
  platformProjectPath: string,
  developmentTeamId: string,
  targets: IosExtensionTarget[]
) {
  // Create shared group for common files
  const sharedGroup = PBXGroup.create(xcodeProject, {
    name: "Shared",
    path: "Shared",
    children: [],
  });

  // Add shared group to main group
  const mainGroup = xcodeProject.rootObject.props.mainGroup;
  mainGroup.props.children.push(sharedGroup);

  // Create shared directory and copy common files
  const sharedDirPath = path.join(platformProjectPath, "Shared");
  fs.ensureDirSync(sharedDirPath);

  // Map to store shared file references
  const sharedFileReferences = new Map<string, PBXFileReference>();

  // Process each target
  targets.forEach((target) =>
    addXcodeTarget(
      xcodeProject,
      projectRoot,
      platformProjectPath,
      developmentTeamId,
      target,
      sharedGroup,
      sharedDirPath,
      sharedFileReferences
    )
  );
}

async function addXcodeTarget(
  xcodeProject: XcodeProject,
  projectRoot: string,
  platformProjectPath: string,
  developmentTeamId: string,
  target: IosExtensionTarget,
  sharedGroup: PBXGroup,
  sharedDirPath: string,
  sharedFileReferences: Map<string, PBXFileReference>
) {
  const targetSourceDirPath = path.join(projectRoot, target.sourceDir);
  const targetFilesDir = path.join(platformProjectPath, target.name);
  fs.copySync(targetSourceDirPath, targetFilesDir);

  let commonSourceFiles: string[] = [];
  if (target.commonSourceDir) {
    const commonSourceDirPath = path.join(projectRoot, target.commonSourceDir);

    target.commonSourceFiles?.forEach((file) => {
      const filePath = path.join(commonSourceDirPath, file);
      commonSourceFiles.push(file);

      // Copy to shared directory if not already there
      const sharedFilePath = path.join(sharedDirPath, file);
      if (!fs.existsSync(sharedFilePath)) {
        fs.copySync(filePath, sharedFilePath);
      }

      // Create file reference if not already exists
      if (!sharedFileReferences.has(file)) {
        const fileReference = PBXFileReference.create(xcodeProject, {
          path: file,
          sourceTree: "<group>" as const,
        });
        sharedGroup.props.children.push(fileReference);
        sharedFileReferences.set(file, fileReference);
      }
    });
  }

  const targetSourceFiles = [...target.sourceFiles, ...commonSourceFiles];
  const targetResourceFiles = ["Assets.xcassets"];
//   if (target.entitlementsFile) {
//     targetResourceFiles.push(target.entitlementsFile);
//   }
  const targetFiles = [
    ...targetResourceFiles,
    ...targetSourceFiles,
    "Info.plist",
  ];

  if (target.entitlementsFile) {
    targetFiles.push(target.entitlementsFile);
  }

  // Create the target group
  const pbxGroup = PBXGroup.create(xcodeProject, {
    name: target.name,
    path: target.name,
    children: [],
  });

  // Create file references and build files
  const fileReferences: PBXFileReference[] = [];

  targetFiles.forEach((file) => {
    // Use existing shared file reference if it's a common file
    if (commonSourceFiles.includes(file)) {
      const sharedRef = sharedFileReferences.get(file);
      if (sharedRef) {
        fileReferences.push(sharedRef);
        return;
      }
    }

    // Create new file reference for target-specific files
    const fileReference = PBXFileReference.create(xcodeProject, {
      path: file,
      sourceTree: "<group>" as const,
    });

    pbxGroup.props.children.push(fileReference);
    fileReferences.push(fileReference);
  });

  // Add target group to main group
  const mainGroup = xcodeProject.rootObject.props.mainGroup;
  mainGroup.props.children.push(pbxGroup);

  // Determine target type and product extension
  let targetType: PBXProductType;
  let productExtension: string;
  let productType: keyof typeof PRODUCT_UTI_EXTENSIONS;
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
  const productReference = PBXFileReference.create(xcodeProject, {
    explicitFileType: `wrapper.${productExtension}` as any,
    includeInIndex: 0,
    path: `${target.name}.${productExtension}`,
    sourceTree: "BUILT_PRODUCTS_DIR" as const,
  });

  // Add product reference to Products group
  const productsGroup = xcodeProject.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.props.name === "Products");
  if (productsGroup) {
    productsGroup.createNewProductRefForTarget(target.name, productType);
  }

  const buildSettings = {
    ...((target.type === "watch" || target.type === "complication")
      ? WATCH_BUILD_CONFIGURATION_SETTINGS
      : WIDGET_BUILD_CONFIGURATION_SETTINGS),
    PRODUCT_BUNDLE_IDENTIFIER: target.bundleId,
    INFOPLIST_FILE: `${target.name}/Info.plist`,
    DEVELOPMENT_TEAM: developmentTeamId,
    PRODUCT_NAME: target.displayName ?? target.name,
    INFOPLIST_KEY_CFBundleDisplayName: target.displayName ?? target.name,
    ...(target.entitlementsFile
      ? {
          CODE_SIGN_ENTITLEMENTS: `${target.name}/${target.entitlementsFile}`,
        }
      : {}),
    ...(target.type === "watch"
      ? {
          INFOPLIST_KEY_WKCompanionAppBundleIdentifier:
            target.companionAppBundleId,
          INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp: "YES",
        }
      : {}),
  };

  // Create configuration list for the target
  const configurationList = XCConfigurationList.create(xcodeProject, {
    defaultConfigurationName: "Release",
    buildConfigurations: [
      XCBuildConfiguration.create(xcodeProject, {
        name: "Debug",
        buildSettings: buildSettings as any,
      }),
      XCBuildConfiguration.create(xcodeProject, {
        name: "Release",
        buildSettings: buildSettings as any,
      }),
    ],
  });

  // Create target
  const targetObject = PBXNativeTarget.create(xcodeProject, {
    name: target.name,
    productName: target.name,
    productReference: productReference,
    productType: targetType,
    buildConfigurationList: configurationList,
    buildPhases: [],
  });

  const sourcesBuildPhase = targetObject.getSourcesBuildPhase();
  targetSourceFiles.forEach((file) => {
    const fileRef = fileReferences.find((fr) => fr.props.path === file);
    if (fileRef) {
      sourcesBuildPhase.ensureFile({
        fileRef: fileRef,
      });
    }
  });

  targetObject.ensureFrameworks(target.frameworks ?? []);

  const resourcesBuildPhase = targetObject.getResourcesBuildPhase();
  targetResourceFiles.forEach((file) => {
    const fileRef = fileReferences.find((fr) => fr.props.path === file);
    if (fileRef) {
      resourcesBuildPhase.ensureFile({
        fileRef: fileRef,
      });
    }
  });

  // Add Copy Files build phase for extensions
//   if (target.type !== "watch") {
//     const copyFilesPhase = targetObject.createBuildPhase(
//       PBXCopyFilesBuildPhase,
//       {
//         dstPath: "",
//         dstSubfolderSpec: 6,
//         files: [
//           PBXBuildFile.create(xcodeProject, {
//             fileRef: productReference,
//           }),
//         ],
//         runOnlyForDeploymentPostprocessing: 0,
//       }
//     );
//   }

  // Add target to project
  xcodeProject.rootObject.props.targets.push(targetObject);

  if (target.type === "widget") {
    const appTarget = xcodeProject.rootObject.props.targets[0] as PBXNativeTarget;
    // Make the widget a dependency of the app target
    const targetDependency = PBXTargetDependency.create(xcodeProject, {
      target: targetObject,
      targetProxy: PBXContainerItemProxy.create(xcodeProject, {
        containerPortal: xcodeProject.rootObject,
        proxyType: 1,
        remoteGlobalIDString: targetObject.uuid,
        remoteInfo: targetObject.props.name,
      }),
    });
    appTarget.props.dependencies.push(targetDependency);

    // Embed the widget in the app target
    const copyFilesPhase = appTarget.createBuildPhase(
      PBXCopyFilesBuildPhase,
      {
        dstPath: "",
        name: "Embed App Extensions",
        dstSubfolderSpec: 6,
        files: [
          PBXBuildFile.create(xcodeProject, {
            fileRef: productReference,
          }),
        ],
        runOnlyForDeploymentPostprocessing: 0,
      }
    );
  }

  // Handle complication specific setup
  if (target.type === "complication") {
    // Get the watch app target (should be the previous target)
    const targets = xcodeProject.rootObject.props.targets;
    const watchAppIndex = targets.indexOf(targetObject) - 1;
    const watchAppTarget = targets[watchAppIndex] as PBXNativeTarget;

    if (watchAppTarget) {
      // Add dependency
      const targetDependency = PBXTargetDependency.create(xcodeProject, {
        target: targetObject,
        targetProxy: PBXContainerItemProxy.create(xcodeProject, {
          containerPortal: xcodeProject.rootObject,
          proxyType: 1,
          remoteGlobalIDString: targetObject.uuid,
          remoteInfo: targetObject.props.name,
        }),
      });
      watchAppTarget.props.dependencies.push(targetDependency);

      // Embed complication in watch app
      const watchAppBuildPhase = watchAppTarget.createBuildPhase(
        PBXCopyFilesBuildPhase,
        {
          dstPath: "",
          dstSubfolderSpec: 6,
          name: "Embed App Extensions",
          files: [
            PBXBuildFile.create(xcodeProject, {
              fileRef: productReference,
            }),
          ],
          runOnlyForDeploymentPostprocessing: 0,
        }
      );
    }
  }
}
