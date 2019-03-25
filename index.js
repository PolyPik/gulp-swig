'use strict';
const fs = require('fs');
const path = require('path');
const through = require('through2');
const PluginError = require('plugin-error');
const replaceExt = require('replace-ext');
const swig = require('swig-templates');

module.exports = (options = {}) => {
	const {data: optData, defaults, loadJson, jsonPath, setup, ...swigOpts} = options;

	if (defaults) {
		swig.setDefaults(defaults);
	}

	if (setup && typeof setup === 'function') {
		setup(swig);
	}

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new PluginError('gulp-swig', 'Streaming not supported'));
			return;
		}

		let data = optData || {};
		let finalJsonPath = null;

		if (file.data) {
			data = Object.assign(data, file.data);
		}

		if (typeof data === 'function') {
			data = data(file);
		}

		if (loadJson === true) {
			if (jsonPath) {
				finalJsonPath = path.join(
					jsonPath,
					replaceExt(path.basename(file.path), '.json')
				);
			} else {
				finalJsonPath = replaceExt(file.path, '.json');
			}

			// Skip error if json file doesn't exist
			try {
				data = Object.assign(data, JSON.parse(fs.readFileSync(finalJsonPath)));
			} catch (error) {}
		}

		try {
			const render = swig.compileFile(file.path, swigOpts)(data);
			file.contents = Buffer.from(render);
			this.push(file);
		} catch (error) {
			this.emit('error', new PluginError('gulp-swig', error));
		}

		cb();
	});
};
