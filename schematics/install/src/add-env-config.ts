import { normalize } from '@angular-devkit/core';
import { green, red } from '@angular-devkit/core/src/terminal';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import { Schema as AzureOptions } from '../schema';

const AZURE_STORAGE_SAS_KEY = 'AZURE_STORAGE_SAS_KEY';
const AZURE_STORAGE_ACCOUNT = 'AZURE_STORAGE_ACCOUNT';

/**
 * This will create or update the `.env` file with the `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_SAS_KEY` values.
 * 
 * @example
 * ```
 * AZURE_STORAGE_SAS_KEY=this-is-the-sas-key-value
 * AZURE_STORAGE_ACCOUNT=this-is-the-storage-account-value
 * ```
 * 
 * @param options The Azure arguments provided to this schematic.
 */
export function addDotEnvConfig(options: AzureOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const envPath = normalize('/.env');

    
    if (options.storageAccountName === '' || options.storageAccountSAS === '') {
      if (options.storageAccountName === '') {
        context.logger.error('storageAccountName can not be empty.')
      }
      if (options.storageAccountSAS === '') {
        context.logger.error('storageAccountSAS can not be empty.')
      }
      process.exit(1);
      return null;
    }

    // environment vars to add to .env file
    const newEnvFileContent =
      `# See: http://bit.ly/azure-storage-sas-key\n` +
      `AZURE_STORAGE_SAS_KEY=${options.storageAccountSAS}\n` +
      `# See: http://bit.ly/azure-storage-account\n` +
      `AZURE_STORAGE_ACCOUNT=${options.storageAccountName}\n`;

    const oldEnvFileContent = readEnvFile(tree, envPath);

    // .env file doest not exist, add one and exit
    if (!oldEnvFileContent) {
      tree.create(envPath, newEnvFileContent);
      return tree;
    }

    if (oldEnvFileContent === newEnvFileContent) {
      return context.logger.warn(
        `Skipping enviromenent variables configuration ` +
          `because an ".env" file was detected and already contains these Azure Storage tokens:\n\n` +
          green(`# New configuration\n` + `${newEnvFileContent}`),
      );
    }

    // if old config was detected, verify config does not already contain the required tokens
    // otherwise we exit and let the user update manually their config
    if (
      oldEnvFileContent.includes(AZURE_STORAGE_SAS_KEY) ||
      oldEnvFileContent.includes(AZURE_STORAGE_ACCOUNT)
    ) {
      return context.logger.warn(
        `Skipping enviromenent variables configuration ` +
          `because an ".env" file was detected and already contains an Azure Storage tokens.\n` +
          `Please manually update your .env file with the following configuration:\n\n` +
          red(`# Old configuration\n` + `${oldEnvFileContent}\n`) +
          green(`# New configuration\n` + `${newEnvFileContent}`),
      );
    }

    const recorder = tree.beginUpdate(envPath);
    recorder.insertLeft(0, newEnvFileContent);
    tree.commitUpdate(recorder);
    return tree;
  };
}

function readEnvFile(host: Tree, fileName: string): string {
  const buffer = host.read(fileName);
  return buffer ? buffer.toString('utf-8') : null;
}

/**
 * This rule is responsible for adding the `require('dotenv').config()` to the main.ts file.
 * The call will be added to the top of the file before any other call.
 * 
 * @example
 * ```
 * if (process.env.NODE_ENV !== 'production') require('dotenv').config();
 * ```
 * @param options The Azure arguments provided to this schematic.
 */
export function addDotEnvCall(options: AzureOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const mainFilePath = `${options.rootDir}/${options.mainFileName}.ts`;
    const content: Buffer | null = tree.read(mainFilePath);

    if (content) {
      const mainContent = content.toString('utf-8');

      if (mainContent.includes(`require('dotenv')`)) {
        return context.logger.warn(
          `>> Skipping dotenv configuration because there is already ` +
            `a call to require('dotenv') in "${mainFilePath}".`,
        );
      } else {
        const dotEnvContent = `if (process.env.NODE_ENV !== 'production') require('dotenv').config();\n`;
        tree.overwrite(mainFilePath, [dotEnvContent, mainContent].join('\n'));
      }
    } else {
      throw new SchematicsException(
        `Could not locate "${mainFilePath}". Make sure to provide the correct --mainFileName argument.`,
      );
    }
    return tree;
  };
}
