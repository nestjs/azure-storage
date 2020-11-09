import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';
import { AzureStorageModule } from './azure-nest-storage.module';
import {
  AzureStorageOptions,
  AzureStorageOptionsFactory,
} from './azure-storage.service';
import { ValueProvider, FactoryProvider } from '@nestjs/common/interfaces';

describe('AzureStorageModule', () => {
  let options: AzureStorageOptions;

  beforeEach(() => {
    options = {
      accountName: 'test_account',
      containerName: 'test_container',
      sasKey: 'FAKE_SAS_KEY',
    };
  });

  it('should have storage options provider when options passed', async () => {
    const module = AzureStorageModule.withConfig(options);
    expect(module.providers.length).toBe(1);
    expect((module.providers[0] as ValueProvider<any>).provide).toBe(
      AZURE_STORAGE_MODULE_OPTIONS,
    );
    expect(await (module.providers[0] as ValueProvider<any>).useValue).toBe(
      options,
    );
  });

  it('should have storage options provider when async options passed using factory', async () => {
    const factory = async () => options;
    const module = AzureStorageModule.withConfigAsync({
      useFactory: factory,
    });
    expect(module.providers.length).toBe(1);
    expect((module.providers[0] as FactoryProvider<any>).provide).toBe(
      AZURE_STORAGE_MODULE_OPTIONS,
    );
    expect(
      await (module.providers[0] as FactoryProvider<any>).useFactory(),
    ).toBe(options);
  });

  it('should have storage options provider when async options passed using existing factory', async () => {
    class TestAzStorageOptionsFactory implements AzureStorageOptionsFactory {
      createAzureStorageOptions():
        | AzureStorageOptions
        | Promise<AzureStorageOptions> {
        return options;
      }
    }

    const module = AzureStorageModule.withConfigAsync({
      useExisting: TestAzStorageOptionsFactory,
    });
    expect(module.providers.length).toBe(1);
    expect((module.providers[0] as FactoryProvider<any>).provide).toBe(
      AZURE_STORAGE_MODULE_OPTIONS,
    );
  });
});
