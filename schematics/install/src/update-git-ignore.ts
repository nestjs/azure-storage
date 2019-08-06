import { Rule, SchematicContext } from '@angular-devkit/schematics';
import { Tree } from '@angular-devkit/schematics/src/tree/interface';
import { Schema as AzureOptions } from '../schema';

/**
 * Update the .gitignore file in order to add in the .env file that was created.
 * .env file MUST be ingored by GIT sicne they contains sensitive information.
 * 
 * @param options The Azure arguments provided to this schematic.
 */
export function updateGitIgnore(options: AzureOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const gitIgnorePath = `.gitignore`;
    const content: Buffer | null = tree.read(gitIgnorePath);
    const gitIgnoreNewContent = `\n.env\n\n.env.*\n`;

    if (content) {
      const gitIgnoreContent = content.toString('utf-8');

      if (gitIgnoreContent.includes(`.env`)) {
        return context.logger.warn(
          `>> Skipping .gitignore configuration because there is already ` +
            `a rule to ignore "${gitIgnorePath}" files.`,
        );
      } else {
        tree.overwrite(
          gitIgnorePath,
          [gitIgnoreContent, gitIgnoreNewContent].join('\n'),
        );
      }
    } else {
      tree.create(gitIgnorePath, gitIgnoreNewContent);
    }
    return tree;
  };
}
