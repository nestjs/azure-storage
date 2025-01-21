"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDotEnvCall = exports.addDotEnvConfig = void 0;
const core_1 = require("@angular-devkit/core");
const colors_1 = require("../utils/colors");
const schematics_1 = require("@angular-devkit/schematics");
const AZURE_STORAGE_SAS_KEY = 'AZURE_STORAGE_SAS_KEY';
const AZURE_STORAGE_ACCOUNT = 'AZURE_STORAGE_ACCOUNT';
function addDotEnvConfig(options) {
    return (tree, context) => {
        const envPath = (0, core_1.normalize)('/.env');
        if (options.storageAccountName === '' || options.storageAccountSAS === '') {
            if (options.storageAccountName === '') {
                context.logger.error('storageAccountName can not be empty.');
            }
            if (options.storageAccountSAS === '') {
                context.logger.error('storageAccountSAS can not be empty.');
            }
            process.exit(1);
            return null;
        }
        const newEnvFileContent = `# See: http://bit.ly/azure-storage-sas-key\n` +
            `AZURE_STORAGE_SAS_KEY=${options.storageAccountSAS}\n` +
            `# See: http://bit.ly/azure-storage-account\n` +
            `AZURE_STORAGE_ACCOUNT=${options.storageAccountName}\n`;
        const oldEnvFileContent = readEnvFile(tree, envPath);
        if (!oldEnvFileContent) {
            tree.create(envPath, newEnvFileContent);
            return tree;
        }
        if (oldEnvFileContent === newEnvFileContent) {
            return context.logger.warn(`Skipping enviromenent variables configuration ` +
                `because an ".env" file was detected and already contains these Azure Storage tokens:\n\n` +
                (0, colors_1.green)(`# New configuration\n` + `${newEnvFileContent}`));
        }
        if (oldEnvFileContent.includes(AZURE_STORAGE_SAS_KEY) ||
            oldEnvFileContent.includes(AZURE_STORAGE_ACCOUNT)) {
            return context.logger.warn(`Skipping enviromenent variables configuration ` +
                `because an ".env" file was detected and already contains an Azure Storage tokens.\n` +
                `Please manually update your .env file with the following configuration:\n\n` +
                (0, colors_1.red)(`# Old configuration\n` + `${oldEnvFileContent}\n`) +
                (0, colors_1.green)(`# New configuration\n` + `${newEnvFileContent}`));
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
