import { FileEntry, HostTree, Tree } from '@angular-devkit/schematics';
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

async function createTestNest(
  runner: SchematicTestRunner,
  tree?: Tree,
): Promise<UnitTestTree> {
  return await runner
    .runExternalSchematicAsync(
      '@nestjs/schematics',
      'application',
      {
        name: 'newproject',
        directory: '.',
      },
      tree,
    )
    .toPromise();
}

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

const getFileContent = (tree: UnitTestTree, path: string): string => {
  const fileEntry: FileEntry = tree.get(path);
  if (!fileEntry) {
    throw new Error(`The file does not exist.`);
  }
  return fileEntry.content.toString();
};

describe('Running nest add @nestjs/azure-storage in a clean project', () => {
  let nestTree: Tree;
  let stdin: any;
  let runner: SchematicTestRunner = new SchematicTestRunner(
    'az-storage',
    collectionPath,
  );

  beforeAll(() => {
    stdin = require('mock-stdin').stdin();
  });

  beforeEach(async () => {
    nestTree = await createTestNest(runner);
  });

  fit('should create all required files', async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    expect(tree.files).toEqual(
      expect.arrayContaining([
        '/package.json',
        '/.env',
        '/src/app.module.ts',
        '/src/main.ts',
      ]),
    );
  });

  it('should add all required dependencies to package.json', async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = JSON.parse(getFileContent(tree, '/package.json'));

    expect(Object.keys(fileContent.dependencies)).toEqual(
      expect.arrayContaining([
        '@nestjs/azure-storage',
        '@azure/ms-rest-js',
        '@azure/storage-blob',
        'dotenv',
      ]),
    );
  });

  it('should add all required dependencies to package.json even if --skipInstall is used', async () => {
    const tree = await runner
      .runSchematicAsync(
        'nest-add',
        {
          ...azureOptions,
          skipInstall: true,
        } as AzureOptions,
        nestTree,
      )
      .toPromise();

    const fileContent = JSON.parse(getFileContent(tree, '/package.json'));
    expect(fileContent.dependencies).toBeTruthy();
    expect(fileContent.dependencies['@azure/ms-rest-js']).toBeTruthy();
    expect(fileContent.dependencies['@azure/storage-blob']).toBeTruthy();
    expect(fileContent.dependencies['dotenv']).toBeTruthy();
  });

  it('should create .gitignore and add .env rules to it', async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/.gitignore');
    expect(fileContent).toContain('.env\n.env.*\n');
  });

  it('should add AZURE_STORAGE_SAS_KEY and AZURE_STORAGE_ACCOUNT config to .env', async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
  });

  it(`should not add the require('dotenv') call in src/main.ts`, async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/src/main.ts');
    expect(fileContent).not.toContain(
      `if (process.env.NODE_ENV !== 'production') require('dotenv').config();`,
    );
  });

  it(`should add the @nestjs/azure-storage import in src/app.module.ts`, async () => {
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/src/app.module.ts');
    expect(fileContent).toContain(AZURE_MODULE_IMPORT);
  });

  it(`should not add AzureStorageModule.withConfig(...) call if @Module() is not found`, async () => {
    nestTree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_NO_DECORATOR);
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const content = getFileContent(tree, '/src/app.mpdule.ts');
    expect(content).toMatch(APP_MODULE_CONTENT_NO_DECORATOR);
  });

  it(`should not add AzureStorageModule.withConfig(...) call if already exists`, async () => {
    nestTree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_WITH_CONFIG);
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const content = getFileContent(tree, '/src/app.mpdule.ts');
    expect(content).toMatch(APP_MODULE_CONTENT_WITH_CONFIG);
  });

  describe(`should add the AzureStorageModule.withConfig(...) call in src/app.module.ts`, () => {
    it(`when "Module.import" is empty array`, async () => {
      const tree = await runner
        .runSchematicAsync('nest-add', azureOptions, nestTree)
        .toPromise();
      const fileContent = getFileContent(tree, '/src/app.module.ts');
      expect(fileContent).toContain(AZURE_MODULE_CONFIG);
    });

    it('when "Module.import" is undefined', async () => {
      nestTree.create('/src/app.mpdule.ts', APP_MODULE_CONTENT_NO_IMPORT);
      const tree = await runner
        .runSchematicAsync('nest-add', azureOptions, nestTree)
        .toPromise();
      const fileContent = getFileContent(tree, '/src/app.module.ts');
      expect(fileContent).toContain(AZURE_MODULE_CONFIG);
    });
  });
});

describe('Running nest add @nestjs/azure-storage in a complex project', () => {
  let nestTree: Tree;
  let runner: SchematicTestRunner = new SchematicTestRunner(
    'schematics',
    collectionPath,
  );

  beforeEach(async () => {
    nestTree = await createTestNest(runner);
  });

  it('should throw if missing package.json', () => {
    expect(async () => {
      await runner
        .runSchematicAsync('nest-add', azureOptions, nestTree)
        .toPromise();
    }).toThrow('Could not read package.json.');
  });

  it('should throw if missing src/app.module.ts', () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);

    expect(async () => {
      await runner
        .runSchematicAsync('nest-add', azureOptions, nestTree)
        .toPromise();
    }).toThrow('Could not read Nest module file: src/app.module.ts');
  });

  it('should skipp if .env file already present', async () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);
    nestTree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    nestTree.create('/.env', 'old content');

    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();
    const fileContent = getFileContent(tree, '/.env');
    expect(fileContent).toContain('AZURE_STORAGE_SAS_KEY=testing');
    expect(fileContent).toContain('AZURE_STORAGE_ACCOUNT=testing');
  });

  it('should skipp if .env file already contains the same configuration', async () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);
    nestTree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    const ENV_CONTENT = [
      '# See: http://bit.ly/azure-storage-account',
      'AZURE_STORAGE_SAS_KEY=testing',
      '# See: http://bit.ly/azure-storage-sas-key',
      'AZURE_STORAGE_ACCOUNT=testing',
    ].join('\n');
    nestTree.create('/.env', ENV_CONTENT);

    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();
    const fileContent = getFileContent(tree, '/.env');
    expect(fileContent).toMatch(ENV_CONTENT);
  });

  it('should skip adding the .env file to .gitignore if .env is already present', async () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);
    nestTree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    nestTree.create('/.gitignore', '.env');
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/.gitignore');
    expect(fileContent).toMatch('.env');
  });

  it('should append the .env file to an existing non-empty .gitignore file', async () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);
    nestTree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    nestTree.create('/.gitignore', 'foo');
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/.gitignore');
    expect(fileContent).toMatch('foo\n.env\n.env.*\n');
  });

  it('should append the .env file to an existing empty .gitignore file', async () => {
    nestTree.create('/package.json', JSON.stringify({}));
    nestTree.create('/src/main.ts', MAIN_FILE);
    nestTree.create('/src/app.module.ts', APP_MODULE_CONTENT);
    nestTree.create('/.gitignore', '');
    const tree = await runner
      .runSchematicAsync('nest-add', azureOptions, nestTree)
      .toPromise();

    const fileContent = getFileContent(tree, '/.gitignore');
    expect(fileContent).toMatch('\n.env\n.env.*\n');
  });
});
