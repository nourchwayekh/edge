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


export class StaffInfo {
    'isStaff': boolean;
    'hasSudoRights': boolean;
    'companyName'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "isStaff",
            "baseName": "isStaff",
            "type": "boolean"
        },
        {
            "name": "hasSudoRights",
            "baseName": "hasSudoRights",
            "type": "boolean"
        },
        {
            "name": "companyName",
            "baseName": "companyName",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return StaffInfo.attributeTypeMap;
    }
}

