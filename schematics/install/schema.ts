export interface Schema {
  /**
   * Application root directory
   */
  rootDir?: string;
  /**
   * Application main file
   */
  mainFileName?: string;
  /**
   * The name of the root module file
   */
  rootModuleFileName?: string;
  /**
   * The name of the root module class.
   */
  rootModuleClassName?: string;
  /**
   * Skip installing dependency packages.
   */
  skipInstall?: boolean;

  /**
   * The Azure Storage Account name.
   */
  storageAccountName: string;

  /**
   * The Azure Storage access tokens:
   * - Connection string (SAS connection string or account connection string).
   * - SAS token.
   */
  storageAccountAccessKey?: string;
  storageAccountAccessType?: 'SASToken' | 'connectionString';
}