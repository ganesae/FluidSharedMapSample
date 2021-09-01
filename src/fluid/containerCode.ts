import { ContainerRuntimeFactoryWithDefaultDataStore } from "@fluidframework/aqueduct";

import { SampleDataObject } from "./dataObject";

export const CommandQueueContainerRuntimeFactory = new ContainerRuntimeFactoryWithDefaultDataStore(
    SampleDataObject.getFactory(),
    new Map([
        [SampleDataObject.Name, Promise.resolve(SampleDataObject.getFactory())],
    ]),
);
