import React from "react";
import ReactDOM from "react-dom";

import lodash from "lodash";
import { getDefaultObjectFromContainer } from "@fluidframework/aqueduct";
import { CommandQueueContainerRuntimeFactory } from "../../src/fluid/containerCode";
import { getContainer, BackendType } from "../../src/fluid/init";
import { ISampleDataObject } from "../../src/fluid/dataObject";
import { DataModel } from "./data-model";

enum LoadOption {
    Synchronous = "Synchronous",
    Asynchronous = "Asynchronous",
}

export interface AppProps {
}

export interface AppState {
    file?: string;
    loadOption?: LoadOption;
    documentId?: string;
    dataObject?: ISampleDataObject;
    dataModel?: DataModel;
    dataStrings?: string[];
    loading?: string;
    loadError?: string;
}

class App extends React.Component<AppProps, AppState> {
    classes: any;
    debouncedLoadData: any;
    debouncedUpdateUI: any;
    getDocIdStartTime: number = 0;
    getDocIdElapsed: number = 0;
    receiveDataStartTime: number = 0;
    receiveDataElapsed: number = 0;
    loadStartTime: number = 0;
    totalElapsed: number = 0;

    constructor(props: AppProps) {
        super(props);

        this.classes = {};
        this.debouncedLoadData = lodash.debounce(this.loadData, 100);
        this.debouncedUpdateUI = lodash.debounce(this.updateUI, 5000);

        this.state = {
            file: "",
            documentId: "",
            dataObject: undefined
        };
    }

    componentDidMount() {
        const file = document.getElementById("file");
        file?.addEventListener("keyup", (event: any) => {
            if (event.keyCode === 13) {
                event.preventDefault();
                document.getElementById("open")?.click();
            }
        });
    }

    async openClicked() {
        this.load();
    }

    async radioClicked(e: any) {
        const id = e.target?.id;
        const loadOption = id === "asynchronous" ? LoadOption.Asynchronous : LoadOption.Synchronous;
        if (loadOption === this.state.loadOption) {
            return;
        }

        this.setState({ loadOption: loadOption, dataModel: undefined },
            this.load);
    }

    async load() {
        const file = (document.getElementById("file")! as any).value;
        if (!file) {
            return;
        }

        if (this.state.file === file && this.state.dataModel) {
            return;
        }

        this.getDocIdStartTime = 0;
        this.getDocIdElapsed = 0;
        this.receiveDataStartTime = 0;
        this.receiveDataElapsed = 0;
        this.loadStartTime = 0;
        this.totalElapsed = 0;

        this.setState({ loading: "Getting document id from server...", dataModel: undefined, dataStrings: undefined });

        await this.loadFile(file, this.state.loadOption!);
    }

    async loadFile(file: string, loadOption: LoadOption) {
        if (file.indexOf(".") < 0) {
            file = `${file}.xml`;
        }

        const asynchronous = loadOption === LoadOption.Asynchronous;
        console.info(`Calling backend to load file ${file} ${asynchronous ? "asynchronously" : "synchronously"} and get document id`);

        this.loadStartTime = new Date().getTime();
        this.getDocIdStartTime = this.loadStartTime;

        let documentId = await loadDocument(file, loadOption);
        if (!documentId) {
            this.setState({ loadError: "Failed to load file. Ensure file exists under test folder." });
            return;
        }

        this.getDocIdElapsed = new Date().getTime() - this.getDocIdStartTime;
        console.info(`Got document id in ${this.getDocIdElapsed} ms: ${documentId}`);

        this.setState({ loading: `Got document id in ${this.getDocIdElapsed} ms. Waiting for data...` });

        this.receiveDataStartTime = new Date().getTime();

        let dataObj: ISampleDataObject | undefined = await getDataObject(documentId);
        if (!dataObj) {
            this.setState({ loadError: "Failed to get data object" });
            return;
        }

        let currentModel;
        currentModel = new DataModel(dataObj);

        if (!currentModel) {
            return;
        }

        await currentModel.init();

        currentModel.setSourceDataChangedCallback(() => {
            this.sourceDataChanged();
        })

        this.setState({
            file, documentId, dataObject: dataObj,
            dataModel: currentModel, loadError: undefined
        }, this.loadData);
    };

    async loadData() {
        if (!this.state.dataModel) {
            return;
        }

        await this.state.dataModel.addEventHandlers();

        const end = new Date().getTime();
        this.receiveDataElapsed = end - this.receiveDataStartTime;
        this.totalElapsed = end - this.loadStartTime;
        console.info(`Change event received: Time taken to receive data till now: ${this.receiveDataElapsed} ms.`);
        this.setState({ loading: `Change event received. Time taken to receive data till now: ${this.receiveDataElapsed} ms` });

        this.debouncedUpdateUI();
    };

    async updateUI() {
        if (!this.state.dataModel) {
            return;
        }

        console.info(`Time taken to receive all data: ${this.receiveDataElapsed} ms`);
        console.info(`Total time taken: ${this.totalElapsed} ms`);
        this.setState({ loading: `Total time taken: ${this.totalElapsed} ms` });

        console.info(`Updating UI`);
        const list = await this.state.dataModel.toString();
        this.setState({ dataStrings: list });
    }

    sourceDataChanged() {
        this.debouncedLoadData();
    }

    async printDds(): Promise<void> {
        if (!this.state.dataModel) {
            return;
        }
        const list = await this.state.dataModel.toString();
        console.info(list.join("\n"));
    }

    getMapItemsAsString(items: string[]) {
        if (!items) {
            return [];
        }

        let i = 0;
        let list: any[] = [];
        items.forEach(str => {
            ++i;
            const indentPerSpace = 10;
            const trimmedStr = str.trimLeft();
            const indent = (str.length - trimmedStr.length) * indentPerSpace;
            const elem: JSX.Element = (
                <div style={{ display: "grid", gridTemplateColumns: "500px auto" }} key={`item_${i}`}>
                    <label style={{ marginLeft: `${indent}px`, padding: "5px" }}>{trimmedStr}</label>
                </div >
            );
            list.push(elem);
        });

        return list;
    }

    render() {
        return (
            <div className={this.classes.root}>
                <h2>Fluid SharedMap Sample</h2>
                <div>
                    <label>Xml file: </label>
                    <input type="text" id="file" name="file" defaultValue="test-35k.xml" style={{ width: "500px" }} />
                    <input type="submit" id="open" value="Open" onClick={() => this.openClicked()} />
                </div>
                <br />
                <div>
                    <label>Load option: </label>
                    <input type="radio" id="synchronous" name="load_option_group" defaultChecked={true} onClick={(e: any) => this.radioClicked(e)} />
                    <label>Synchronous</label>
                    <input type="radio" id="asynchronous" name="load_option_group" defaultChecked={false} onClick={(e: any) => this.radioClicked(e)} />
                    <label>Asynchronous</label>
                </div>
                <br />
                <br />
                <div>
                    {this.state.loading}
                </div>
                <br />
                {this.state.loadError ?
                    (<div>
                        {this.state.loadError}
                    </div>)
                    :
                    this.state.dataStrings ?
                        (<div>
                            {this.getMapItemsAsString(this.state.dataStrings || [])}
                        </div>)
                        :
                        <div></div>
                }
            </div>)
    }
};

export async function safe_getContainer(documentId: string) {
    let container = undefined;
    try {
        //try to fetch the container assuming it exists
        container = await getContainer(documentId, CommandQueueContainerRuntimeFactory, false, BackendType.TINYLICIOUS);
        console.info(`Container already exists for id ${documentId}`);
    } catch (error) {
        console.info(`Container not found for id ${documentId}. Creating it.`);
    }
    if (container === undefined) {
        try {
            //try to fetch the container by creating it
            container = await getContainer(documentId, CommandQueueContainerRuntimeFactory, true, BackendType.TINYLICIOUS);
            console.info(`Container created successfully for id ${documentId}`);
        } catch (error) {
            console.info(`Failed to create container or id ${documentId}: ${error}\n${error.stack}`);
        }
    }

    return container;
}

async function loadDocument(file: string, loadOption: LoadOption): Promise<string> {
    const asynchronous = loadOption === LoadOption.Asynchronous;
    const url = `http://localhost:3000/api/load?file=${file}${asynchronous ? "&async=true" : ""}`
    const response = await fetch(url);
    if (response.status === 200) {
        const res = await response.json();
        const docId = res?.documentId;
        return docId;
    } else {
        console.error(`Failed to load document: ${response.status} ${response.statusText}: ${response.text}`);
        return "";
    }
}

async function getDataObject(docId: string): Promise<ISampleDataObject | undefined> {
    const container = await safe_getContainer(docId);
    if (!container) {
        console.error("Failed to get container:");
        return undefined;
    }

    return getDefaultObjectFromContainer<ISampleDataObject>(container);
}

async function renderApp() {
    ReactDOM.render(<App />, document.getElementById("root"));
}

renderApp();
