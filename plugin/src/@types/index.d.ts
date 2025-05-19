declare module "xcode"

type IosExtensionTargetType = 'watch' | 'widget' | 'complication';

interface SwiftPackageDependency {
  url: string;
  requirement: {
    kind: 'upToNextMajorVersion' | 'exactVersion' | 'branch' | 'revision';
    minimumVersion?: string;
    version?: string;
    branch?: string;
    revision?: string;
  };
  productName: string;
}

interface IosExtensionTarget {
  name: string;
  type: IosExtensionTargetType;
  bundleId: string;
  displayName?: string;
  sourceDir: string;
  sourceFiles: string[];
  commonSourceDir?: string;
  commonSourceFiles?: string[];
  entitlementsFile?: string;
  companionAppBundleId?: string;
  frameworks?: string[];
  swiftPackages?: SwiftPackageDependency[];
}

interface WithExtensionProps {
  targets: IosExtensionTarget[];
  devTeamId: string;
}