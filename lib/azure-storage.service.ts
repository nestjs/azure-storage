import { TransferProgressEvent } from '@azure/core-http';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AZURE_STORAGE_MODULE_OPTIONS } from './azure-storage.constant';
import * as Azure from '@azure/storage-blob';
import {DefaultAzureCredential} from '@azure/identity';
import Stream, { Readable } from 'stream';

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
  buffer: Readable | Buffer;
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
  private readonly blobClient: Azure.BlobServiceClient;
  
  constructor(
    @Inject(AZURE_STORAGE_MODULE_OPTIONS)
    private readonly options: AzureStorageOptions,
  ) {
    this.blobClient = this.getClient(options);
  }
  
  async progressDownload(storageUrl: string, perRequestOptions: Partial<AzureStorageOptions> = {}, progressCallBack: (progress) => void): Promise<Buffer> {
    const blobDownloadData = this.parseStorageUrl(storageUrl);
  
    const urlOptions = this.mergeWithDefaultOptions(blobDownloadData);
    const requestOptions = Object.assign(this.mergeWithDefaultOptions(perRequestOptions), urlOptions);
  
    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(blobDownloadData.containerName);
    const blobClient = await containerClient.getBlockBlobClient(decodeURI(blobDownloadData.blobName));
  
    const downloadBlockBlobResponse = await blobClient.download(undefined, undefined, {onProgress: progressCallBack});
    const buffer = await this.streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    return buffer;
    
  }
  
  async download(storageUrl: string, perRequestOptions: Partial<AzureStorageOptions> = {},): Promise<Buffer> {
    const blobDownloadData = this.parseStorageUrl(storageUrl);
    
    const urlOptions = this.mergeWithDefaultOptions(blobDownloadData);
    const requestOptions = Object.assign(this.mergeWithDefaultOptions(perRequestOptions), urlOptions);

    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(blobDownloadData.containerName);
    const blobClient = await containerClient.getBlockBlobClient(decodeURI(blobDownloadData.blobName));
    
    const downloadBlockBlobResponse = await blobClient.download();
    const buffer = await this.streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    return buffer;
  }
  
  async upload(file: AzureFileToUpload, perRequestOptions: Partial<AzureStorageOptions> = {}, progressCallBack?: (progress: TransferProgressEvent) => void) {
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
    
    const readStreamer = file.buffer instanceof Readable ? file.buffer : Readable.from(file.buffer);
    
    
    const requestOptions = this.mergeWithDefaultOptions(perRequestOptions);
    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(this.options.containerName);
    const blobClient = await containerClient.getBlockBlobClient(file.name);
    const uploadStatus = await blobClient.uploadStream(readStreamer, 4*1024*1024, undefined,{onProgress: progressCallBack});
    if (uploadStatus.errorCode) {
      throw new Error(uploadStatus.errorCode);
    }
    
    return this.getBlobUrl(file.name, requestOptions);
  }
  
  
  async delete(storageUrl: string, perRequestOptions: Partial<AzureStorageOptions> = {},) {
    const blobDownloadData = this.parseStorageUrl(storageUrl);
    
    const urlOptions = this.mergeWithDefaultOptions(blobDownloadData);
    const requestOptions = Object.assign(this.mergeWithDefaultOptions(perRequestOptions), urlOptions);
    
    const client = this.getRequestClient(requestOptions);
    const containerClient = await client.getContainerClient(blobDownloadData.containerName);
    const blobClient = await containerClient.getBlockBlobClient(decodeURI(blobDownloadData.blobName));
    try {
      const response = await blobClient.delete();
      
      if (response.errorCode) {
        throw new Error(response.errorCode);
      }
      
      return true;
    } catch (err) {
      if (err.message.indexOf('The specified blob does not exist.') !== -1) return true;
    }
    
    return false;
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
  protected getRequestClient(perRequestOptions: AzureStorageOptions): Azure.BlobServiceClient {
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
  
  
  // [Node.js only] A helper method used to read a Node.js readable stream into string FROM [https://www.npmjs.com/package/@azure/storage-blob]
  private async streamToBuffer(readableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data);
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
  
  
  /**
   * Creates new BlobServiceClient using provided configuration
   * @param options AzureStorageOptions
   *
   * @todo: Add some static memory for configurations - so we will not be creating infinite number of object for same configuration (but different from default)
   */
  private getClient(options: AzureStorageOptions): Azure.BlobServiceClient {
    if (options.sasKey) {
      return new Azure.BlobServiceClient(
        `https://${options.accountName}.blob.core.windows.net/${options.sasKey}`,
      );
    } else if (options.accountKey) {
      const sharedKeyCredentials = new Azure.StorageSharedKeyCredential(options.accountName, options.accountKey);
      return new Azure.BlobServiceClient(
        `https://${options.accountName}.blob.core.windows.net/`,
        sharedKeyCredentials,
      );
    } else if (options.connectionString) {
      return Azure.BlobServiceClient.fromConnectionString(options.connectionString);
    } else {
      const defaultAzureCredential  = new DefaultAzureCredential();
      return new Azure.BlobServiceClient(
        `https://${options.accountName}.blob.core.windows.net/`,
        defaultAzureCredential ,
      );
    }
  }
  
  
 
  /**
   * Merges provided config with default and checking if its properly set.
   * Returns merged config.
   *
   * @param perRequestOptions
   */
  private mergeWithDefaultOptions(perRequestOptions: Partial<AzureStorageOptions> = {}): AzureStorageOptions {
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
}
