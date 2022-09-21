import {AnonymousCredential, BlobServiceClient, ContainerClient} from '@azure/storage-blob';
import {ServiceClientOptions} from '@azure/ms-rest-js';

import {Inject, Injectable, Logger, Type} from '@nestjs/common';
import {AZURE_STORAGE_MODULE_OPTIONS} from './azure-storage.constant';

export const APP_NAME = 'AzureStorageService';

export type ServiceUrlProvider = (options: AzureServiceUrlProviderOptions) => string;

export interface AzureServiceUrlProviderOptions {
  accountName: string;
  sasKey: string;
  containerName?: string;
}

export interface AzureStorageOptions {
  serviceUrlProvider?: ServiceUrlProvider;
  accountName: string;
  containerName: string;
  sasKey?: string;
  clientOptions?: ServiceClientOptions;
}

export interface AzureStorageAsyncOptions {
  useExisting?: Type<AzureStorageOptionsFactory>;
  useClass?: Type<AzureStorageOptionsFactory>;
  useFactory?: (
      ...args: any[]
  ) => Promise<AzureStorageOptions> | AzureStorageOptions;
  inject?: any[];
}

export interface AzureStorageOptionsFactory {
  createAzureStorageOptions():
      | AzureStorageOptions
      | Promise<AzureStorageOptions>;
}

// helper type
type WithRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & T & { [P in K]-?: T[P] }

export interface UploadedFile extends WithRequired<Partial<UploadedFileMetadata>, "buffer"|"originalname"> {}

// @TODO fix this
// where is this actually used? some sort of future-proof? most of the properties aren't required for upload and are ignored.
// This leads to very confusing results if the user for example declares a encoding and expects that encoding to be honoured.
export interface UploadedFileMetadata {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: string;
  storageUrl?: string;
}

@Injectable()
export class AzureStorageService {

  private _serviceUrlProvider: ServiceUrlProvider;

  constructor(
      @Inject(AZURE_STORAGE_MODULE_OPTIONS)
      private readonly options: AzureStorageOptions,
  ) {
    this._serviceUrlProvider = this._generateServiceUrlProvider(
        typeof this.options.serviceUrlProvider === "function"
            ? this.options.serviceUrlProvider
            : (providerOptions) => `https://${providerOptions.accountName}.blob.core.windows.net/?${providerOptions.sasKey}`
    );
  }

  async upload(
      file: UploadedFile|UploadedFileMetadata,
      perRequestOptions: Partial<AzureStorageOptions> = null,
  ): Promise<string | null> {
    // override global options with the provided ones for this request
    perRequestOptions = {
      ...this.options,
      ...perRequestOptions,
    };

    if (!perRequestOptions.accountName) {
      throw new Error(
          `Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.`,
      );
    }

    if (!perRequestOptions.sasKey) {
      throw new Error(
          `Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.`,
      );
    }

    const buffer = file.buffer;
    const mimetype = file.mimetype || 'application/octet-stream';

    if (!buffer) {
      throw new Error(
          `Error encountered: File is not a valid Buffer (missing buffer property)`,
      );
    }

    let serviceUrlProvider = this._serviceUrlProvider;

    if (typeof perRequestOptions.serviceUrlProvider === 'function') {
      serviceUrlProvider = this._generateServiceUrlProvider(perRequestOptions.serviceUrlProvider);
    }

    const url = serviceUrlProvider(perRequestOptions as AzureServiceUrlProviderOptions);
    let doesContainerExists = false;
    let serviceClient: BlobServiceClient;

    try {
      // url contains SAS key
      serviceClient = this.getServiceClient(url);
      doesContainerExists = await this._doesContainerExist(serviceClient, perRequestOptions.containerName);
    } catch (error) {
      if (error && error.statusCode) {
        if (error.statusCode === 403) {
          throw new Error(
              `Access denied for resource "${perRequestOptions.containerName}". Please check your "AZURE_STORAGE_SAS_KEY" key.`,
          );
        } else {
          throw new Error(`Error encountered: ${error.statusCode}`);
        }
      } else if (error && error.code === 'REQUEST_SEND_ERROR') {
        throw new Error(
            `Account not found: "${perRequestOptions.accountName}". Please check your "AZURE_STORAGE_ACCOUNT" value.`,
        );
      } else {
        throw new Error(error);
      }
    }

    if (doesContainerExists === false) {
      await serviceClient.createContainer(perRequestOptions.containerName);
      Logger.log(
          `Container "${perRequestOptions.containerName}" created successfully`,
          APP_NAME,
      );
    } else {
      Logger.log(
          `Using container "${perRequestOptions.containerName}"`,
          APP_NAME,
      );
    }

    const blobName = file.originalname;
    const blockBlobClient = serviceClient
        .getContainerClient(perRequestOptions.containerName)
        .getBlobClient(blobName)
        .getBlockBlobClient();
    try {
      await blockBlobClient.upload(
          buffer,
          buffer.byteLength,
          {
            blobHTTPHeaders: {
              blobContentType: mimetype
            }
          }
      );
      Logger.log(`Blob "${blobName}" uploaded successfully`, APP_NAME);
    } catch (error) {
      throw new Error(error);
    }

    return blockBlobClient.url;
  }

  getServiceUrl(perRequestOptions: Partial<AzureServiceUrlProviderOptions> = {}): string {
    return this._serviceUrlProvider({...(this.options as AzureServiceUrlProviderOptions), ...perRequestOptions});
  }

  getServiceClient(urlWithSAS?: string): BlobServiceClient {
    return new BlobServiceClient(urlWithSAS ? urlWithSAS : this.getServiceUrl(), new AnonymousCredential());
  }

  getContainerClient(containerName?: string): ContainerClient {
    return this.getServiceClient().getContainerClient(containerName ? containerName : this.options.containerName);
  }

  private _generateServiceUrlProvider(provider: ServiceUrlProvider) {
    return (providerOptions) => {
      // remove the first ? symbol if present
      providerOptions.sasKey = providerOptions.sasKey.replace('?', '');
      const providerResult = provider(providerOptions);
      try {
        return new URL(providerResult).toString();
      } catch {
        throw new Error(
            `Error encountered: ServiceUrlProvider returned an invalid url, received: ${JSON.stringify(providerResult)}`
        );
      }
    };
  }

  private async _doesContainerExist(
      serviceClient: BlobServiceClient,
      containerName: string
  ) {
    try {
      for await (const container of serviceClient.listContainers()) {
        if(container.name === containerName) {
          return true;
        }
      }
    } catch (err) {
      if(err && err.statusCode && err.statusCode == 403) {
        Logger.warn("Not allowed to list containers, trying container directly", APP_NAME);
        return await serviceClient.getContainerClient(containerName).exists();
      }
      throw err;
    }
    return false;
  }
}
