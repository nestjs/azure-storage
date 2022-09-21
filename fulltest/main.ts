import {NestFactory} from "@nestjs/core";
import {AppModule} from "./module";
import {AzureStorageService, UploadedFileMetadata} from "../dist";
import {readdir} from "fs";
import {join} from "path";

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

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    await app.init();
    const storage = await app.select(AppModule).get(AzureStorageService);
    await storage.upload(file);
    const files = await new Promise<string[]>((resolve, reject) => readdir(
        join(__dirname, '..', 'blob', "__blobstorage__"),
        (err, result) => err ? reject(err) : resolve(result)
    ));
    if(files.length === 0) {
        throw new Error("No file has been stored.");
    }
    const result = await storage.getContainerClient().getBlobClient(file.originalname).downloadToBuffer();
    if(result.toString() !== "test") {
        throw new Error("Blob content changed during upload.");
    }
}

main().then(() => {
    console.log("Function Test Finished Successfully");
}).catch((err) => {
    console.error(err);
    console.log("Function Test failed");
    process.exit(1);
})