import { Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { Schema as AzureOptions } from '../schema';
export declare function parseSourceFile(host: Tree, path: string): ts.SourceFile;
export declare function addModuleImportToRootModule(options: AzureOptions): (host: Tree, moduleName: string, src: string) => void;
export declare function addModuleImportToModule(host: Tree, modulePath: string, moduleName: string, src: string): void;
