import { HostTree } from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as AzureOptions } from './schema';

const collectionPath = path.join(__dirname, '../collection.json');

const AZURE_MODULE_CONFIG = `AzureStorageModule.withConfig({sasKey: process.env['AZURE_STORAGE_SAS_KEY'], accountName: process.env['AZURE_STORAGE_ACCOUNT'], containerName: 'nest-demo-container' }`;
const AZURE_MODULE_IMPORT = `import { AzureStorageModule } from '@nestjs/azure-storage';`;
const APP_MODULE_CONTENT = `
import { Module } from '@nestjs/common';
@Module({
  imports: [],
})
export class AppModule {}
`;
const APP_MODULE_CONTENT_NO_IMPORT = `
import { Module } from '@nestjs/common';
@Module({})
export class AppModule {}
`;
const APP_MODULE_CONTENT_WITH_CONFIG = `
${AZURE_MODULE_IMPORT}
import { Module } from '@nestjs/common';
@Module({
  imports: [${AZURE_MODULE_CONFIG}],
})
export class AppModule {}
`;
const APP_MODULE_CONTENT_NO_DECORATOR = `
import { Module } from '@nestjs/common';
@FakeModule({
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

export function mockProcessStdin() {
  const processStdin = process.stdin.write as any;
  if (processStdin.mockRestore) {
    processStdin.mockRestore();
  }
  let spyImplementation: any;
  spyImplementation = jest
    .spyOn(process.stdin, 'write')
    .mockImplementation(() => true);
  return spyImplementation as jest.SpyInstance<
    (buffer: Buffer | string, encoding?: string, cb?: Function) => boolean
  >;
}

describe('Running nest add @nestjs/azure-storage in a clean project', () => {
  let tree: UnitTestTree;
  let runner: SchematicTestRunner;
  let stdin: any;

  beforeAll(() => {
    stdin = require('mock-stdin').stdin();
  });

  beforeEach(() => {
    tree = new UnitTestTree(new HostTree());
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    runner = new SchematicTestRunner('schematics', collectionPath);
  });

  it('should validate required argument: storageAccountName', () => {
    const invalidAzureOptions = { ...azureOptions };
    invalidAzureOptions.storageAccountName = null;

    expect(async () => {
      await runner.runSchematicAsync('nest-add', invalidAzureOptions, tree).toPromise();
    }).rejects.toThrow();
  });

  it('should validate required argument: storageAccountSAS', () => {
    const invalidAzureOptions = { ...azureOptions };
    invalidAzureOptions.storageAccountSAS = null;

    expect(async () => {
      await runner.runSchematicAsync('nest-add', invalidAzureOptions, tree).toPromise();
    }).rejects.toThrow();
  });

  it('should create all required files', async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    expect(tree.files).toEqual([
      '/package.json',
      '/.env',
      '/.gitignore',
      '/src/main.ts',
      '/src/app.module.ts',
    ]);
    expect(tree.files.length).toEqual(5);
  });

  it('should add all required dependencies to package.json', async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = JSON.parse(tree.readContent('/package.json'));
    expect(Object.keys(fileContent.dependencies).sort()).toEqual(
      [
        '@nestjs/azure-storage',
        '@azure/ms-rest-js',
        '@azure/storage-blob',
        'dotenv',
      ].sort(),
    );
  });

  it('should add all required dependencies to package.json even if --skipInstall is used', async () => {
    await runner.runSchematicAsync(
      'nest-add',
      {
        ...azureOptions,
        skipInstall: true,
      } as AzureOptions,
      tree,
    ).toPromise();

    const fileContent = JSON.parse(tree.readContent('/package.json'));
    expect(fileContent.dependencies).toBeTruthy();
    expect(fileContent.dependencies['@azure/ms-rest-js']).toBeTruthy();
    expect(fileContent.dependencies['@azure/storage-blob']).toBeTruthy();
    expect(fileContent.dependencies['dotenv']).toBeTruthy();
  });

  it('should create .gitignore and add .env rules to it', async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/.gitignore');
    expect(fileContent).toContain('.env\n.env.*\n');
  });

  it('should add AZURE_STORAGE_SAS_KEY and AZURE_STORAGE_ACCOUNT config to .env', async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
  });

  it(`should not add the require('dotenv') call in src/main.ts`, async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/src/main.ts');
    expect(fileContent).not.toContain(
      `if (process.env.NODE_ENV !== 'production') require('dotenv').config();`,
    );
  });

  it(`should add the @nestjs/azure-storage import in src/app.module.ts`, async () => {
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/src/app.module.ts');
    expect(fileContent).toContain(AZURE_MODULE_IMPORT);
  });

  it(`should throw if main module is not found`, () => {
    expect(async () => {
      await runner.runSchematicAsync(
        'nest-add',
        {
          ...azureOptions,
          rootModuleFileName: 'file-404',
        } as AzureOptions,
        tree,
      ).toPromise();
    }).rejects.toThrow('Could not read Nest module file: src/file-404.ts');
  });

  it(`should not add AzureStorageModule.withConfig(...) call if @Module() is not found`, async () => {
    tree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_NO_DECORATOR);
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const content = tree.readContent('/src/app.mpdule.ts');
    expect(content).toMatch(APP_MODULE_CONTENT_NO_DECORATOR);
  });

  it(`should not add AzureStorageModule.withConfig(...) call if already exists`, async () => {
    tree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_WITH_CONFIG);
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const content = tree.readContent('/src/app.mpdule.ts');
    expect(content).toMatch(APP_MODULE_CONTENT_WITH_CONFIG);
  });

  describe(`should add the AzureStorageModule.withConfig(...) call in src/app.module.ts`, () => {
    it(`when "Module.import" is empty array`, async () => {
      await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
      const fileContent = tree.readContent('/src/app.module.ts');
      expect(fileContent).toContain(AZURE_MODULE_CONFIG);
    });

    it('when "Module.import" is undefined', async () => {
      tree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_NO_IMPORT);
      await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
      const fileContent = tree.readContent('/src/app.module.ts');
      expect(fileContent).toContain(AZURE_MODULE_CONFIG);
    });
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
    expect(async () => {
      await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
    }).rejects.toThrow('Path \"/package.json\" does not exist.');
  });

  it('should throw if missing src/app.module.ts', () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);

    expect(async () => {
     await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
    }).rejects.toThrow('Could not read Nest module file: src/app.module.ts');
  });

  it('should skipp if .env file already present', async () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    tree.create('/.env', 'old content');

    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
    const fileContent = tree.readContent('/.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
  });

  it('should skipp if .env file already contains the same configuration', async () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    const ENV_CONTENT = [
      '# See: http://bit.ly/azure-storage-account',
      'AZURE_STORAGE_SAS_KEY=testing',
      '# See: http://bit.ly/azure-storage-sas-key',
      'AZURE_STORAGE_ACCOUNT=testing',
    ].join('\n');
    tree.create('/.env', ENV_CONTENT);

    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();
    const fileContent = tree.readContent('/.env');
    expect(fileContent).toMatch(ENV_CONTENT);
  });

  it('should skip adding the .env file to .gitignore if .env is already present', async () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    tree.create('/.gitignore', '.env');
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/.gitignore');
    expect(fileContent).toMatch('.env');
  });

  it('should append the .env file to an existing non-empty .gitignore file', async () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    tree.create('/.gitignore', 'foo');
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/.gitignore');
    expect(fileContent).toMatch('foo\n.env\n.env.*\n');
  });

  it('should append the .env file to an existing empty .gitignore file', async () => {
    tree.create('/package.json', JSON.stringify({}));
    tree.create('/src/main.ts', MAIN_FILE);
    tree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    tree.create('/.gitignore', '');
    await runner.runSchematicAsync('nest-add', azureOptions, tree).toPromise();

    const fileContent = tree.readContent('/.gitignore');
    expect(fileContent).toMatch('\n.env\n.env.*\n');
  });
});
