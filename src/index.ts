import express from 'express';
import http from 'http';
import { getDefaultObjectFromContainer } from '@fluidframework/aqueduct';
import { BackendType, getContainer } from './fluid/init';
import { ISampleDataObject } from './fluid/dataObject';
import { CommandQueueContainerRuntimeFactory } from './fluid/containerCode';
import { readFromFile } from './fs-util';
import { SharedMap } from '@fluidframework/map';
const path = require('path');

interface DocumentInfo {
  docId: string;
  file: string;
  loadAsync?: boolean;
  dataObj?: ISampleDataObject;
  sharedMap?: SharedMap;
}

const app = express();
app.use('/app', express.static(path.join(__dirname, 'app')));

console.log('Serving from', path.join(__dirname, 'app'));

const server = http.createServer(app);
let xmlDocuments: Map<string, DocumentInfo> = new Map<string, DocumentInfo>();
export const DOCUMENT_ID = 'UserIndexPropertyDDS';

export async function safe_getContainer(documentId: string) {
  let container = undefined;
  try {
    //try to fetch the container assuming it exists
    container = await getContainer(
      documentId,
      CommandQueueContainerRuntimeFactory,
      false,
      BackendType.TINYLICIOUS
    );
    console.info(`Container already exists for id ${documentId}`);
  } catch (error) {
    console.info(`Container not found for id ${documentId}. Creating it.`);
  }
  if (container === undefined) {
    try {
      //try to fetch the container by creating it
      container = await getContainer(
        documentId,
        CommandQueueContainerRuntimeFactory,
        true,
        BackendType.TINYLICIOUS
      );
      console.info(`Container created successfully for id ${documentId}`);
    } catch (error) {
      console.info(
        `Failed to create container or id ${documentId}: ${error}\n${error.stack}`
      );
    }
  }

  return container;
}

async function loadDocument(file: string, loadAsync: boolean): Promise<string> {
  file = path.join('../test', file);
  file = path.resolve(__dirname, file);

  let docInfo: DocumentInfo | undefined;
  xmlDocuments.forEach((docInfo2) => {
    if (
      file.toLowerCase() === docInfo2.file.toLowerCase() &&
      docInfo2.loadAsync === loadAsync
    ) {
      docInfo = docInfo2;
    }
  });

  if (docInfo?.docId && docInfo.sharedMap) {
    console.info(`File already loaded`);
    return docInfo.docId;
  } else {
    docInfo = {
      docId: generateUUID(),
      file,
      loadAsync,
      dataObj: undefined,
    };
  }

  const container = await safe_getContainer(docInfo.docId);
  if (container) {
    docInfo.dataObj = await getDefaultObjectFromContainer<ISampleDataObject>(
      container
    );
  }

  if (!docInfo.dataObj) {
    return '';
  }

  xmlDocuments.set(docInfo.docId, docInfo);

  await loadXml(docInfo, loadAsync);

  return docInfo.docId;
}

async function loadXml(
  docInfo: DocumentInfo,
  loadAsync: boolean
): Promise<boolean> {
  if (!docInfo.dataObj) {
    return false;
  }

  console.info(`Loading xml file ${docInfo.file}`);

  console.info(`Reading xml file`);
  const start = new Date().getTime();
  let ret = false;
  let end: number;
  const content = readFromFile(docInfo.file, true);
  if (content) {
    end = new Date().getTime();
    console.info(`Read xml file in ${end - start} ms`);

    docInfo.sharedMap = await docInfo.dataObj.createSharedMapRoot();
    ret = !!docInfo.sharedMap;

    if (loadAsync) {
      // Load asynchronously
      console.info(`Starting to load xml asynchronously`);
      docInfo.dataObj.loadXmlIntoSharedMap(content);
    } else {
      // Load synchronously
      console.info(`Loading xml synchronously`);
      ret = await docInfo.dataObj.loadXmlIntoSharedMap(content);
    }
  } else {
    console.error(`Failed to read xml file: ${docInfo.file}`);
  }

  if (!ret) {
    console.error(`Failed to load xml file: ${docInfo.file}`);
  }

  return ret;
}

function generateUUID() {
  return new Date().getTime().toString();
}

app.get('/api/load', async (req, res) => {
  let file = req?.query.file?.toString();
  if (!file) {
    res.status(400).send('File not specified');
  }
  let loadAsync = req?.query.async
    ? req.query.async?.toString() !== 'false'
    : false;

  const docId = await loadDocument(file!, loadAsync);

  if (docId) {
    console.info(`Returning document id: ${docId}`);
    res.send({ documentId: docId });
  } else {
    res.status(400).send('Failed to load file');
  }
});

async function main() {
  server.listen(3000, () => {
    console.log('listening on *:3000');
  });
}

main();
