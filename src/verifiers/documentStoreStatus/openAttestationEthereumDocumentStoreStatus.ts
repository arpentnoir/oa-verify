import { utils, getData, v2, v3, WrappedDocument } from "@govtechsg/open-attestation";
import { DocumentStoreFactory } from "@govtechsg/document-store";
import { DocumentStore } from "@govtechsg/document-store/src/contracts/DocumentStore";
import { Hash, VerificationFragmentType, VerificationFragment, Verifier } from "../../types/core";
import { OpenAttestationEthereumDocumentStoreStatusCode } from "../../types/error";
import { contractNotIssued, getErrorReason, contractRevoked } from "./errors";
import { getIssuersDocumentStore, getProvider } from "../../common/utils";

interface IssuanceStatus {
  issued: boolean;
  address: string;
  reason?: any;
}

interface RevocationStatus {
  revoked: boolean;
  address: string;
  reason?: any;
}

export interface DocumentStoreStatusFragment {
  issuedOnAll: boolean;
  revokedOnAny?: boolean;
  details: {
    issuance: IssuanceStatus | IssuanceStatus[];
    revocation?: RevocationStatus | RevocationStatus[];
  };
}

const name = "OpenAttestationEthereumDocumentStoreStatus";
const type: VerificationFragmentType = "DOCUMENT_STATUS";

const getIntermediateHashes = (targetHash: Hash, proofs: Hash[] = []) => {
  const hashes = [`0x${targetHash}`];
  proofs.reduce((prev, curr) => {
    const next = utils.combineHashString(prev, curr);
    hashes.push(`0x${next}`);
    return next;
  }, targetHash);
  return hashes;
};

// Given a list of hashes, check against one smart contract if any of the hash has been revoked
export const isAnyHashRevoked = async (smartContract: DocumentStore, intermediateHashes: Hash[]) => {
  const revokedStatusDeferred = intermediateHashes.map((hash) =>
    smartContract.isRevoked(hash).then((status) => (status ? hash : undefined))
  );
  const revokedStatuses = await Promise.all(revokedStatusDeferred);
  return revokedStatuses.find((hash) => hash);
};

const isWrappedV2Document = (document: any): document is WrappedDocument<v2.OpenAttestationDocument> => {
  return document.data && document.data.issuers;
};
export const openAttestationEthereumDocumentStoreStatus: Verifier<
  WrappedDocument<v2.OpenAttestationDocument> | WrappedDocument<v3.OpenAttestationDocument>
> = {
  skip: () => {
    return Promise.resolve({
      status: "SKIPPED",
      type,
      name,
      reason: {
        code: OpenAttestationEthereumDocumentStoreStatusCode.SKIPPED,
        codeString:
          OpenAttestationEthereumDocumentStoreStatusCode[OpenAttestationEthereumDocumentStoreStatusCode.SKIPPED],
        message: `Document issuers doesn't have "documentStore" or "certificateStore" property or ${v3.Method.DocumentStore} method`,
      },
    });
  },
  test: (document) => {
    if (utils.isWrappedV3Document(document)) {
      const documentData = getData(document);
      return documentData.proof.method === v3.Method.DocumentStore;
    } else if (isWrappedV2Document(document)) {
      const documentData = getData(document);
      return documentData.issuers.some((issuer) => "documentStore" in issuer || "certificateStore" in issuer);
    }
    return false;
  },
  verify: async (document, options): Promise<VerificationFragment<DocumentStoreStatusFragment>> => {
    try {
      const documentStores = getIssuersDocumentStore(document);
      const merkleRoot = `0x${document.signature.merkleRoot}`;
      const { targetHash } = document.signature;
      const proofs = document.signature.proof || [];

      const issuanceStatuses: IssuanceStatus[] = await Promise.all(
        documentStores.map(async (documentStore) => {
          try {
            const documentStoreContract = await DocumentStoreFactory.connect(documentStore, getProvider(options));
            const issued = await documentStoreContract.isIssued(merkleRoot);
            const status: IssuanceStatus = {
              issued,
              address: documentStore,
            };
            if (!issued) {
              status.reason = contractNotIssued(merkleRoot, documentStore);
            }
            return status;
          } catch (e) {
            return { issued: false, address: documentStore, reason: getErrorReason(e, documentStore) };
          }
        })
      );
      const notIssued = issuanceStatuses.find((status) => !status.issued);
      if (notIssued) {
        return {
          name,
          type,
          data: {
            issuedOnAll: false,
            details: utils.isWrappedV3Document(document)
              ? { issuance: issuanceStatuses[0] }
              : { issuance: issuanceStatuses },
          },
          reason: notIssued.reason,
          status: "INVALID",
        };
      }

      const revocationStatuses: RevocationStatus[] = await Promise.all(
        documentStores.map(async (documentStore) => {
          try {
            const documentStoreContract = await DocumentStoreFactory.connect(documentStore, getProvider(options));
            const intermediateHashes = getIntermediateHashes(targetHash, proofs);
            const revokedHash = await isAnyHashRevoked(documentStoreContract, intermediateHashes);

            const status: RevocationStatus = {
              revoked: !!revokedHash,
              address: documentStore,
            };
            if (revokedHash) {
              status.reason = contractRevoked(merkleRoot, documentStore);
            }
            return status;
          } catch (e) {
            return { revoked: true, address: documentStore, reason: getErrorReason(e, documentStore) };
          }
        })
      );
      const revoked = revocationStatuses.find((status) => status.revoked);
      return {
        name,
        type,
        data: {
          issuedOnAll: true,
          revokedOnAny: !!revoked,
          details: utils.isWrappedV3Document(document)
            ? { issuance: issuanceStatuses[0], revocation: revocationStatuses[0] }
            : { issuance: issuanceStatuses, revocation: revocationStatuses },
        },
        ...(revoked ? { reason: revoked.reason } : {}),
        status: revoked ? "INVALID" : "VALID",
      };
    } catch (e) {
      return {
        name,
        type,
        data: e,
        reason: {
          message: e.message,
          code: OpenAttestationEthereumDocumentStoreStatusCode.UNEXPECTED_ERROR,
          codeString:
            OpenAttestationEthereumDocumentStoreStatusCode[
              OpenAttestationEthereumDocumentStoreStatusCode.UNEXPECTED_ERROR
            ],
        },
        status: "ERROR",
      };
    }
  },
};
