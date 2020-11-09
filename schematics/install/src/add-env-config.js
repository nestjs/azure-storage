"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDotEnvCall = exports.addDotEnvConfig = void 0;
const core_1 = require("@angular-devkit/core");
const terminal_1 = require("@angular-devkit/core/src/terminal");
const schematics_1 = require("@angular-devkit/schematics");
const AZURE_STORAGE_ACCOUNT = 'AZURE_STORAGE_ACCOUNT';
const AZURE_STORAGE_ACCESS_KEY = 'AZURE_STORAGE_ACCESS_KEY';
function addDotEnvConfig(options) {
    return (tree, context) => {
        const envPath = core_1.normalize('/.env');
        if (options.storageAccountName === '' ||
            options.storageAccountAccess === '') {
            if (options.storageAccountName === '') {
                context.logger.error('The Azure storage account name can not be empty.');
            }
            if (options.storageAccountAccess === '') {
                context.logger.error('The Azure storage account SAS token (or connection string) can not be empty. ' +
                    'Read more about how to generate an access token: https://aka.ms/nestjs-azure-storage-connection-strin');
            }
            process.exit(1);
            return null;
        }
        if (options.storageAccountAccess.startsWith('BlobEndpoint')) {
            options.storageAccountAccessType = 'connectionString';
        }
        else if (options.storageAccountAccess.startsWith('?sv=') ||
            options.storageAccountAccess.startsWith('sv=')) {
            options.storageAccountAccessType = 'SASToken';
        }
        else {
            context.logger.error('The Azure storage access key must be either a SAS token or a connection string. ' +
                'Read more: https://aka.ms/nestjs-azure-storage-connection-string');
            process.exit(1);
            return null;
        }
        const newEnvFileContent = `# For more information about storage account: https://aka.ms/nestjs-azure-storage-account\n` +
            `${AZURE_STORAGE_ACCOUNT}="${options.storageAccountName}"\n` +
            `# For more information about storage access authorization: https://aka.ms/nestjs-azure-storage-connection-string\n` +
            `${AZURE_STORAGE_ACCESS_KEY}="${options.storageAccountAccess}"\n`;
        const oldEnvFileContent = readEnvFile(tree, envPath);
        if (!oldEnvFileContent) {
            if (tree.exists(envPath)) {
                tree.overwrite(envPath, newEnvFileContent);
            }
            else {
                tree.create(envPath, newEnvFileContent);
            }
            return tree;
        }
        if (oldEnvFileContent === newEnvFileContent) {
            return context.logger.warn(`Skipping environment variables configuration ` +
                `because an ".env" file was detected and already contains these Azure Storage tokens:\n\n` +
                terminal_1.green(`# New configuration\n` + `${newEnvFileContent}`));
        }
        if (oldEnvFileContent.includes(AZURE_STORAGE_ACCESS_KEY) ||
            oldEnvFileContent.includes(AZURE_STORAGE_ACCOUNT)) {
            return context.logger.warn(`Skipping environment variables configuration ` +
                `because an ".env" file was detected and already contains an Azure Storage tokens.\n` +
                `Please manually update your .env file with the following configuration:\n\n` +
                terminal_1.red(`# Old configuration\n` + `${oldEnvFileContent}\n`) +
                terminal_1.green(`# New configuration\n` + `${newEnvFileContent}`));
        }
        const recorder = tree.beginUpdate(envPath);
        recorder.insertLeft(0, newEnvFileContent);
        tree.commitUpdate(recorder);
        return tree;
    };
}
exports.addDotEnvConfig = addDotEnvConfig;
function readEnvFile(host, fileName) {
    const buffer = host.read(fileName);
    return buffer ? buffer.toString('utf-8') : null;
}
function addDotEnvCall(options) {
    return (tree, context) => {
        const mainFilePath = `${options.rootDir}/${options.mainFileName}.ts`;
        const content = tree.read(mainFilePath);
        if (content) {
            const mainContent = content.toString('utf-8');
            if (mainContent.includes(`require('dotenv')`)) {
                return context.logger.warn(`>> Skipping dotenv configuration because there is already ` +
                    `a call to require('dotenv') in "${mainFilePath}".`);
            }
            else {
                const dotEnvContent = `if (process.env.NODE_ENV !== 'production') require('dotenv').config();\n`;
                tree.overwrite(mainFilePath, [dotEnvContent, mainContent].join('\n'));
            }
        }
        else {
            throw new schematics_1.SchematicsException(`Could not locate "${mainFilePath}". Make sure to provide the correct --mainFileName argument.`);
        }
        return tree;
    };
}
exports.addDotEnvCall = addDotEnvCall;
