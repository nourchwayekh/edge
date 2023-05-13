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


export class DeployPretrainedModelInputTimeSeries {
    'inputType': DeployPretrainedModelInputTimeSeriesInputTypeEnum;
    'frequencyHz': number;
    'windowLengthMs': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "inputType",
            "baseName": "inputType",
            "type": "DeployPretrainedModelInputTimeSeriesInputTypeEnum"
        },
        {
            "name": "frequencyHz",
            "baseName": "frequencyHz",
            "type": "number"
        },
        {
            "name": "windowLengthMs",
            "baseName": "windowLengthMs",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return DeployPretrainedModelInputTimeSeries.attributeTypeMap;
    }
}


export type DeployPretrainedModelInputTimeSeriesInputTypeEnum = 'time-series';
export const DeployPretrainedModelInputTimeSeriesInputTypeEnumValues: string[] = ['time-series'];