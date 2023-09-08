import { notification } from "ant-design-vue";
import { AbiItem } from "web3-utils";

export interface Data {
  fields: string[] | undefined;
  data: string[][] | undefined;
}

const sleep = (
  count: number,
  step: number = 100,
  ms: number = 5000
): Promise<unknown> | void => {
  if (count % step === 0 && count !== 0) {
    return new Promise((r) => setTimeout(r, ms));
  }
};

const message = (
  type: "warning" | "error" | "info" | "success",
  message: string,
  description: string | undefined
): void => {
  notification[type]({
    message: message,
    description: description,
    duration: 5,
    placement: "bottomRight",
  });
};

const convertDecimalsToUnit = (decimals: string) => {
  switch (decimals) {
    case "0":
      return "wei";
    case "3":
      return "kwei";
    case "6":
      return "mwei";
    case "9":
      return "gwei";
    case "12":
      return "microether";
    case "15":
      return "milliether";
    case "18":
      return "ether";
  }
};

const abi: AbiItem[] = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

const nft_abi: AbiItem[] = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const os_abi: AbiItem[] = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "enum ConduitItemType",
                name: "itemType",
                type: "uint8",
              },
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint256", name: "identifier", type: "uint256" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            internalType: "struct TransferHelperItem[]",
            name: "items",
            type: "tuple[]",
          },
          { internalType: "address", name: "recipient", type: "address" },
          {
            internalType: "bool",
            name: "validateERC721Receiver",
            type: "bool",
          },
        ],
        internalType: "struct TransferHelperItemsWithRecipient[]",
        name: "items",
        type: "tuple[]",
      },
      { internalType: "bytes32", name: "conduitKey", type: "bytes32" },
    ],
    name: "bulkTransfer",
    outputs: [{ internalType: "bytes4", name: "magicValue", type: "bytes4" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const erc1155_abi: AbiItem[] = [
  {
    inputs: [
      { internalType: "address[]", name: "accounts", type: "address[]" },
      { internalType: "uint256[]", name: "ids", type: "uint256[]" },
    ],
    name: "balanceOfBatch",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
];

export {
  sleep,
  message,
  abi,
  nft_abi,
  os_abi,
  erc1155_abi,
  convertDecimalsToUnit,
};
