"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const ts = require("typescript");
function hasNestModuleImport(tree, modulePath, className) {
    const moduleFileContent = tree.read(modulePath);
    if (!moduleFileContent) {
        throw new schematics_1.SchematicsException(`Could not read Nest module file: ${modulePath}`);
    }
    const parsedFile = ts.createSourceFile(modulePath, moduleFileContent.toString(), ts.ScriptTarget.Latest, true);
    const nestModuleMetadata = findNestModuleMetadata(parsedFile);
    if (!nestModuleMetadata) {
        throw new schematics_1.SchematicsException(`Could not find @Module() declaration inside: "${modulePath}"`);
    }
    for (let property of nestModuleMetadata.properties) {
        if (!ts.isPropertyAssignment(property) ||
            property.name.getText() !== 'imports' ||
            !ts.isArrayLiteralExpression(property.initializer)) {
            continue;
        }
        if (property.initializer.elements.some(element => element.getText() === className)) {
            return true;
        }
    }
    return false;
}
exports.hasNestModuleImport = hasNestModuleImport;
function findNestModuleMetadata(rootNode) {
    const nodeQueue = [...rootNode.getChildren()];
    while (nodeQueue.length) {
        const node = nodeQueue.shift();
        if (ts.isDecorator(node) &&
            ts.isCallExpression(node.expression) &&
            isModuleCallExpression(node.expression)) {
            return node.expression.arguments[0];
        }
        else {
            nodeQueue.push(...node.getChildren());
        }
    }
    return null;
}
function isModuleCallExpression(callExpression) {
    if (!callExpression.arguments.length ||
        !ts.isObjectLiteralExpression(callExpression.arguments[0])) {
        return false;
    }
    const decoratorIdentifier = resolveIdentifierOfExpression(callExpression.expression);
    return decoratorIdentifier ? decoratorIdentifier.text === 'Module' : false;
}
function resolveIdentifierOfExpression(expression) {
    if (ts.isIdentifier(expression)) {
        return expression;
    }
    else if (ts.isPropertyAccessExpression(expression)) {
        return expression.name;
    }
    return null;
}
