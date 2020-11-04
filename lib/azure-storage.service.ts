import { ServiceClientOptions } from '@azure/ms-rest-js';
import { AbortController } from '@azure/abort-controller';
import { AnonymousCredential, BlobServiceClient } from '@azure/storage-blob';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';

export const APP_NAME = 'AzureStorageService';

export interface AzureStorageOptions {
  accountName: string;
  containerName: string;
  sasKey?: string;
  clientOptions?: ServiceClientOptions;
}

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
  constructor(
    @Inject(AZURE_STORAGE_MODULE_OPTIONS)
    private readonly options: AzureStorageOptions,
  ) {}

  async upload(
    file: UploadedFileMetadata,
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

    const { buffer, mimetype } = file;

    if (!buffer) {
      throw new Error(
        `Error encountered: File is not a valid Buffer (missing buffer property)`,
      );
    }

    const url = this.getServiceUrl(perRequestOptions);
    const anonymousCredential = new AnonymousCredential();
    const blobServiceClient: BlobServiceClient = new BlobServiceClient(
      // When using AnonymousCredential, following url should include a valid SAS or support public access
      url,
      anonymousCredential,
    );

    const containerClient = blobServiceClient.getContainerClient(
      perRequestOptions.containerName,
    );

    // Create a container
    let doesContainerExists = false;
    try {
      doesContainerExists = await this._doesContainerExist(
        blobServiceClient,
        perRequestOptions.containerName,
      );
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
        // throw new Error(error);
      }
    }

    if (doesContainerExists === false) {
      const _createContainerResponse = await containerClient.create({
        abortSignal: AbortController.timeout(10 * 60 * 1000), // Abort uploading with timeout in 10mins
      });

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
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    try {
      const uploadBlobResponse = await blockBlobClient.upload(
        file.buffer,
        buffer.byteLength,
        {
          abortSignal: null,
          blobHTTPHeaders: {
            blobContentType: mimetype || 'application/octet-stream',
          },
        },
      );
      Logger.log(`Blob "${blobName}" uploaded successfully`, APP_NAME);
    } catch (error) {
      throw new Error(error);
    }

    return blockBlobClient.url;
  }

  getServiceUrl(perRequestOptions: Partial<AzureStorageOptions>) {
    // remove the first ? symbol if present
    perRequestOptions.sasKey = perRequestOptions.sasKey.replace('?', '');
    return `https://${perRequestOptions.accountName}.blob.core.windows.net/?${perRequestOptions.sasKey}`;
  }

  private async _listContainers(blobServiceClient: BlobServiceClient) {
    const containers = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    return containers;
  }

  private async _doesContainerExist(blobServiceClient: BlobServiceClient, name: string) {
    return (await this._listContainers(blobServiceClient)).includes(name);
  }
}
