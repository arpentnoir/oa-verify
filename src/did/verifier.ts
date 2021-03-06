import { PublicKey } from "did-resolver";
import { utils } from "ethers";
import { getPublicKey } from "./resolver";
import { Reason, OpenAttestationSignatureCode } from "../types/error";
import { CodedError } from "../common/error";

export interface ValidDidVerificationStatus {
  verified: true;
  did: string;
}

export interface InvalidDidVerificationStatus {
  verified: false;
  did: string;
  reason: Reason;
}

export type DidVerificationStatus = ValidDidVerificationStatus | InvalidDidVerificationStatus;

interface VerifySignature {
  did: string;
  signature: string;
  merkleRoot: string;
  publicKey: PublicKey;
}

export const verifySecp256k1VerificationKey2018 = ({
  did,
  publicKey,
  merkleRoot,
  signature,
}: VerifySignature): DidVerificationStatus => {
  const messageBytes = utils.arrayify(merkleRoot);
  const { ethereumAddress } = publicKey;
  if (!ethereumAddress) {
    return {
      did,
      verified: false,
      reason: {
        code: OpenAttestationSignatureCode.KEY_MISSING,
        codeString: OpenAttestationSignatureCode[OpenAttestationSignatureCode.KEY_MISSING],
        message: `ethereumAddress not found on public key ${JSON.stringify(publicKey)}`,
      },
    };
  }

  const merkleRootSigned = utils.verifyMessage(messageBytes, signature).toLowerCase() === ethereumAddress.toLowerCase();
  if (!merkleRootSigned) {
    return {
      did,
      verified: false,
      reason: {
        code: OpenAttestationSignatureCode.WRONG_SIGNATURE,
        codeString: OpenAttestationSignatureCode[OpenAttestationSignatureCode.WRONG_SIGNATURE],
        message: `merkle root is not signed correctly by ${ethereumAddress}`,
      },
    };
  }

  return {
    did,
    verified: true,
  };
};

export const verifySignature = async ({
  key,
  merkleRoot,
  signature,
  did,
}: {
  key: string;
  merkleRoot: string;
  did: string;
  signature: string;
}): Promise<DidVerificationStatus> => {
  const publicKey = await getPublicKey(did, key);
  if (!publicKey)
    throw new CodedError(
      `No public key found on DID document for the DID ${did} and key ${key}`,
      OpenAttestationSignatureCode.KEY_NOT_IN_DID,
      "KEY_NOT_IN_DID"
    );
  switch (publicKey.type) {
    case "Secp256k1VerificationKey2018":
      return verifySecp256k1VerificationKey2018({
        did,
        publicKey,
        merkleRoot,
        signature,
      });
    default:
      throw new CodedError(
        `Signature type ${publicKey.type} is currently not support`,
        OpenAttestationSignatureCode.UNSUPPORTED_KEY_TYPE,
        "UNSUPPORTED_KEY_TYPE"
      );
  }
};
