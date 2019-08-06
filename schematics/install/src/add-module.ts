/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * The content of this file was adjusted based on: https://github.com/angular/angular-cli/blob/master/packages/schematics/angular/utility/ast-utils.ts
 * These changes were necessary to make the schematics API work with the NestJS framerwork.
 * 
 * @author Wassim Chegham <wassim.dev>
 */

import { normalize } from '@angular-devkit/core';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Schema as AzureOptions } from '../schema';
import { addModuleImportToRootModule } from '../utils/ast';
import { hasNestModuleImport } from '../utils/nest-module-import';

export function addAzureStorageModuleToImports(options: AzureOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const MODULE_WITH_CONFIG = `AzureStorageModule.withConfig({sasKey: process.env['AZURE_STORAGE_SAS_KEY'], accountName: process.env['AZURE_STORAGE_ACCOUNT'], containerName: 'nest-demo-container' })`;
    const appModulePath = normalize(
      options.rootDir + `/` + options.rootModuleFileName + `.ts`,
    );

    // verify module has not already been imported
    if (hasNestModuleImport(tree, appModulePath, MODULE_WITH_CONFIG)) {
      return console.warn(
        `Skiping importing "AzureStorageModule.withConfig()" because it is already imported in "${appModulePath}".`,
      );
    }

    // add Azure module to root @Module() imports
    addModuleImportToRootModule(options)(
      tree,
      MODULE_WITH_CONFIG,
      '@nestjs/azure-storage',
    );

    return tree;
  };
}
