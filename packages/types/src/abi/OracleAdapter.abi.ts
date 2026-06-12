// AUTO-GENERATED — do not edit.
export const OracleAdapterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "pyth_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_STALENESS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUpdateFee",
    "inputs": [
      {
        "name": "priceUpdate",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pyth",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPyth"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "readNoOlderThan",
    "inputs": [
      {
        "name": "feedId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "staleness",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct PythStructs.Price",
        "components": [
          {
            "name": "price",
            "type": "int64",
            "internalType": "int64"
          },
          {
            "name": "conf",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "expo",
            "type": "int32",
            "internalType": "int32"
          },
          {
            "name": "publishTime",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateAndRead",
    "inputs": [
      {
        "name": "feedId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "priceUpdate",
        "type": "bytes[]",
        "internalType": "bytes[]"
      },
      {
        "name": "staleness",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "price",
        "type": "tuple",
        "internalType": "struct PythStructs.Price",
        "components": [
          {
            "name": "price",
            "type": "int64",
            "internalType": "int64"
          },
          {
            "name": "conf",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "expo",
            "type": "int32",
            "internalType": "int32"
          },
          {
            "name": "publishTime",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "event",
    "name": "PriceRead",
    "inputs": [
      {
        "name": "feedId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "price",
        "type": "int64",
        "indexed": false,
        "internalType": "int64"
      },
      {
        "name": "publishTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "FeeMismatch",
    "inputs": [
      {
        "name": "sent",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "required",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PriceTooStale",
    "inputs": [
      {
        "name": "feedId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "publishTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "now_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const;
