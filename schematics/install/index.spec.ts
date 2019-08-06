import { Tree, HostTree } from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import { Schema as AzureOptions } from './schema';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../collection.json');
const APP_MODULE_CONTENT = `
import { Module } from '@nestjs/common';
@Module({
  imports: [],
})
export class AppModule {}
`;
const MAIN_FILE = `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
`;

const azureOptions: AzureOptions = {
  storageAccountName: 'testing',
  storageAccountSAS: 'testing',
};

describe('Running nest add @nestjs/azure-storage in a clean project', () => {
  let tree: UnitTestTree;
  let runner: SchematicTestRunner;

  beforeEach(() => {
    tree = new UnitTestTree(new HostTree());
    tree.create('/package.json', JSON.stringify({}));
    tree.create('src/main.ts', MAIN_FILE);
    tree.create('src/app.module.ts', APP_MODULE_CONTENT);
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should validate required argument: storageAccountName', () => {
    const invalidAzureOptions = {...azureOptions};
    invalidAzureOptions.storageAccountName = null;
    
    expect(() => {
      runner.runSchematic('azure-storage', invalidAzureOptions, tree);
    }).toThrow();
  });

  it('should validate required argument: storageAccountSAS', () => {
    const invalidAzureOptions = {...azureOptions};
    invalidAzureOptions.storageAccountSAS = null;
    
    expect(() => {
      runner.runSchematic('azure-storage', invalidAzureOptions, tree);
    }).toThrow();
  });

  it('should create all the required files', () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    expect(tree.files).toContain('/package.json');
    expect(tree.files).toContain('/.gitignore');
    expect(tree.files).toContain('/.env');
    expect(tree.files).toContain('/src/main.ts');
    expect(tree.files).toContain('/src/app.module.ts');
    expect(tree.files.length).toEqual(5);
  });

  it('package.json: should contain all required dependencies', () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    const fileContent = JSON.parse(tree.readContent('/package.json'));
    expect(fileContent.dependencies).toBeTruthy();
    expect(fileContent.dependencies['@azure/ms-rest-js']).toBeTruthy();
    expect(fileContent.dependencies['@azure/storage-blob']).toBeTruthy();
    expect(fileContent.dependencies['dotenv']).toBeTruthy();
  });

  it('.gitignore: should contain the .env file', () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    const fileContent = tree.readContent('/.gitignore');
    expect(fileContent).toContain('.env');
  });

  it('.env: should contain AZURE_STORAGE_SAS_KEY and AZURE_STORAGE_ACCOUNT keys', () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    const fileContent = tree.readContent('/.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
  });

  it(`src/main.ts: should contain the require('dotenv') call`, () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    const fileContent = tree.readContent('/src/main.ts');
    expect(fileContent).toContain(
      `if (process.env.NODE_ENV !== 'production') require('dotenv').config();`,
    );
  });

  it(`src/app.module.ts: should contain the AzureStorageModule.withConfig(...) call`, () => {
    runner.runSchematic('azure-storage', azureOptions, tree);

    const fileContent = tree.readContent('/src/app.module.ts');
    expect(fileContent).toContain(
      `AzureStorageModule.withConfig({sasKey: process.env['AZURE_STORAGE_SAS_KEY'], accountName: process.env['AZURE_STORAGE_ACCOUNT'], containerName: 'nest-demo-container' }`,
    );
  });
});

describe('Running nest add @nestjs/azure-storage in a complex project', () => {
  let tree: UnitTestTree;
  let runner: SchematicTestRunner;

  beforeEach(() => {
    tree = new UnitTestTree(new HostTree());
    runner = new SchematicTestRunner('schematics', collectionPath);
  });
  
  it('should throw if missing package.json', () => {
    expect(() => {
      runner.runSchematic('azure-storage', azureOptions, tree);
    }).toThrow('Could not read package.json.');
  });

  it('should throw if missing src/main.ts', () => {
    tree.create('/package.json', JSON.stringify({}));

    expect(() => {
      runner.runSchematic('azure-storage', azureOptions, tree);
    }).toThrow('Could not locate "src/main.ts". Make sure to provide the correct --mainFileName argument.');
  });

  it('should throw if missing src/app.module.ts', () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('src/main.ts', MAIN_FILE);

    expect(() => {
      runner.runSchematic('azure-storage', azureOptions, tree);
    }).toThrow('Could not read Nest module file: src/app.module.ts');
  });

  it('should skipp if .env already present', () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('src/main.ts', MAIN_FILE);
    tree.create('src/app.module.ts', APP_MODULE_CONTENT);
    tree.create('.env', 'old content');
    
    runner.runSchematic('azure-storage', azureOptions, tree);
    const fileContent = tree.readContent('.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
    
  });

});
