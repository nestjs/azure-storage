import { createParamDecorator } from '@nestjs/common';

/**
 * @todo Figure out a way to use `@AzureCredentials()`annotation where we need to inject Azure credentials.
 */
export const AzureCredentials = createParamDecorator((data: string, req) => {
  return {
    sasKey: process.env['AZURE_STORAGE_SAS_KEY'],
    accountName: process.env['AZURE_STORAGE_ACCOUNT'],
  };
});
