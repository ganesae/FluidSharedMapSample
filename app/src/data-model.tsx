import { ISampleDataObject } from "../../src/fluid/dataObject";
import { SharedObjectSequence } from "@fluidframework/sequence";
import { SharedMap, IValueChanged } from "@fluidframework/map";

export class DataModel {
    dataObject: ISampleDataObject;
    sharedMap: SharedMap | undefined;
    initialized: boolean = false;
    sourceDataChangedCallback: (() => void) | undefined;
    valueChangedHandler: any;
    seqValueChangedHandler: any;
    
    constructor(dataObj: ISampleDataObject) {
        this.dataObject = dataObj;

        this.valueChangedHandler = this.valueChanged.bind(this);
        this.seqValueChangedHandler = this.seqValueChanged.bind(this);
    }

    async init(): Promise<boolean> {
        this.initialized = true;

        if (!this.dataObject) {
            return false;
        }

        this.sharedMap = await this.dataObject.waitGetSharedMap();
        if (!this.sharedMap) {
            console.error(`Failed to get shared map`)
            return false;
        }

        return true;
    }

    setSourceDataChangedCallback(callback: () => void): void {
        this.sourceDataChangedCallback = callback;
    }

    async toString(): Promise<string[]> {
        if (!this.sharedMap) {
            return [];
        }
        const list = await printMap(this.sharedMap, 0);
        return list;
    }

    valueChanged(changed: IValueChanged) {
        if (this.sourceDataChangedCallback) {
            this.sourceDataChangedCallback();
        }
    }

    seqValueChanged(changed: any) {
        if (this.sourceDataChangedCallback) {
            this.sourceDataChangedCallback();
        }
    }

    async addEventHandlers(): Promise<void> {
        if (this.sharedMap) {
            this.addEventHandlersInMap(this.sharedMap);
        }
    }

    async addEventHandlersInMap(map: SharedMap): Promise<void> {
        if (!map) {
            return;
        }

        map.off("valueChanged", this.valueChangedHandler);
        map.on("valueChanged", this.valueChangedHandler);

        // Children
        const childrenHandle = map.get('_children');
        if (childrenHandle) {
            const seq: SharedObjectSequence<SharedMap> = await childrenHandle.get();
            seq.off("op", this.seqValueChangedHandler);
            seq.on("op", this.seqValueChangedHandler);
            const count = seq.getItemCount();
            for (let i = 0; i < count; ++i) {
                const prop = seq.getItems(i, i + 1);
                if (prop && prop.length > 0) {
                    const childMapHandle = prop.shift();
                    if (childMapHandle) {
                        const childMap: SharedMap = await (childMapHandle as any).get();
                        if (childMap) {
                            this.addEventHandlersInMap(childMap);
                        }
                    }
                }
            }
        }
    }
}

export async function printMap(map: SharedMap, indentSpaces: number = 0): Promise<string[]> {
    const indent = 2;
    let spaces = ' '.repeat(indentSpaces);
    let list: string[] = [];
    try {
        const type = map.get('_type');

        if (type !== 'element') {
            const val = map.get('_value') || '';
            list.push(`${spaces}Type: ${type}, Value: ${val}`);
        } else {
            const name = map.get('_name');
            list.push(`${spaces}${name}`);

            indentSpaces = indentSpaces + indent;
            spaces = ' '.repeat(indentSpaces);

            const attribHandle = map.get('_attributes');
            if (attribHandle) {
                list.push(`${spaces}Attributes:`);
                const map: SharedMap = await attribHandle.get();
                const spaces2 = ' '.repeat(indentSpaces + indent);
                map.forEach((val, key) => {
                    list.push(`${spaces2} ${key}: ${val}`);
                });
            }

            // Children
            const childrenHandle = map.get('_children');
            if (childrenHandle) {
                const seq: SharedObjectSequence<SharedMap> = await childrenHandle.get();
                const count = seq.getItemCount();
                list.push(`${spaces}Children:`);
                for (let i = 0; i < count; ++i) {
                    const prop = seq.getItems(i, i + 1);
                    if (prop && prop.length > 0) {
                        const childMapHandle = prop.shift();
                        if (childMapHandle) {
                            const childMap: SharedMap = await (childMapHandle as any).get();
                            if (childMap) {
                                const list2 = await printMap(childMap as any, indentSpaces + indent);
                                list.push(...list2);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error(
            `Failed to print map: ${e?.message}, stack: ${e?.stack}`
        );
    }

    return list;
}
