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
   * The Azure Storage SAS Key.
   */
  storageAccountSAS: string;
}
