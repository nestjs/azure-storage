import * as Azure from '@azure/storage-blob';
import { ServiceClientOptions } from '@azure/ms-rest-js';

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

    const { buffer } = file;

    if (!buffer) {
      throw new Error(
        `Error encountered: File is not a valid Buffer (missing buffer property)`,
      );
    }

    const url = this.getServiceUrl(perRequestOptions);
    const anonymousCredential = new Azure.AnonymousCredential();
    const pipeline = Azure.StorageURL.newPipeline(anonymousCredential);
    const serviceURL = new Azure.ServiceURL(
      // When using AnonymousCredential, following url should include a valid SAS
      url,
      pipeline,
    );

    // Create a container
    const containerURL = Azure.ContainerURL.fromServiceURL(
      serviceURL,
      perRequestOptions.containerName,
    );

    let doesContainerExists = false;
    try {
      doesContainerExists = await this._doesContainerExist(
        serviceURL,
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
        throw new Error(error);
      }
    }

    if (doesContainerExists === false) {
      const createContainerResponse = await containerURL.create(
        Azure.Aborter.none,
      );
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
    const blobURL = Azure.BlobURL.fromContainerURL(containerURL, blobName);
    const blockBlobURL = Azure.BlockBlobURL.fromBlobURL(blobURL);
    try {
      const uploadBlobResponse = await blockBlobURL.upload(
        Azure.Aborter.none,
        buffer,
        buffer.byteLength,
      );
      Logger.log(`Blob "${blobName}" uploaded successfully`, APP_NAME);
    } catch (error) {
      throw new Error(error);
    }

    return blockBlobURL.url;
  }

  getServiceUrl(perRequestOptions: Partial<AzureStorageOptions>) {
    // remove the first ? symbol if present
    perRequestOptions.sasKey = perRequestOptions.sasKey.replace('?', '');
    return `https://${perRequestOptions.accountName}.blob.core.windows.net/?${perRequestOptions.sasKey}`;
  }

  private async _listContainers(serviceURL: Azure.ServiceURL) {
    let marker: string;
    const containers = [];
    do {
      const listContainersResponse: Azure.Models.ServiceListContainersSegmentResponse = await serviceURL.listContainersSegment(
        Azure.Aborter.none,
        marker,
      );

      marker = listContainersResponse.nextMarker;
      for (const container of listContainersResponse.containerItems) {
        containers.push(container.name);
      }
    } while (marker);

    return containers;
  }

  private async _doesContainerExist(
    serviceURL: Azure.ServiceURL,
    name: string,
  ) {
    return (await this._listContainers(serviceURL)).includes(name);
  }
}
