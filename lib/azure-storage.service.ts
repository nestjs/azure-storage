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
  ) {
    // override global options with the provided ones for this request
    perRequestOptions = Object.assign(this.options, perRequestOptions);

    const content = file.buffer;

    if (!content) {
      Logger.error(`Error encountered: File is not a valid Buffer`, APP_NAME);
      return false;
    }

    if (
      typeof this.options.sasKey !== 'string' &&
      perRequestOptions.sasKey === ''
    ) {
      Logger.error(
        `Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.`,
        APP_NAME,
      );
      return false;
    }

    const url = `https://${perRequestOptions.accountName}.blob.core.windows.net/${perRequestOptions.sasKey}`;
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
          Logger.error(
            `Access denied for resource "${perRequestOptions.containerName}". Please check your "AZURE_STORAGE_SAS_KEY" key.`,
            APP_NAME,
          );
        } else {
          Logger.error(`Error encountered: ${error.statusCode}`, APP_NAME);
        }
      } else if (error && error.code === 'REQUEST_SEND_ERROR') {
        Logger.error(
          `Account not found: "${perRequestOptions.accountName}". Please check your "AZURE_STORAGE_ACCOUNT" value.`,
          APP_NAME,
        );
      } else {
        Logger.error(error, APP_NAME);
      }

      return false;
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
        content,
        content.byteLength,
      );
      Logger.log(`Blob "${blobName}" uploaded successfully`, APP_NAME);
    } catch (error) {
      Logger.error(`Failed to upload blob "${blobName}"`, APP_NAME);
      Logger.error(error, APP_NAME);
    }

    return blockBlobURL.url;
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
