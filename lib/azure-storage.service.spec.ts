jest.mock('@azure/storage-blob');
import * as Azure from '@azure/storage-blob';

import {
  AzureStorageService,
  AzureStorageOptions,
  UploadedFileMetadata,
} from './azure-storage.service';

const buffer = Buffer.from('test');
const file: UploadedFileMetadata = {
  buffer,
  fieldname: 'file',
  originalname: 'test.txt',
  encoding: 'utf-8',
  mimetype: 'text/plain',
  size: buffer.length + '',
  storageUrl: null,
};

Azure.ServiceURL.prototype.listContainersSegment = (...args: any): any => {
  return {
    nextMarker: null,
    containerItems: [],
  };
};

Azure.ContainerURL.fromServiceURL = (...args: any): any => {
  return {
    create(...args: any) {},
  };
};

Azure.BlockBlobURL.fromBlobURL = (...args: any): any => {
  return {
    upload() {},
    url: 'FAKE_URL',
  };
};

let storage = null;

describe('AzureStorageService', () => {
  beforeEach(() => {
    const options: AzureStorageOptions = {
      accountName: 'test_account',
      containerName: 'test_container',
      sasKey: 'FAKE_SAS_KEY',
    };
    storage = new AzureStorageService(options);
  });

  it('should upload successfully when config is valid', async () => {
    const url = await storage.upload(file);
    expect(url).toBe('FAKE_URL');
  });
  it('should upload successfully when SAS key starts with ?', async () => {
    const url = await storage.upload(file, { sasKey: '?test' });
    expect(url).toBe('FAKE_URL');
  });

  it('should upload successfully when SAS key does not start with ?', async () => {
    const url = await storage.upload(file, { sasKey: 'test' });
    expect(url).toBe('FAKE_URL');
  });

  it('should fail upload when SAS key is null', async () => {
    try {
      await storage.upload(file, { sasKey: null });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
      );
    }
  });
  it('should fail upload when SAS key is undefined', async () => {
    try {
      await storage.upload(file, { sasKey: undefined });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
      );
    }
  });
  it('should fail upload when SAS key is empty string', async () => {
    try {
      await storage.upload(file, { sasKey: '' });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
      );
    }
  });
  it('should fail upload when Storage Account name is null', async () => {
    try {
      await storage.upload(file, { accountName: null });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.',
      );
    }
  });
  it('should fail upload when Storage Account name is undefined', async () => {
    try {
      await storage.upload(file, { accountName: undefined });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.',
      );
    }
  });
  it('should fail upload when Storage Account name is empty string', async () => {
    try {
      await storage.upload(file, { accountName: '' });
    } catch (e) {
      expect(e.toString()).toBe(
        'Error: Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.',
      );
    }
  });
  it('should fail upload when File is null', async () => {
    try {
      await storage.upload(null);
    } catch (e) {
      expect(e.toString()).toBe(
        "TypeError: Cannot destructure property `buffer` of 'undefined' or 'null'.",
      );
    }
  });
});
