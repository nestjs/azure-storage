import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Observable } from 'rxjs';
import { AzureStorageService, AzureStorageOptions } from './azure-storage.service';

export function AzureStorageFileInterceptor(
  fieldName: string,
  localOptions?: MulterOptions,
  azureStorageOptions?: Partial<AzureStorageOptions>
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    interceptor: NestInterceptor;

    constructor(private readonly azureStorage: AzureStorageService) {
      this.interceptor = new (FileInterceptor(fieldName, localOptions))();
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      (await this.interceptor.intercept(context, next)) as Observable<any>;

      const request = context.switchToHttp().getRequest();
      const file = request[fieldName];

      if (!file) {
        Logger.error(
          'AzureStorageFileInterceptor',
          `Can not intercept field "${fieldName}". Did you specify the correct field name in @AzureStorageFileInterceptor('${fieldName}')?`,
        );
        return;
      }

      const storageUrl = await this.azureStorage.upload(file, azureStorageOptions);
      file.storageUrl = storageUrl;
      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor as Type<NestInterceptor>;
}
