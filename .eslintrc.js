module.exports = {
	extends: [ 'avraam', 'plugin:react/recommended' ],
	globals: {
		React: false,
		ReactDOM: false
	},
	rules: {
		'class-methods-use-this': 0,
		'consistent-return': 0,
		'no-return-assign': 0,
		'max-len': 0,
		'camelcase': 0,
		'no-restricted-syntax': 0,
		'no-await-in-loop': 0,
		'no-console': 0,
	}
};