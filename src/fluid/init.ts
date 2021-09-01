//import TinyliciousClient, { TinyliciousConnectionConfig } from "@fluid-experimental/tinylicious-client";
import { RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver";
import { getContainer as getFluidContainer } from "@fluid-experimental/get-container";
import { InsecureTinyliciousUrlResolver } from "@fluidframework/tinylicious-driver";
import { InsecureTinyliciousTokenProvider } from "@fluidframework/tinylicious-driver";
import { IRuntimeFactory } from "@fluidframework/container-definitions";

export enum BackendType {
    TINYLICIOUS,
    ROUTERLICIOUS,
    FRS
}

export async function getContainer(documentId: string, containerRuntimeFactory: IRuntimeFactory, newContainer: boolean, backend: BackendType) {
    switch (backend) {
        case BackendType.TINYLICIOUS:
            const tokenProvider = new InsecureTinyliciousTokenProvider();
            const documentServiceFactory = new RouterliciousDocumentServiceFactory(tokenProvider);

            // the hotfixed version allows passing in an endpoint
            const urlResolver = new InsecureTinyliciousUrlResolver(7070, "http://127.0.0.1");
            const containerService = {
                documentServiceFactory,
                urlResolver,
            };
            return getFluidContainer(
                containerService,
                documentId,
                containerRuntimeFactory,
                newContainer,
            );
        default:
            throw Error("Backend not yet supported")
    }
}

