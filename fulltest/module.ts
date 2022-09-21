import {
    SASProtocol,
    StorageSharedKeyCredential,
    generateAccountSASQueryParameters,
    AccountSASResourceTypes,
    AccountSASServices,
    AccountSASPermissions
} from "@azure/storage-blob";
import {Module} from "@nestjs/common";
import {AzureStorageModule} from "../lib";

@Module({
    imports: [
        AzureStorageModule.withConfig({
            containerName: "container",
            accountName: "devstoreaccount1",
            serviceUrlProvider: (options) => {
                return `http://127.0.0.1:10000/${options.accountName}/?${options.sasKey}`
            },
            sasKey: generateAccountSASQueryParameters({
                resourceTypes: AccountSASResourceTypes.parse("sco").toString(),
                services: AccountSASServices.parse("b").toString(),
                permissions: AccountSASPermissions.parse("racwdl"),
                startsOn: new Date(Date.now() - 86400),
                expiresOn: new Date(Date.now() + 86400),
                protocol: SASProtocol.HttpsAndHttp
            }, new StorageSharedKeyCredential(...Object.values({
                accountName: 'devstoreaccount1',
                accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='
            }) as [string, string])).toString(),
        })
    ]
})
export class AppModule {

}