import path from 'path';
import test from 'ava';
import vfs from 'vinyl-fs';
import pEvent from 'p-event';
import marked from 'swig-marked';
import swig from 'swig-templates';
import fn from '..';

const filenameWithLayout = path.join(__dirname, './fixtures/test.html');
const filenameWithoutLayout = path.join(__dirname, './fixtures/test2.html');
const filenameWithoutJson = path.join(__dirname, './fixtures/test4.html');
const filenameWithMarkdown = path.join(__dirname, './fixtures/test3.html');
const filenameWithVarControls = path.join(__dirname, './fixtures/test5.html');

async function macro(t, opts, filename, expected) {
	const stream = fn(opts);
	const promise = pEvent(stream, 'data');

	vfs.src(filename)
		.pipe(stream);

	const file = await promise;
	t.is(file.contents.toString(), expected);
}

test.afterEach.cb(t => {
	swig.setDefaults({});
	setTimeout(t.end);
});

const testParams = [
	{
		testname: 'should compile my swig files into HTML with data obj',
		opts: {data: {message1: 'hello'}},
		filename: filenameWithLayout,
		result: '<div class="layout">hello</div>'
	},
	{
		testname: 'should compile my swig files into HTML with json file',
		opts: {loadJson: true},
		filename: filenameWithLayout,
		result: '<div class="layout">hello</div>'
	},
	{
		testname: 'should continue without error if no json file was found when load_json is set to true',
		opts: {loadJson: true},
		filename: filenameWithoutJson,
		result: 'world\n'
	},
	{
		testname: 'should compile my swig files into HTML with both data obj and json file',
		opts: {loadJson: true, data: {message2: 'world'}},
		filename: filenameWithLayout,
		result: '<div class="layout">helloworld</div>'
	},
	{
		testname: 'should compile my swig files into HTML with json file from a defined path',
		opts: {loadJson: true, jsonPath: path.join(__dirname, './fixtures/data/')},
		filename: filenameWithLayout,
		result: '<div class="layout">hello from data</div>'
	},
	{
		testname: 'should compile my swig files into HTML with data callback',
		opts: {data: file => ({message1: path.basename(file.path)})},
		filename: filenameWithLayout,
		result: '<div class="layout">test.html</div>'
	},
	{
		testname: 'should compile markdown by defining a custom tag using opts.setup',
		opts: {
			setup: swig => {
				marked.useTag(swig, 'markdown');
			}
		},
		filename: filenameWithMarkdown,
		result: '<p><strong>hello</strong><br>world</p>\n'
	},
	{
		testname: 'should compile custom varControls',
		opts: {varControls: ['{{@test', '}}'], data: {message1: 'Hello'}},
		filename: filenameWithVarControls,
		result: 'Hello\n'
	}
];

test.serial('should compile without specifying any options', async t => {
	const stream = fn();
	const promise = pEvent(stream, 'data');

	vfs.src(filenameWithLayout)
		.pipe(stream);

	const file = await promise;
	t.is(file.contents.toString(), '<div class="layout"></div>');
});

test.serial(
	'should set swig defaults',
	macro,
	{defaults: {locals: {message1: 'Hello World'}}},
	filenameWithoutLayout,
	'Hello World'
);

testParams.forEach(({testname, opts, filename, result}) => {
	test(testname, macro, opts, filename, result);
});
