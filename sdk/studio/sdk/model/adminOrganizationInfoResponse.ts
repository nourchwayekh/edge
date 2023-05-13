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

import { AdminOrganizationInfoResponseAllOf } from './adminOrganizationInfoResponseAllOf';
import { Organization } from './organization';
import { OrganizationDataset } from './organizationDataset';
import { OrganizationInfoResponse } from './organizationInfoResponse';
import { OrganizationInfoResponseAllOfDefaultComputeLimits } from './organizationInfoResponseAllOfDefaultComputeLimits';
import { OrganizationInfoResponseAllOfEntitlementLimits } from './organizationInfoResponseAllOfEntitlementLimits';
import { ProjectInfoResponseAllOfExperiments } from './projectInfoResponseAllOfExperiments';
import { ProjectPublicDataReadme } from './projectPublicDataReadme';

export class AdminOrganizationInfoResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'organization': Organization;
    'datasets': Array<OrganizationDataset>;
    'defaultComputeLimits': OrganizationInfoResponseAllOfDefaultComputeLimits;
    'entitlementLimits'?: OrganizationInfoResponseAllOfEntitlementLimits;
    /**
    * Experiments that the organization has access to. Enabling experiments can only be done through a JWT token.
    */
    'experiments'?: Array<ProjectInfoResponseAllOfExperiments>;
    'readme'?: ProjectPublicDataReadme;
    'whitelabelId'?: number;
    'billable'?: boolean;

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
            "name": "organization",
            "baseName": "organization",
            "type": "Organization"
        },
        {
            "name": "datasets",
            "baseName": "datasets",
            "type": "Array<OrganizationDataset>"
        },
        {
            "name": "defaultComputeLimits",
            "baseName": "defaultComputeLimits",
            "type": "OrganizationInfoResponseAllOfDefaultComputeLimits"
        },
        {
            "name": "entitlementLimits",
            "baseName": "entitlementLimits",
            "type": "OrganizationInfoResponseAllOfEntitlementLimits"
        },
        {
            "name": "experiments",
            "baseName": "experiments",
            "type": "Array<ProjectInfoResponseAllOfExperiments>"
        },
        {
            "name": "readme",
            "baseName": "readme",
            "type": "ProjectPublicDataReadme"
        },
        {
            "name": "whitelabelId",
            "baseName": "whitelabelId",
            "type": "number"
        },
        {
            "name": "billable",
            "baseName": "billable",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return AdminOrganizationInfoResponse.attributeTypeMap;
    }
}
