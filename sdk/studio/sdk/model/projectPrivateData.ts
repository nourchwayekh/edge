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

import { ProjectCollaborator } from './projectCollaborator';

export class ProjectPrivateData {
    'lastAccessed'?: Date;
    /**
    * Metadata about the project
    */
    'metadata': object;
    'dataExplorerScreenshot'?: string;
    /**
    * Whether this is an enterprise project
    */
    'isEnterpriseProject': boolean;
    'collaborators'?: Array<ProjectCollaborator>;
    /**
    * Unique identifier of the white label this project belongs to, if any.
    */
    'whitelabelId': number | null;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "lastAccessed",
            "baseName": "lastAccessed",
            "type": "Date"
        },
        {
            "name": "metadata",
            "baseName": "metadata",
            "type": "object"
        },
        {
            "name": "dataExplorerScreenshot",
            "baseName": "dataExplorerScreenshot",
            "type": "string"
        },
        {
            "name": "isEnterpriseProject",
            "baseName": "isEnterpriseProject",
            "type": "boolean"
        },
        {
            "name": "collaborators",
            "baseName": "collaborators",
            "type": "Array<ProjectCollaborator>"
        },
        {
            "name": "whitelabelId",
            "baseName": "whitelabelId",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return ProjectPrivateData.attributeTypeMap;
    }
}

