import { v3, WrappedDocument, SchemaId } from "@govtechsg/open-attestation";

export const documentRopstenTampered: WrappedDocument<v3.OpenAttestationDocument> = {
  version: SchemaId.v3,
  data: {
    reference: "8354acc7-74ab-4cab-be1c-1bf1e10a6920:string:ABCXXXXX00",
    name: "1c1df86c-168e-4519-805b-f38698e5b00e:string:Certificate of whatever",
    template: {
      name: "a63b3426-3aeb-4f99-a88c-18c99940e108:string:CUSTOM_TEMPLATE",
      type: "514a184c-c68c-42dd-816a-133d58dad24d:string:TEMPERED_VALUE",
      url: "cabe4859-a1e6-4394-a88f-4a3bb30e05ae:string:http://localhost:3000/rederer"
    },
    validFrom: "b72d0f94-e7a0-47b8-bbb2-91bc7397c406:string:2018-08-30T00:00:00+08:00",
    proof: {
      type: "0a9e819c-1e18-4c6e-bd2b-0d34e97e3d27:string:OpenAttestationSignature2018",
      method: "006b1ad2-c284-4373-9742-b83ab97bf173:string:DOCUMENT_STORE",
      value: "434d9cf9-5ce1-4ac0-a960-4badd935834c:string:0x8Fc57204c35fb9317D91285eF52D6b892EC08cD3"
    },
    issuer: {
      id: "dca00886-d384-4218-bbf5-9699f2a6f274:string:https://example.com",
      name: "d8b5c027-69ce-4c6d-93e0-ef72da26ae36:string:Issuer name",
      identityProof: {
        type: "1c5ce8f4-7fcc-4285-9d33-5d3c38c53ad1:string:DNS-TXT",
        location: "79009458-fdd6-42fe-a3b9-d13ac8d4ca91:string:some.io"
      }
    }
  },
  privacy: {
    obfuscatedData: []
  },
  signature: {
    type: "SHA3MerkleProof",
    targetHash: "7f42e288dfdb20e7f9a62329adf1f3ad8eed0345a2c517ee7af3e9e88d02a5cd",
    proof: [],
    merkleRoot: "7f42e288dfdb20e7f9a62329adf1f3ad8eed0345a2c517ee7af3e9e88d02a5cd"
  }
};
