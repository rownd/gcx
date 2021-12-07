/// <reference types="node" />
import { EventEmitter } from 'events';
import { GaxiosResponse } from 'gaxios';
import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';
import { cloudfunctions_v1 } from 'googleapis';
export declare enum ProgressEvent {
    STARTING = "STARTING",
    PACKAGING = "PACKAGING",
    UPLOADING = "UPLOADING",
    DEPLOYING = "DEPLOYING",
    CALLING = "CALLING",
    COMPLETE = "COMPLETE"
}
export interface CallerOptions extends GoogleAuthOptions {
    region?: string;
    functionName: string;
    data?: string;
}
export interface DeployerOptions extends GoogleAuthOptions {
    name: string;
    description?: string;
    region?: string;
    runtime?: string;
    retry?: boolean;
    memory?: number;
    network?: string;
    maxInstances?: number;
    vpcConnector?: string;
    timeout?: string;
    triggerHTTP?: boolean;
    triggerTopic?: string;
    triggerBucket?: string;
    triggerResource?: string;
    triggerEvent?: string;
    entryPoint?: string;
    project?: string;
    targetDir?: string;
    environmentVariables?: {
        [key: string]: string;
    };
}
/**
 * A generic client for GCX.
 */
export declare class GCXClient extends EventEmitter {
    _auth: GoogleAuth;
    _gcf?: cloudfunctions_v1.Cloudfunctions;
    constructor(options?: GoogleAuthOptions);
    /**
     * Provides an authenticated GCF api client.
     * @private
     */
    _getGCFClient(): Promise<cloudfunctions_v1.Cloudfunctions>;
}
/**
 * Class that provides the `deploy` method.
 */
export declare class Deployer extends GCXClient {
    _options: DeployerOptions;
    constructor(options: DeployerOptions);
    /**
     * Deploy the current application using the given opts.
     */
    deploy(): Promise<void>;
    /**
     * Given an operation, poll it until complete.
     * @private
     * @param name Fully qualified name of the operation.
     */
    _poll(name: string): Promise<void>;
    /**
     * Get a list of fields that have been changed.
     * @private
     */
    _getUpdateMask(): string;
    /**
     * Validate the options passed in by the user.
     * @private
     * @param options
     */
    private _validateOptions;
    /**
     * Build a request schema that can be used to create or patch the function
     * @private
     * @param parent Path to the cloud function resource container
     * @param sourceUploadUrl Url where the blob was pushed
     */
    _buildRequest(parent: string, sourceUploadUrl: string): cloudfunctions_v1.Schema$CloudFunction;
    /**
     * Check to see if a cloud function already exists.
     * @private
     * @param name Fully qualified name of the function.
     */
    _exists(name: string): Promise<boolean>;
    /**
     * Upload a local file to GCS given a signed url
     * @private
     * @param localPath Fully qualified path to the zip on disk.
     * @param remotePath Signed url used to put the file to
     */
    _upload(localPath: string, remotePath: string): Promise<void>;
    /**
     * Package all of the sources into a zip file.
     * @private
     */
    _pack(): Promise<string>;
    /**
     * Look in the CWD for a `.gcloudignore` file.  If one is present, parse it,
     * and return the ignore rules as an array of strings.
     * @private
     */
    _getIgnoreRules(): Promise<string[]>;
}
/**
 * Class that provides the `call` method.
 */
export declare class Caller extends GCXClient {
    /**
     * Synchronously call a function.
     * @param {string} functionName The function to call.
     */
    call(options: CallerOptions): Promise<GaxiosResponse<cloudfunctions_v1.Schema$CallFunctionResponse>>;
}
export declare function deploy(options: DeployerOptions): Promise<void>;
export declare function call(options: CallerOptions): Promise<GaxiosResponse<cloudfunctions_v1.Schema$CallFunctionResponse>>;
