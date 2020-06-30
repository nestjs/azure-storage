import { Inject, Injectable, Logger } from '@nestjs/common';
import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';
import {BlobServiceClient, ContainerDeleteResponse, StorageSharedKeyCredential} from "@azure/storage-blob";
import {DefaultAzureCredential} from "@azure/identity";

export const APP_NAME = 'AzureStorageService';

export interface AzureStorageOptions {
  accountName: string;
  containerName: string;

  sasKey?: string;
  accountKey?: string;
  connectionString?: string;
}

export interface UploadedFileMetadata {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: string;
}

export interface AzureFileToUpload {
  name: string;
  buffer: Buffer;
  size: number;
}
export type AzureDownloadFile = string;

export interface StorageBlobData {
  accountName: string;
  containerName: string;
  blobName: string;
  url: URL;
}

@Injectable()
export class AzureStorageService {
  static readonly defaultConfig: AzureStorageOptions = {
    accountName: undefined,
    containerName: undefined,
    accountKey: undefined,
    sasKey: undefined,
    connectionString: undefined,
  };
  private readonly blobClient: BlobServiceClient;
  constructor(
    @Inject(AZURE_STORAGE_MODULE_OPTIONS)
    private readonly options: AzureStorageOptions,
  ) {
    this.blobClient = this.getClient(options);
  }

  // [Node.js only] A helper method used to read a Node.js readable stream into string FROM [https://www.npmjs.com/package/@azure/storage-blob]
  private async streamToBuffer(readableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on("data", (data) => {
        chunks.push(data);
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  }


  /**
   * Creates new BlobServiceClient using provided configuration
   * @param options AzureStorageOptions
   *
   * @todo: Add some static memory for configurations - so we will not be creating infinite number of object for same configuration (but different from default)
   */
  private getClient(options: AzureStorageOptions): BlobServiceClient {
    if (options.sasKey) {
      return new BlobServiceClient(
          `https://${options.accountName}.blob.core.windows.net/${options.sasKey}`,
      );
    } else if (options.accountKey) {
      const sharedKeyCredentials = new StorageSharedKeyCredential(options.accountName, options.accountKey);
      return new BlobServiceClient(
          `https://${options.accountName}.blob.core.windows.net/`,
          sharedKeyCredentials,
      );
    } else if (options.connectionString) {
      return BlobServiceClient.fromConnectionString(options.connectionString);
    } else {
      const defaultAzureCredential  = new DefaultAzureCredential();
      return new BlobServiceClient(
          `https://${options.accountName}.blob.core.windows.net/`,
          defaultAzureCredential ,
      );
    }
  }

  async delete(storageUrl: string, perRequestOptions: Partial<AzureStorageOptions> = {},) {
    const blobDownloadData = this.parseStorageUrl(storageUrl);

    const urlOptions = this.mergeWithDefaultOptions(blobDownloadData);
    const requestOptions = Object.assign(this.mergeWithDefaultOptions(perRequestOptions), urlOptions);

    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(blobDownloadData.containerName);
    const blobClient = await containerClient.getBlockBlobClient(blobDownloadData.blobName);
    const response = await blobClient.delete();

    return true;
  }

  async download(storageUrl: string, perRequestOptions: Partial<AzureStorageOptions> = {},) {
    const blobDownloadData = this.parseStorageUrl(storageUrl);

    const urlOptions = this.mergeWithDefaultOptions(blobDownloadData);
    const requestOptions = Object.assign(this.mergeWithDefaultOptions(perRequestOptions), urlOptions);

    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(blobDownloadData.containerName);
    const blobClient = await containerClient.getBlockBlobClient(blobDownloadData.blobName);
    const file = await blobClient.download();

    const downloadBlockBlobResponse = await blobClient.download();
    const buffer = await this.streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    return buffer;
  }

  async upload(file: AzureFileToUpload, perRequestOptions: Partial<AzureStorageOptions> = {},) {
    if (!file) {
      throw new TypeError('file object of AzureFileToUpload to upload must be provided');
    }
    if (!file.name) {
      throw new TypeError('file.name must be provided');
    }
    if (!file.buffer) {
      throw new TypeError('file.buffer must be provided');
    }
    if (!file.size) {
      throw new TypeError('file.size must be provided');
    }


    const requestOptions = this.mergeWithDefaultOptions(perRequestOptions);
    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(this.options.containerName);
    const blobClient = await containerClient.getBlockBlobClient(file.name);
    const uploadStatus = blobClient.upload(file.buffer, file.size);

    // TODO: Check uploadStatus

    return this.getBlobUrl(file.name, requestOptions);
  }

  /**
   * Splits storage url into accountName, containerName and blobName
   *
   * @param storageUrl
   */
  protected parseStorageUrl(storageUrl: string): StorageBlobData {
    // https://${perRequestOptions.accountName}.blob.core.windows.net/${file}?${perRequestOptions.sasKey}
    const url = new URL(storageUrl);
    const accountName = url.hostname.split('.')[0];

    if (url.hostname !== `${accountName}.blob.core.windows.net`) {
      throw new Error(
          `Error encountered: storageUrl is not valid Microsoft Azure Storage Blob URL`,
      );
    }

    const temp = url.pathname.split('/');
    const containerName = temp[1]; // always starts from /
    const file = temp.splice(2, temp.length - 1).join('/');

    return {
      accountName: accountName,
      containerName: containerName,
      blobName: file,
      url,
    };
  }

  /**
   * Returns blobClient -
   * @param perRequestOptions
   */
  protected getRequestClient(perRequestOptions: AzureStorageOptions): BlobServiceClient {
    let same = true;
    for (const prop in AzureStorageService.defaultConfig) {
      if (!AzureStorageService.defaultConfig.hasOwnProperty(prop)) continue;

      if (this.options[prop] !== perRequestOptions[prop]) {
        same = false;

        break;
      }
    }

    return same === true ? this.blobClient : this.getClient(perRequestOptions);

  }

  /**
   * Returns url for blob using accountName, containerName and blobName
   * @param blobName
   * @param perRequestOptions
   */
  protected getBlobUrl(blobName: string, perRequestOptions: Partial<AzureStorageOptions>): string {
    return `https://${perRequestOptions.accountName}.blob.core.windows.net/${perRequestOptions.containerName}/${blobName}`;
  }

  /**
   * Merges provided config with default and checking if its properly set.
   * Returns merged config.
   *
   * @param perRequestOptions
   */
  mergeWithDefaultOptions(perRequestOptions: Partial<AzureStorageOptions> = {}): AzureStorageOptions {
    const options = Object.assign(
      {},
      AzureStorageService.defaultConfig,
      this.options,
      perRequestOptions,
    );


    if (!options.accountName) {
      throw new Error(
          `Error encountered: "accountName" was not provided.`,
      );
    }

    if (!options.sasKey && !options.accountKey && !options.connectionString) {
      throw new Error(
          `Error encountered: Neither "sasKey" nor "accountKey" nor "connectionString" was not provided.`,
      );
    }

    return options;
  }
  /*
  // parseStorageUrl(storageUrl: string): StorageBlobData {
    https://${perRequestOptions.accountName}.blob.core.windows.net/${file}?${perRequestOptions.sasKey}
    // const url = new URL(storageUrl);
    // const accountName = url.hostname.split('.')[0];
    //
    // if (url.hostname !== `${accountName}.blob.core.windows.net`) {
    //   throw new Error(
    //       `Error encountered: storageUrl is not valid Microsoft Azure Storage Blob URL`,
    //   );
    // }
    //
    // const temp = url.pathname.split('/');
    // const containerName = temp[0];
    // const file = temp.splice(1, temp.length -1).join('/');
    //
    // return {
    //   accountName: accountName,
    //   containerName: containerName,
    //   blobName: file,
    //   url,
    // };
  // }
  //
  // async download(
  //     storageUrl: string,
  //     perRequestOptions: Partial<AzureStorageOptions> = null,
  // ) {
  //   const blobDownloadData = this.parseStorageUrl(storageUrl);
  //
    override global options with the provided ones for this request
    // perRequestOptions = {
    //   ...this.options,
    //   ...perRequestOptions,
      override configuration with data from url
      // ...{containerName: blobDownloadData.containerName, accountName: blobDownloadData.accountName},
    // };
    //
    check configuration
    // this.checkConfiguration(perRequestOptions);
    //
    //
    // const url = this.getServiceUrl(perRequestOptions);
    // const anonymousCredential = new Azure.AnonymousCredential();
    // const pipeline = Azure.StorageURL.newPipeline(anonymousCredential);
    // const serviceURL = new Azure.BloclServiceClient(
        When using AnonymousCredential, following url should include a valid SAS
        // url,
        // pipeline,
    // );
    //
    Create a container
    // const containerURL = Azure.ContainerURL.fromServiceURL(
    //     serviceURL,
    //     perRequestOptions.containerName,
    // );
    //
    // const blobURL = Azure.BlobURL.fromContainerURL(containerURL, blobDownloadData.blobName);
    // try {
    //   console.log(containerURL, blobURL);
    //   await blobURL.download(
    //       Azure.Aborter.none,
    //       0,
    //   );
    //
    //   Logger.log(`Blob "${blobDownloadData.blobName}" downloaded successfully`, APP_NAME);
    // } catch (error) {
    //   throw new Error(error);
    // }
    const blockBlobURL = Azure.BlockBlobURL.fromBlobURL(storageUrl);
  // }
  //
  // async upload(
  //   file: UploadedFileMetadata,
  //   perRequestOptions: Partial<AzureStorageOptions> = null,
  // ): Promise<string | null> {
    override global options with the provided ones for this request
    // perRequestOptions = {
    //   ...this.options,
    //   ...perRequestOptions,
    // };
    //
    // this.checkConfiguration(perRequestOptions);
    //
    // const { buffer, mimetype } = file;
    //
    // if (!buffer) {
    //   throw new Error(
    //     `Error encountered: File is not a valid Buffer (missing buffer property)`,
    //   );
    // }
    //
    // const url = this.getServiceUrl(perRequestOptions);
    // const anonymousCredential = new Azure.AnonymousCredential();
    // const pipeline = Azure.StorageURL.newPipeline(anonymousCredential);
    // const serviceURL = new Azure.ServiceURL(
      When using AnonymousCredential, following url should include a valid SAS
      // url,
      // pipeline,
    // );
    //
    Create a container
    // const containerURL = Azure.ContainerURL.fromServiceURL(
    //   serviceURL,
    //   perRequestOptions.containerName,
    // );
    //
    // const doesContainerExists = await this.doesContainerExists(serviceURL, perRequestOptions);
    // if (doesContainerExists === false) {
    //   const createContainerResponse = await containerURL.create(
    //       Azure.Aborter.none,
    //   );
    //   Logger.log(
    //       `Container "${perRequestOptions.containerName}" created successfully`,
    //       APP_NAME,
    //   );
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
        {
          blobHTTPHeaders: {
            blobContentType: mimetype || 'application/octet-stream',
          },
        },
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

  protected async doesContainerExists(serviceURL, perRequestOptions): Promise<boolean> {
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

    return doesContainerExists;
  }

  private async _doesContainerExist(
    serviceURL: Azure.ServiceURL,
    name: string,
  ) {
    return (await this._listContainers(serviceURL)).includes(name);
  }
   */
}
