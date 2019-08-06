import { createParamDecorator } from '@nestjs/common';

export const AzureCredentials = createParamDecorator((data: string, req) => {
  return {
    sasKey: process.env['AZURE_STORAGE_SAS_KEY'],
    accountName: process.env['AZURE_STORAGE_ACCOUNT'],
  };
});