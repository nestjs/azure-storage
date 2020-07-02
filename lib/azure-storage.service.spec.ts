import { Readable } from 'stream';
const JAzure = jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation((...any: any) => {
    return {
      getContainerClient: jest.fn().mockReturnValue(
        {
          getBlockBlobClient: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue('a'),
            delete: jest.fn(),
            download: jest.fn().mockResolvedValue({
              readableStreamBody: Readable.from([Buffer.from('test')]),
            }),
          }),
        },
      ),
    };
  }),
}));
import {BlockBlobClient, BlockBlobUploadResponse} from '@azure/storage-blob';
import * as Azure from '@azure/storage-blob';


import {
  AzureStorageService,
  AzureStorageOptions,
  AzureFileToUpload,
} from './azure-storage.service';




const buffer = Buffer.from('test');
const file: AzureFileToUpload = {
  buffer,
  name: 'test.txt',
  size: buffer.length,
};
const downloadFileUrl = 'https://test_account.blob.core.windows.net/test_container/test.txt';

describe('AzureStorageService', () => {
  let storage: AzureStorageService = null;

  beforeAll(() => {
    const options: AzureStorageOptions = {
      accountName: 'test_account',
      containerName: 'test_container',
      sasKey: 'FAKE_SAS_KEY',
    };
    storage = new AzureStorageService(options);
  });

  describe('Uploading Files', () => {
    it('should upload successfully when config is valid', async () => {
      const url = await storage.upload(file);
      expect(url).toBe(downloadFileUrl);
    });


    describe('Fails', () => {
      it('should not upload successfully when no auth methods are present', async () => {
        try {
          await storage.upload(file, {sasKey: undefined});
        } catch (e) {
          return expect(e.toString()).toBe(
            'Error: Error encountered: Neither "sasKey" nor "accountKey" nor "connectionString" was not provided.',
          );
        }

        throw new Error('Executed without any errors when it should not have');
      });

      it('should fail upload when Storage Account name is empty', async () => {
        try {
          await storage.upload(file, {accountName: null});
        } catch (e) {
          return expect(e.toString()).toBe(
            'Error: Error encountered: "accountName" was not provided.',
          );
        }

        throw new Error('Executed without any errors when it should not have');
      });

      it('should fail upload when File is null', async () => {
        try {
          await storage.upload(null);
        } catch (e) {
          expect(e.toString()).toBe(
            'TypeError: file object of AzureFileToUpload to upload must be provided',
          );
        }
      });

      it('should fail upload when File is without name', async () => {
        try {
          await storage.upload({} as any);
        } catch (e) {
          expect(e.toString()).toBe(
            'TypeError: file.name must be provided',
          );
        }
      });

      it('should fail upload when File is without buffer', async () => {
        try {
          await storage.upload({name: 'a'} as any);
        } catch (e) {
          expect(e.toString()).toBe(
            'TypeError: file.buffer must be provided',
          );
        }
      });

      it('should fail upload when File is size', async () => {
        try {
          await storage.upload({name: 'a', buffer: new Buffer(10)} as any);
        } catch (e) {
          expect(e.toString()).toBe(
            'TypeError: file.size must be provided',
          );
        }
      });
    });
  });

  describe('Downloading blob', () => {
    it('should download successfully when url is valid', async () => {
      const buffer = await storage.download(downloadFileUrl);
      expect(buffer.toString()).toBe(file.buffer.toString());
    });

    describe('Fails', () => {

    });
  });

  describe('Delete blob', () => {
    it('should delete successfullty when url is valid', async () => {
      await storage.delete(downloadFileUrl);
    });
  });
});
