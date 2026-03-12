import globals from 'globals';
import pluginJs from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ['**/*.js'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
	pluginJs.configs.recommended,
	{
		ignores: ['coverage/**', 'node_modules/**'],
	},
	{
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			'prettier/prettier': 'error',
			'no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
		},
	},
	prettierConfig,
];
