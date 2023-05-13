/**
 * Edge Impulse API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { GenericApiResponse } from './genericApiResponse';
import { OptimizeConfig } from './optimizeConfig';
import { OptimizeConfigResponseAllOf } from './optimizeConfigResponseAllOf';
import { OptimizeConfigTargetDevice } from './optimizeConfigTargetDevice';
import { TunerSpaceImpulse } from './tunerSpaceImpulse';

export class OptimizeConfigResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    /**
    * Dataset category
    */
    'datasetCategory'?: OptimizeConfigResponseDatasetCategoryEnum;
    /**
    * Classification type
    */
    'classificationType'?: OptimizeConfigResponseClassificationTypeEnum;
    /**
    * Target latency in MS
    */
    'targetLatency'?: number;
    'targetDevice'?: OptimizeConfigTargetDevice;
    'compiler'?: Array<string>;
    'precision'?: Array<string>;
    /**
    * Maximum number of training cycles
    */
    'trainingCycles'?: number;
    /**
    * Maximum number of trials
    */
    'tuningMaxTrials'?: number;
    /**
    * Maximum number of parallel workers/jobs
    */
    'tuningWorkers'?: number;
    'minMACCS'?: number;
    'maxMACCS'?: number;
    /**
    * Tuning algorithm to use to search hyperparameter space
    */
    'tuningAlgorithm'?: OptimizeConfigResponseTuningAlgorithmEnum;
    'notificationOnCompletion'?: boolean;
    'tunerSpaceOptions'?: object;
    /**
    * List of impulses specifying the EON Tuner search space
    */
    'space'?: Array<TunerSpaceImpulse>;
    'device'?: object;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "success",
            "baseName": "success",
            "type": "boolean"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "datasetCategory",
            "baseName": "datasetCategory",
            "type": "OptimizeConfigResponseDatasetCategoryEnum"
        },
        {
            "name": "classificationType",
            "baseName": "classificationType",
            "type": "OptimizeConfigResponseClassificationTypeEnum"
        },
        {
            "name": "targetLatency",
            "baseName": "targetLatency",
            "type": "number"
        },
        {
            "name": "targetDevice",
            "baseName": "targetDevice",
            "type": "OptimizeConfigTargetDevice"
        },
        {
            "name": "compiler",
            "baseName": "compiler",
            "type": "Array<string>"
        },
        {
            "name": "precision",
            "baseName": "precision",
            "type": "Array<string>"
        },
        {
            "name": "trainingCycles",
            "baseName": "trainingCycles",
            "type": "number"
        },
        {
            "name": "tuningMaxTrials",
            "baseName": "tuningMaxTrials",
            "type": "number"
        },
        {
            "name": "tuningWorkers",
            "baseName": "tuningWorkers",
            "type": "number"
        },
        {
            "name": "minMACCS",
            "baseName": "minMACCS",
            "type": "number"
        },
        {
            "name": "maxMACCS",
            "baseName": "maxMACCS",
            "type": "number"
        },
        {
            "name": "tuningAlgorithm",
            "baseName": "tuningAlgorithm",
            "type": "OptimizeConfigResponseTuningAlgorithmEnum"
        },
        {
            "name": "notificationOnCompletion",
            "baseName": "notificationOnCompletion",
            "type": "boolean"
        },
        {
            "name": "tunerSpaceOptions",
            "baseName": "tunerSpaceOptions",
            "type": "object"
        },
        {
            "name": "space",
            "baseName": "space",
            "type": "Array<TunerSpaceImpulse>"
        },
        {
            "name": "device",
            "baseName": "device",
            "type": "object"
        }    ];

    static getAttributeTypeMap() {
        return OptimizeConfigResponse.attributeTypeMap;
    }
}


export type OptimizeConfigResponseDatasetCategoryEnum = 'speech_keyword' | 'speech_continuous' | 'audio_event' | 'audio_continuous' | 'transfer_learning' | 'motion_event' | 'motion_continuous' | 'audio_syntiant' | 'object_detection';
export const OptimizeConfigResponseDatasetCategoryEnumValues: string[] = ['speech_keyword', 'speech_continuous', 'audio_event', 'audio_continuous', 'transfer_learning', 'motion_event', 'motion_continuous', 'audio_syntiant', 'object_detection'];

export type OptimizeConfigResponseClassificationTypeEnum = 'classification' | 'regression';
export const OptimizeConfigResponseClassificationTypeEnumValues: string[] = ['classification', 'regression'];

export type OptimizeConfigResponseTuningAlgorithmEnum = 'random' | 'hyperband' | 'bayesian' | 'custom';
export const OptimizeConfigResponseTuningAlgorithmEnumValues: string[] = ['random', 'hyperband', 'bayesian', 'custom'];