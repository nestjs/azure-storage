<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications, heavily inspired by <a href="https://angular.io" target="blank">Angular</a>.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://api.travis-ci.org/nestjs/nest.svg?branch=master" alt="Travis" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://img.shields.io/travis/nestjs/nest/master.svg?label=linux" alt="Linux" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#5" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec"><img src="https://img.shields.io/badge/Donate-PayPal-dc3d53.svg"/></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Azure Storage](http://bit.ly/nest_azure-storage-blob) module for [Nest](https://github.com/nestjs/nest) framework (node.js)

## Before Installation

1. Create a Storage account and resource ([read more](http://bit.ly/nest_new-azure-storage-account))
1. In the [Azure Portal](https://portal.azure.com), go to **Dashboard > Storage > _your-storage-account_**.
2. Note down the "AccountName", "AccountKey" obtained at **Access keys** and "AccountSAS" from **Shared access signature** under **Settings** tab.

## (Recommended) Installation and automatic configuration

Using the Nest CLI:

```bash
$ nest add @nestjs/azure-storage
```

## Additional options

You can pass additional flags to customize the post-install schematic. For example, if your base application directory is different than `src`, use `--rootDir` flag:

```bash
$ nest add @nestjs/azure-storage --rootDir app
```

When requested, provide the `storageAccountName` and `storageAccountSAS` (see below).
```

Other available flags:

- `rootDir` - Application root directory, default: `src`
- `rootModuleFileName` - the name of the root module file, default: `app.module`
- `rootModuleClassName` - the name of the root module class, default: `AppModule`
- `mainFileName` - Application main file, default: `main`
- `skipInstall` - skip installing dependencies, default: `false`
- `storageAccountName` (required) - The Azure Storage account name (see: http://bit.ly/azure-storage-account)
- `storageAccountSAS` (required) - The Azure Storage SAS Key (see: http://bit.ly/azure-storage-sas-key).

## (Option 2) Manual configuration

1. Install the package using NPM:

```bash
$ npm i -S @nestjs/azure-storage
```

2. Create or update your excisting `.env` file with the following content:

```
AZURE_STORAGE_SAS_KEY=
AZURE_STORAGE_ACCOUNT=
```

> The SAS has the following format: `?sv=2018-03-28&ss=bfqt&srt=sco&sp=rwdlacup&se=2019-12-31T22:54:03Z&st=2019-07-11T13:54:03Z&spr=https,http&sig=WmAl%236251oj11biPK2xcpLs254152H9s0%3D`

3. **IMPORTANT: Make sure to add your `.env` file to your `.gitignore`! The `.env` file MUST NOT be versionned on Git.**

4. Make sure to call the following call to your main file:

```
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
```

> This line must be added before any other imports!

5. Import the `AzureStorageModule` with the following configuration:

```
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AzureStorageModule } from '@nestjs/azure-storage';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    AzureStorageModule.withConfig({
      sasKey: process.env['AZURE_STORAGE_SAS_KEY'],
      accountName: process.env['AZURE_STORAGE_ACCOUNT'],
      containerName: 'nest-demo-container',
    }),
  ],
})
export class AppModule {}
```

> You may provide a default `containerName` name for the whole module, this will apply to all controllers withing this module. You can also provide (override) the `containerName` in the controller, for each route.

## Story examples

### Store a file using the default container name

```
import {
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AzureStorageFileInterceptor,
  UploadedFileMetadata,
} from '@nestjs/azure-storage';

@Controller()
export class AppController {
  
  @Post('azure/upload')
  @UseInterceptors(
    AzureStorageFileInterceptor('file'),
  )
  UploadedFilesUsingInterceptor(
    @UploadedFile()
    file: UploadedFileMetadata,
  ) {
    Logger.log(`Storage URL: ${file.storageUrl}`, 'AppController');
  }
}
```

### Store a file using a specific container name

```
import {
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AzureStorageFileInterceptor,
  UploadedFileMetadata,
} from '@nestjs/azure-storage';

@Controller()
export class AppController {
  
  @Post('azure/upload')
  @UseInterceptors(
    AzureStorageFileInterceptor('file', null, {
      containerName: 'nest-demo-container-interceptor',
    }),
  )
  UploadedFilesUsingInterceptor(
    @UploadedFile()
    file: UploadedFileMetadata,
  ) {
    Logger.log(`Storage URL: ${file.storageUrl}`, 'AppController');
  }
}
```


### Store a file using a custom file name

```
import {
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AzureStorageFileInterceptor,
  AzureStorageService,
  UploadedFileMetadata,
} from '@nestjs/azure-storage';

@Controller()
export class AppController {
  constructor(private readonly azureStorage: AzureStorageService) {}
  
  @Post('azure/upload')
  @UseInterceptors(FileInterceptor('file'))
  async UploadedFilesUsingService(
    @UploadedFile()
    file: UploadedFileMetadata,
  ) {
    file = {
      ...file,
      originalname: 'foo-bar.txt',
    };
    const storageUrl = await this.azureStorage.upload(file);
    Logger.log(`Storage URL: ${storageUrl}`, 'AppController');
  }
}
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

* Author - [Wassim Chegham](https://wassim.dev)
* Website - [https://wassim.dev](https://wassim.dev/)
* Twitter - [@manekinekko](https://twitter.com/manekinekko)

## License

Nest is [MIT licensed](LICENSE).
