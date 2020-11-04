/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * The content of this file was adjusted based on:
 *    https://github.com/angular/components/blob/master/src/cdk/schematics/utils/ast.ts
 * These changes were necessary to make the schematics API work with the NestJS framerwork.
 *
 * @author Wassim Chegham <wassim.dev>
 */

import { normalize } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { Schema as AzureOptions } from '../schema';
import { addImportToModule } from './ast-utils';

/** Reads file given path and returns TypeScript source file. */
export function parseSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not find file for path: ${path}`);
  }
  return ts.createSourceFile(
    path,
    buffer.toString(),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** Import and add module to root app module. */
export function addModuleImportToRootModule(options: AzureOptions) {
  return (host: Tree, moduleName: string, src: string) => {
    const modulePath = normalize(
      options.rootDir + `/` + options.rootModuleFileName + `.ts`,
    );
    addModuleImportToModule(host, modulePath, moduleName, src);
  };
}

/**
 * Import and add module to specific module path.
 * @param host the tree we are updating
 * @param modulePath src location of the module to import
 * @param moduleName name of module to import
 * @param src src location to import
 */
export function addModuleImportToModule(
  host: Tree,
  modulePath: string,
  moduleName: string,
  src: string,
) {
  const moduleSource = parseSourceFile(host, modulePath);

  if (!moduleSource) {
    throw new SchematicsException(`Module not found: ${modulePath}`);
  }

  const changes = addImportToModule(moduleSource, modulePath, moduleName, src);
  const recorder = host.beginUpdate(modulePath);

  changes.forEach((change) => {
    if (change instanceof InsertChange) {
      recorder.insertLeft(change.pos, change.toAdd);
    }
  });

  host.commitUpdate(recorder);
}
