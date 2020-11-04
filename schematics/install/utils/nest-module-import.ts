/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * The content of this file was adjusted based on: 
 *    https://github.com/angular/components/blob/master/src/cdk/schematics/utils/ast/ng-module-imports.ts
 * These changes were necessary to make the schematics API work with the NestJS framerwork.
 * 
 * @author Wassim Chegham <wassim.dev>
 */

import { SchematicsException, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

/**
 * Whether the Angular module in the given path imports the specified module class name.
 */
export function hasNestModuleImport(
  tree: Tree,
  modulePath: string,
  className: string,
): boolean {
  const moduleFileContent = tree.read(modulePath);

  if (!moduleFileContent) {
    throw new SchematicsException(
      `Could not read Nest module file: ${modulePath}`,
    );
  }

  const parsedFile = ts.createSourceFile(
    modulePath,
    moduleFileContent.toString(),
    ts.ScriptTarget.Latest,
    true,
  );
  const nestModuleMetadata = findNestModuleMetadata(parsedFile);

  if (!nestModuleMetadata) {
    throw new SchematicsException(
      `Could not find @Module() declaration inside: "${modulePath}"`,
    );
  }

  for (let property of nestModuleMetadata!.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      property.name.getText() !== 'imports' ||
      !ts.isArrayLiteralExpression(property.initializer)
    ) {
      continue;
    }

    if (
      property.initializer.elements.some(
        element => element.getText() === className,
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Finds a @Module declaration within the specified TypeScript node and returns the
 * corresponding metadata for it. This function searches breadth first because
 * @Module's are usually not nested within other expressions or declarations.
 */
function findNestModuleMetadata(
  rootNode: ts.Node,
): ts.ObjectLiteralExpression | null {
  // Add immediate child nodes of the root node to the queue.
  const nodeQueue: ts.Node[] = [...rootNode.getChildren()];

  while (nodeQueue.length) {
    const node = nodeQueue.shift()!;

    if (
      ts.isDecorator(node) &&
      ts.isCallExpression(node.expression) &&
      isModuleCallExpression(node.expression)
    ) {
      return node.expression.arguments[0] as ts.ObjectLiteralExpression;
    } else {
      nodeQueue.push(...node.getChildren());
    }
  }

  return null;
}

/** Whether the specified call expression is referring to a @Module definition. */
function isModuleCallExpression(callExpression: ts.CallExpression): boolean {
  if (
    !callExpression.arguments.length ||
    !ts.isObjectLiteralExpression(callExpression.arguments[0])
  ) {
    return false;
  }

  const decoratorIdentifier = resolveIdentifierOfExpression(
    callExpression.expression,
  );
  return decoratorIdentifier ? decoratorIdentifier.text === 'Module' : false;
}

/**
 * Resolves the last identifier that is part of the given expression. This helps resolving
 * identifiers of nested property access expressions (e.g. myNamespace.core.@Module).
 */
function resolveIdentifierOfExpression(
  expression: ts.Expression,
): ts.Identifier | null {
  if (ts.isIdentifier(expression)) {
    return expression;
  } else if (ts.isPropertyAccessExpression(expression)) {
    return expression.name as ts.Identifier;
  }
  return null;
}
