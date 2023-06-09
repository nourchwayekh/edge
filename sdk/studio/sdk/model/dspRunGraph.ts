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

import { DspRunGraphAxisLabels } from './dspRunGraphAxisLabels';

export class DspRunGraph {
    /**
    * Name of the graph
    */
    'name': string;
    /**
    * Base64 encoded image, only present if type is \'image\'
    */
    'image'?: string;
    /**
    * Mime type of the Base64 encoded image, only present if type is \'image\'
    */
    'imageMimeType'?: string;
    /**
    * Values on the x-axis per plot. Key is the name of the raw feature. Present if type is \'logarithmic\' or \'linear\'.
    */
    'X'?: { [key: string]: Array<number>; };
    /**
    * Values of the y-axis. Present if type is \'logarithmic\' or \'linear\'.
    */
    'y'?: Array<number>;
    /**
    * Suggested minimum value of x-axis
    */
    'suggestedXMin'?: number;
    /**
    * Suggested maxium value of x-axis
    */
    'suggestedXMax'?: number;
    /**
    * Suggested minimum value of y-axis
    */
    'suggestedYMin'?: number;
    /**
    * Suggested maximum value of y-axis
    */
    'suggestedYMax'?: number;
    /**
    * Type of graph (either `logarithmic`, `linear` or `image`)
    */
    'type': string;
    /**
    * Width of the graph line (if type is `logarithmic` or `linear`). Default 3.
    */
    'lineWidth'?: number;
    /**
    * Whether to apply smoothing to the graph.
    */
    'smoothing'?: boolean;
    'axisLabels'?: DspRunGraphAxisLabels;
    /**
    * Indices of points to highlight, per axis.
    */
    'highlights'?: { [key: string]: Array<number>; };

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "image",
            "baseName": "image",
            "type": "string"
        },
        {
            "name": "imageMimeType",
            "baseName": "imageMimeType",
            "type": "string"
        },
        {
            "name": "X",
            "baseName": "X",
            "type": "{ [key: string]: Array<number>; }"
        },
        {
            "name": "y",
            "baseName": "y",
            "type": "Array<number>"
        },
        {
            "name": "suggestedXMin",
            "baseName": "suggestedXMin",
            "type": "number"
        },
        {
            "name": "suggestedXMax",
            "baseName": "suggestedXMax",
            "type": "number"
        },
        {
            "name": "suggestedYMin",
            "baseName": "suggestedYMin",
            "type": "number"
        },
        {
            "name": "suggestedYMax",
            "baseName": "suggestedYMax",
            "type": "number"
        },
        {
            "name": "type",
            "baseName": "type",
            "type": "string"
        },
        {
            "name": "lineWidth",
            "baseName": "lineWidth",
            "type": "number"
        },
        {
            "name": "smoothing",
            "baseName": "smoothing",
            "type": "boolean"
        },
        {
            "name": "axisLabels",
            "baseName": "axisLabels",
            "type": "DspRunGraphAxisLabels"
        },
        {
            "name": "highlights",
            "baseName": "highlights",
            "type": "{ [key: string]: Array<number>; }"
        }    ];

    static getAttributeTypeMap() {
        return DspRunGraph.attributeTypeMap;
    }
}

