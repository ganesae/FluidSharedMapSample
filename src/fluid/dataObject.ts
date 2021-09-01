import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IEvent } from '@fluidframework/common-definitions';
import { IFluidHandle } from '@fluidframework/core-interfaces';

import { xmlStringToDdsSharedMap } from '../xml-dds';
import { SharedObjectSequence } from '@fluid-experimental/fluid-framework/dist/sequence';
import { IValueChanged, SharedMap } from '@fluidframework/map';

export interface ISampleDataObject {
  getRuntime(): any;
  getSharedMap(): Promise<SharedMap | undefined>;
  waitGetSharedMap(timeoutMs?: number): Promise<SharedMap | undefined>;
  createSharedMapRoot(): Promise<SharedMap | undefined>;
  loadXmlIntoSharedMap(xml: string): Promise<boolean>;
}

export class SampleDataObject extends DataObject implements ISampleDataObject {
  private xmlRootMap?: SharedMap;
  private xmlMap?: SharedMap;
  private loaded?: boolean;

  public static get Name() {
    return 'SampleDataObject';
  }

  public static readonly factory = new DataObjectFactory<
    SampleDataObject,
    object,
    undefined,
    IEvent
  >(
    SampleDataObject.Name,
    SampleDataObject,
    [SharedObjectSequence.getFactory(), SharedMap.getFactory()],
    {}
  );
  public static getFactory() {
    return this.factory;
  }

  public getRuntime(): any {
    return this.runtime;
  }

  // called exactly once when a new document is created
  protected async initializingFirstTime() {
    const map = SharedMap.create(this.runtime);
    this.root.set('xml', map.handle);
    this.xmlRootMap = map;
  }

  // called exactly once after a document was created or an existing document is loaded
  protected async initializingFromExisting() {
    const rootMap = await this.getRootMap();
    if (!rootMap) {
      console.error(`Failed to get root map`);
      return;
    }
  }

  // called exactly once after a document was created or an existing document is loaded
  protected async hasInitialized() {
    // Nothing to do
  }

  async getRootMap(): Promise<SharedMap | undefined> {
    let rootMap = this.xmlRootMap;
    if (!rootMap) {
      const handle = this.root.get<IFluidHandle<SharedMap>>('xml');
      if (handle) {
        rootMap = await handle.get();
      }
      this.xmlRootMap = rootMap;
    }

    return rootMap;
  }

  async createSharedMapRoot(): Promise<SharedMap | undefined> {
    let map = await this.getSharedMap();
    if (map) {
      return map;
    }

    const rootMap = await this.getRootMap();
    if (!rootMap) {
      console.error(`Failed to get root map`);
      return undefined;
    }

    map = SharedMap.create(this.runtime, undefined);
    if (!map) {
      return undefined;
    }

    rootMap.set('map', map.handle);
    this.xmlMap = map;
    this.loaded = false;

    return map;
  }

  async hasSharedMap(): Promise<boolean> {
    if (this.xmlMap) {
      return true;
    }

    const rootMap = await this.getRootMap();
    if (rootMap) {
      const handle = rootMap.get<IFluidHandle<SharedMap>>('map');
      if (handle) {
        this.xmlMap = await handle.get();
      }
    }

    return !!this.xmlMap;
  }

  async getSharedMap(): Promise<SharedMap | undefined> {
    if (this.xmlMap) {
      return this.xmlMap;
    }

    const rootMap = await this.getRootMap();
    if (rootMap) {
      const handle = await rootMap.get<IFluidHandle<SharedMap>>('map');
      if (handle) {
        this.xmlMap = await handle.get();
      }
    }

    return this.xmlMap;
  }

  async waitGetSharedMap(timeoutMs?: number): Promise<SharedMap | undefined> {
    let sharedMap = await this.getSharedMap();
    if (sharedMap) {
      return sharedMap;
    }

    console.info(`Waiting for root shared map`);
    const start = new Date().getTime();
    const stop = false;
    while (!stop) {
      sharedMap = await this.getSharedMap();
      if (sharedMap) {
        const end = new Date().getTime();
        console.info(`Got root shared map in ${end - start} ms`);
        return sharedMap;
      }
      await this.sleep(500);
    }

    console.error(`Timed out while waiting for root shared map`);

    return undefined;
  }

  async loadXmlIntoSharedMap(xml: string): Promise<boolean> {
    let map = await this.getSharedMap();
    if (map && this.loaded) {
      return true;
    }

    if (!this.xmlMap) {
      return false;
    }

    console.info(`Loading xml into SharedMap`);
    const start = new Date().getTime();

    const ret = await xmlStringToDdsSharedMap(this.runtime, xml, this.xmlMap);

    this.loaded = true;

    if (ret) {
      const end = new Date().getTime();
      console.info(`Loaded xml into SharedMap in ${end - start} ms`);
    }

    return ret;
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
