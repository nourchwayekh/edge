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

import { ProjectPublicData } from './projectPublicData';

export class ListPublicProjects {
    /**
    * Array with public projects
    */
    'projects': Array<ProjectPublicData>;
    'totalProjectCount': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "projects",
            "baseName": "projects",
            "type": "Array<ProjectPublicData>"
        },
        {
            "name": "totalProjectCount",
            "baseName": "totalProjectCount",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return ListPublicProjects.attributeTypeMap;
    }
}

