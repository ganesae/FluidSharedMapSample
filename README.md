# Fluid SharedMap sample for performance issue

This sample demonstrates performance issues with SharedMap and SharedObjectSequence. The objective of the application is to use fluid framework to collaborativly edit existing xml documents.

## Sample app

In the UI when you click open it makes a REST api call to the backend to get the document id. Backend loads the file, builds DDS objects and returns the doc id. Client connects to fluid, gets the DDS objects and displays the contents.

1. Backend server: Loads xml file and converts the xml into DDS objects SharedMap and SharedObjectSequence.
2. Browser client: Connects to fluid, reads the DDS root object, stringifies the objects and displays it in the page.

The sample implements both synchronous and asynchronous loading of the xml file in backend (controlled by a radio button in the UI).

In synchronous loading the backend loads the xml and converts it into DDS objects before returning the document id.

In asynchronous loading the backend starts loading the xml, creates only the root shared map and returns the document id immediately.

## Performance Issue:

The total time taken for the above (from clicking open to getting all the data in the client) is 1.4s for 35 KB file, 27s for 278 KB file, and 140s for 1.6 MB file. The test was done using local servers.

Detailed performance data is in the excel file `test/SharedMap performance.xlsx`.

## Setup

### Setup Tinylicious

Since Tinylicious has a limitation in raw body size in http requests we need to fix it by making code change. Here is how to do it:

1. Clone Microsoft Fluid Framework from https://github.com/microsoft/FluidFramework. Checkout commit e7c9b1fa769f666e1caae26cb069fabd6ecf9c60 since latest version has another bug which causes an endless stream of `error: Invalid message sequence number...` messages.
2. Open the file <fluid-framework>/server/tinylicious/src/app.ts and add the following line in `create` function:

   `app.use(bodyParser.raw({ limit: requestSize }));`

3. Cd to folder `server/tinylicious`
4. Build tinylicious: `npm run tsc`.
5. Start tinylicious server: `node dist\index.js`

### Setup the sample

1. Clone this repo and cd to the cloned git folder
2. `npm install`
3. `npm run build`
4. `npm run start`
5. Start the browser and navigate to http://localhost:3000/app.
6. Enter any of xml files located under `<git-root>/test` folder in the file text box and click open. It will load the xml and display a dump of the SharedMap contents.
