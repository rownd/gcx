"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const nock = require("nock");
const path = require("path");
const proxyquire = require("proxyquire");
const util = require("util");
const mocha_1 = require("mocha");
const gcx = require("../src");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Zip = require('node-stream-zip');
nock.disableNetConnect();
const unlink = util.promisify(fs.unlink);
const name = '🦄';
const targetDir = path.resolve('test/fixtures/');
const gcloudignore = path.resolve('test/fixtures/.gcloudignore');
const gcxp = proxyquire('../src/index', {
    'google-auth-library': {
        GoogleAuth: class {
            async getProjectId() {
                return 'el-gato';
            }
            async getClient() {
                return class {
                    async request() {
                        return {};
                    }
                };
            }
        },
    },
});
(0, mocha_1.describe)('validation', () => {
    (0, mocha_1.it)('should throw if a name is not provided', () => {
        assert.rejects(gcx.deploy({}));
    });
    (0, mocha_1.it)('should throw if multiple triggers are provided', () => {
        assert.rejects(gcx.deploy({ name, triggerBucket: 'bukkit', triggerTopic: 'toppi' }));
    });
});
(0, mocha_1.describe)('ignore rules', () => {
    (0, mocha_1.it)('should return 0 rules if no .gcloudignore is availabe', async () => {
        const deployer = new gcx.Deployer({ name });
        const rules = await deployer._getIgnoreRules();
        assert.deepStrictEqual(rules, []);
    });
    (0, mocha_1.it)('should return expected rules if .gcloudignore is availabe', async () => {
        const expected = [
            '.gcloudignore',
            '.git',
            '.gitignore',
            'node_modules',
            'test/',
        ];
        await new Promise((resolve, reject) => {
            fs.createReadStream(gcloudignore)
                .pipe(fs.createWriteStream('.gcloudignore'))
                .on('close', resolve)
                .on('error', reject);
        });
        const deployer = new gcx.Deployer({ name });
        const rules = await deployer._getIgnoreRules();
        await unlink('.gcloudignore');
        assert.deepStrictEqual(rules, expected);
    });
});
(0, mocha_1.describe)('pack & upload', () => {
    let zipFile;
    (0, mocha_1.it)('should pack all of the files in the target dir', async () => {
        const deployer = new gcx.Deployer({ name, targetDir });
        zipFile = await deployer._pack();
        const zip = new Zip({ file: zipFile, storeEntries: true });
        await new Promise((resolve, reject) => {
            zip.on('error', reject).on('ready', () => {
                const files = Object.keys(zip.entries());
                assert.strictEqual(files.length, 2);
                assert.deepStrictEqual(files.sort(), ['index.js', 'package.json']);
                zip.close();
                resolve();
            });
        });
    });
    (0, mocha_1.it)('should PUT the file to Google Cloud Storage', async () => {
        const deployer = new gcx.Deployer({ name, targetDir });
        const scope = mockUpload();
        await deployer._upload(zipFile, 'https://fake.local');
        scope.done();
    });
});
(0, mocha_1.describe)('cloud functions api', () => {
    (0, mocha_1.it)('should check to see if the function exists', async () => {
        const scopes = [mockExists()];
        const deployer = new gcxp.Deployer({ name });
        const fullName = `projects/el-gato/locations/us-central1/functions/${name}`;
        const exists = await deployer._exists(fullName);
        assert.strictEqual(exists, true);
        scopes.forEach(s => s.done());
    });
});
(0, mocha_1.describe)('end to end', () => {
    (0, mocha_1.it)('should deploy end to end', async () => {
        const scopes = [mockUploadUrl(), mockUpload(), mockDeploy(), mockPoll()];
        const projectId = 'el-gato';
        const deployer = new gcxp.Deployer({ name, targetDir, projectId });
        await deployer.deploy();
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should call end to end', async () => {
        const scopes = [mockCall()];
        const c = new gcxp.Caller();
        const res = await c.call({ functionName: name });
        assert.strictEqual(res.data.result, '{ "data": 42 }');
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should call end to end with data', async () => {
        const scopes = [mockCallWithData()];
        const c = new gcxp.Caller();
        const res = await c.call({ functionName: name, data: 142 });
        assert.strictEqual(res.data.result, '{ "data": 142 }');
        scopes.forEach(s => s.done());
    });
});
function mockUpload() {
    return nock('https://fake.local', {
        reqheaders: {
            'Content-Type': 'application/zip',
            'x-goog-content-length-range': '0,104857600',
        },
    })
        .put('/')
        .reply(200);
}
function mockUploadUrl() {
    return nock('https://cloudfunctions.googleapis.com')
        .post('/v1/projects/el-gato/locations/us-central1/functions:generateUploadUrl')
        .reply(200, { uploadUrl: 'https://fake.local' });
}
function mockDeploy() {
    return nock('https://cloudfunctions.googleapis.com')
        .post('/v1/projects/el-gato/locations/us-central1/functions')
        .reply(200, { name: 'not-a-real-operation' });
}
function mockPoll() {
    return nock('https://cloudfunctions.googleapis.com')
        .get('/v1/not-a-real-operation')
        .reply(200, { done: true });
}
function mockExists() {
    return nock('https://cloudfunctions.googleapis.com')
        .get('/v1/projects/el-gato/locations/us-central1/functions/%F0%9F%A6%84')
        .reply(200);
}
/**
 * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/call
 */
function mockCall() {
    return nock('https://cloudfunctions.googleapis.com')
        .post('/v1/projects/el-gato/locations/us-central1/function/%F0%9F%A6%84:call')
        .reply(200, {
        executionId: 'my-execution-id',
        result: '{ "data": 42 }',
        error: null,
    });
}
/**
 * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/call
 */
function mockCallWithData() {
    return nock('https://cloudfunctions.googleapis.com')
        .post('/v1/projects/el-gato/locations/us-central1/function/%F0%9F%A6%84:call')
        .reply(200, {
        executionId: 'my-execution-id',
        result: '{ "data": 142 }',
        error: null,
    });
}
//# sourceMappingURL=test.js.map