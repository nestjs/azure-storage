"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateGitIgnore(options) {
    return (tree, context) => {
        const gitIgnorePath = `.gitignore`;
        const content = tree.read(gitIgnorePath);
        const gitIgnoreNewContent = `.env\n.env.*\n`;
        if (content) {
            const gitIgnoreContent = content.toString('utf-8');
            if (gitIgnoreContent.includes(`.env`)) {
                return context.logger.warn(`>> Skipping .gitignore configuration because there is already ` +
                    `a rule to ignore "${gitIgnorePath}" files.`);
            }
            else {
                tree.overwrite(gitIgnorePath, [gitIgnoreContent, gitIgnoreNewContent].join('\n'));
            }
        }
        else {
            tree.create(gitIgnorePath, gitIgnoreNewContent);
        }
        return tree;
    };
}
exports.updateGitIgnore = updateGitIgnore;
