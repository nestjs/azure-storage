import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AzureMulterStorageService } from './azure-multer.service';
import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';
import {
  AzureStorageOptions,
  AzureStorageService,
  AzureStorageAsyncOptions,
  AzureStorageOptionsFactory,
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

  static withConfigAsync(options: AzureStorageAsyncOptions): DynamicModule {
    return {
      module: AzureStorageModule,
      providers: [...this.createAsyncConfigProviders(options)],
    };
  }

  private static createAsyncConfigProviders(
    options: AzureStorageAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncConfigProvider(options)];
    }

    return [
      this.createAsyncConfigProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncConfigProvider(
    options: AzureStorageAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: AZURE_STORAGE_MODULE_OPTIONS,
        useFactory: async (...args: any[]) => await options.useFactory(...args),
        inject: options.inject || [],
      };
    }
    return {
      provide: AZURE_STORAGE_MODULE_OPTIONS,
      useFactory: async (optionsFactory: AzureStorageOptionsFactory) =>
        await optionsFactory.createAzureStorageOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
