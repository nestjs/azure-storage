import { Injectable } from '@nestjs/common';
import * as concat from 'concat-stream';
import { AzureStorageService } from './azure-storage.service';

@Injectable()
export class AzureMulterStorageService {
  // protected azureStorage: AzureStorageService;

  constructor(
    // @Inject(AZURE_STORAGE_MODULE_OPTIONS)
    // private readonly options: AzureStorageOptions,
    private readonly azureStorage: AzureStorageService,
  ) {
    // Logger.log(this.azureStorage, 'AzureMulterStorageService');
    // this.azureStorage = new AzureStorageService(options);
  }

  // @implement multer.storage
  async _handleFile(_req: any, file: any, cb: Function) {
    const storageUrl = await this.azureStorage.upload(file);
    file.storageUrl = storageUrl;

    cb(null, {
      file,
    });
  }

  // @implement multer.storage
  _removeFile(_req: any, file: any, cb: Function) {
    delete file.buffer;
    cb(null);
  }
}

// export function azureMulterStorage() {
//   const injector = new ModuleRef(new NestContainer(new ApplicationConfig()));
//   return new AzureMulterStorageService(injector.in);
// }
