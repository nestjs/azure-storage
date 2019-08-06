import { Change } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
export declare function getDecoratorMetadata(source: ts.SourceFile, identifier: string, module: string): ts.Node[];
export declare function addSymbolToNestModuleMetadata(source: ts.SourceFile, ngModulePath: string, metadataField: string, symbolName: string, importPath?: string | null): Change[];
export declare function getMetadataField(node: ts.ObjectLiteralExpression, metadataField: string): ts.ObjectLiteralElement[];
export declare function addImportToModule(source: ts.SourceFile, modulePath: string, classifiedName: string, importPath: string): Change[];
