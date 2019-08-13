import {
  branchAndMerge,
  chain,
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import { Schema as AzureOptions } from './schema';
import { addDotEnvCall, addDotEnvConfig } from './src/add-env-config';
import { addAzureStorageModuleToImports } from './src/add-module';
import { updateGitIgnore } from './src/update-git-ignore';

import {registerOnExit} from './utils/register-clean-exit';
registerOnExit();

function addDependenciesAndScripts(): Rule {
  return (host: Tree) => {
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nestjs/azure-storage',
      version: '^1.0.0',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@azure/storage-blob',
      version: '^10.4.0',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'dotenv',
      version: '^8.0.0',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@azure/ms-rest-js',
      version: '^2.0.4',
    });
    return host;
  };
}

/**
 * Schematic factory entry-point for the `ng-add` schematic.
 * The ng-add schematic will be automatically executed if developers run `ng add @nest/azure-storage`.
 */
export default function(options: AzureOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    return chain([
      branchAndMerge(
        chain([
          addDependenciesAndScripts(),
          addDotEnvConfig(options),
          // Note: we are going to let the user decide where and how they
          // would like to insert this line in their app.
          // addDotEnvCall(options),
          updateGitIgnore(options),
          addAzureStorageModuleToImports(options),
        ]),
      ),
    ]);
  };
}
