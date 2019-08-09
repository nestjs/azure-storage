import { DynamicModule, Module } from '@nestjs/common';
import { AzureMulterStorageService } from './azure-multer.service';
import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';
import {
  AzureStorageOptions,
  AzureStorageService,
} from './azure-storage.service';

const PUBLIC_PROVIDERS = [AzureMulterStorageService, AzureStorageService];

@Module({
  providers: [...PUBLIC_PROVIDERS],
  exports: [...PUBLIC_PROVIDERS, AZURE_STORAGE_MODULE_OPTIONS],
})
export class AzureStorageModule {
  static withConfig(options: AzureStorageOptions): DynamicModule {
    return {
      module: AzureStorageModule,
      providers: [{ provide: AZURE_STORAGE_MODULE_OPTIONS, useValue: options }],
    };
  }
}
