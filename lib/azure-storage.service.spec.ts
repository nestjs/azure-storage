jest.mock('@azure/storage-blob');
import * as Azure from '@azure/storage-blob';
import { BlobServiceClient } from '@azure/storage-blob';
import {
    AzureServiceUrlProviderOptions,
    AzureStorageOptions,
    AzureStorageService,
    UploadedFileMetadata,
} from './azure-storage.service';

const buffer = Buffer.from('test');

// this isn't actually needed since most properties are ignored (on file upload) and it only gives confusing results.
// I will not change it for the sake of backwards compatibility
const file: UploadedFileMetadata = {
    buffer,
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: 'utf-8',
    mimetype: 'text/plain',
    size: buffer.length + '',
    storageUrl: null,
};

Azure.BlobServiceClient.prototype.listContainers = (async function* () {
    if(Math.random() < 0.5) {
        yield {name: "container_name"};
    } else {
        throw {statusCode: 403};
    }
}) as any;

Azure.BlobServiceClient.prototype.getContainerClient = (...args: any): any => {
    return {
        exists() {
            return true;
        },
        getBlobClient() {
            return {
                getBlockBlobClient() {
                    return {
                        upload() {
                        },
                        url: "FAKE_URL"
                    }
                }
            }
        }
    };
};

let storage: AzureStorageService = null;
let options: AzureStorageOptions = null;

describe('AzureStorageService', () => {
    beforeEach(() => {
        options = {
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
        const url = await storage.upload(file, {sasKey: '?test'});
        expect(url).toBe('FAKE_URL');
    });
    it('should upload successfully when SAS key does not start with ?', async () => {
        const url = await storage.upload(file, {sasKey: 'test'});
        expect(url).toBe('FAKE_URL');
    });
    it('should upload successfully when custom provider is given', async () => {
        const service = new AzureStorageService({
            ...options,
            serviceUrlProvider: (opts) => `http://localhost/${opts.accountName}?${opts.sasKey}`
        })
        const url = await service.upload(file, {sasKey: 'test'});
        expect(url).toBe('FAKE_URL');
    });

    it('should fail upload when SAS key is null', async () => {
        try {
            await storage.upload(file, {sasKey: null});
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
            );
        }
    });
    it('should fail upload when SAS key is undefined', async () => {
        try {
            await storage.upload(file, {sasKey: undefined});
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
            );
        }
    });
    it('should fail upload when SAS key is empty string', async () => {
        try {
            await storage.upload(file, {sasKey: ''});
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: "AZURE_STORAGE_SAS_KEY" was not provided.',
            );
        }
    });
    it('should fail upload when Storage Account name is null', async () => {
        try {
            await storage.upload(file, {accountName: null});
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.',
            );
        }
    });
    it('should fail upload when Storage Account name is undefined', async () => {
        try {
            await storage.upload(file, {accountName: undefined});
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: "AZURE_STORAGE_ACCOUNT" was not provided.',
            );
        }
    });
    it('should fail upload when Storage Account name is empty string', async () => {
        try {
            await storage.upload(file, {accountName: ''});
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
            // @TODO: make an actual error message for this case
            expect(e.toString()).toBe(
                "TypeError: Cannot read properties of null (reading 'buffer')",
            );
        }
    });

    it('should return the correct default url when no provider has been given', async () => {
        expect(storage.getServiceUrl()).toBe('https://test_account.blob.core.windows.net/?FAKE_SAS_KEY');
    });
    it('should return the correct url when a custom service provider is given', async () => {
        const service = new AzureStorageService({
            ...options,
            serviceUrlProvider: (opts) => `http://localhost/${opts.accountName}?${opts.sasKey}`
        })
        expect(service.getServiceUrl({
            accountName: "test_account",
            sasKey: "FAKE_SAS_KEY"
        })).toBe('http://localhost/test_account?FAKE_SAS_KEY');
    });
    it('should fail to return a url when the provider throws a error', () => {
        const service = new AzureStorageService({
            ...options,
            serviceUrlProvider: () => {
                throw new Error('Mock Error')
            }
        });
        try {
            service.getServiceUrl(options as AzureServiceUrlProviderOptions);
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Mock Error',
            );
        }
    });
    it('should fail to return a url when the provider returns an invalid url', () => {
        const service = new AzureStorageService({
            ...options,
            serviceUrlProvider: () => {
                return 'something_invalid';
            }
        });
        try {
            service.getServiceUrl(options as AzureServiceUrlProviderOptions);
        } catch (e) {
            expect(e.toString()).toBe(
                'Error: Error encountered: ServiceUrlProvider returned an invalid url, received: "something_invalid"',
            );
        }
    });

    it('should return a client with the default settings provided in the module', () => {
        const service = new AzureStorageService(options);
        expect(service.getServiceClient()).toBeInstanceOf(BlobServiceClient);
    });
});
