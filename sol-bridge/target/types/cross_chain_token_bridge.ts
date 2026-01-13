/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/cross_chain_token_bridge.json`.
 */
export type CrossChainTokenBridge = {
  "address": "9He8p6qdDUbHu6HLwmQhHfzA4cfrd5uc2udYGHcabbHv",
  "metadata": {
    "name": "crossChainTokenBridge",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "create",
      "discriminator": [
        24,
        30,
        200,
        40,
        5,
        28,
        7,
        119
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "validityProof"
            }
          }
        },
        {
          "name": "addressMerkleContext",
          "type": {
            "defined": {
              "name": "packedAddressMerkleContext"
            }
          }
        },
        {
          "name": "outputMerkleTreeIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "delete",
      "discriminator": [
        165,
        204,
        60,
        98,
        134,
        15,
        83,
        134
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "validityProof"
            }
          }
        },
        {
          "name": "counterValue",
          "type": "u64"
        },
        {
          "name": "accountMeta",
          "type": {
            "defined": {
              "name": "compressedAccountMeta"
            }
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "bridgeState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenBridge",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  98
                ]
              },
              {
                "kind": "arg",
                "path": "linkHash"
              }
            ]
          }
        },
        {
          "name": "tokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "validityProof"
            }
          }
        },
        {
          "name": "addressMerkleContext",
          "type": {
            "defined": {
              "name": "packedAddressMerkleContext"
            }
          }
        },
        {
          "name": "outputMerkleTreeIndex",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "linkHash",
          "type": "string"
        },
        {
          "name": "destChainAddr",
          "type": "string"
        }
      ]
    },
    {
      "name": "depositToVault",
      "discriminator": [
        18,
        62,
        110,
        8,
        26,
        106,
        248,
        151
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "increment",
      "discriminator": [
        11,
        18,
        104,
        9,
        104,
        174,
        59,
        33
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "validityProof"
            }
          }
        },
        {
          "name": "counterValue",
          "type": "u64"
        },
        {
          "name": "accountMeta",
          "type": {
            "defined": {
              "name": "compressedAccountMeta"
            }
          }
        }
      ]
    },
    {
      "name": "init",
      "discriminator": [
        220,
        59,
        207,
        236,
        108,
        250,
        47,
        100
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initTokenBridge",
      "discriminator": [
        59,
        136,
        122,
        200,
        237,
        46,
        18,
        97
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenBridge",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  98
                ]
              },
              {
                "kind": "arg",
                "path": "linkHash"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "sourceChain",
          "type": "u32"
        },
        {
          "name": "sourceChainMintAddr",
          "type": "string"
        },
        {
          "name": "destChain",
          "type": "u32"
        },
        {
          "name": "destChainMintAddr",
          "type": "string"
        },
        {
          "name": "linkHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "initWithdrawalProofAccount",
      "discriminator": [
        79,
        210,
        64,
        124,
        8,
        168,
        35,
        56
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "withdrawalProof",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                  95,
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "arg",
                "path": "nullifier"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "withdrawalId",
          "type": "u128"
        },
        {
          "name": "proofA",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "proofB",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "proofC",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "nullifier",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "newRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "relayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "withdrawalProof",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                  95,
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "arg",
                "path": "nullifier"
              }
            ]
          }
        },
        {
          "name": "bridgeState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tokenBridge",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  98
                ]
              },
              {
                "kind": "arg",
                "path": "linkHash"
              }
            ]
          }
        },
        {
          "name": "tokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "recipient"
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "validityProof"
            }
          }
        },
        {
          "name": "addressMerkleContext",
          "type": {
            "defined": {
              "name": "packedAddressMerkleContext"
            }
          }
        },
        {
          "name": "outputMerkleTreeIndex",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "linkHash",
          "type": "string"
        },
        {
          "name": "nullifier",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bridgeState",
      "discriminator": [
        6,
        190,
        226,
        198,
        76,
        100,
        157,
        198
      ]
    },
    {
      "name": "tokenBridge",
      "discriminator": [
        95,
        34,
        29,
        44,
        150,
        108,
        22,
        110
      ]
    },
    {
      "name": "withdrawalProof",
      "discriminator": [
        195,
        196,
        240,
        23,
        21,
        218,
        171,
        194
      ]
    }
  ],
  "events": [
    {
      "name": "counterCompressedAccount",
      "discriminator": [
        94,
        7,
        45,
        159,
        47,
        69,
        150,
        227
      ]
    },
    {
      "name": "depositEvent",
      "discriminator": [
        120,
        248,
        61,
        83,
        31,
        142,
        107,
        144
      ]
    },
    {
      "name": "depositRecordCompressedAccount",
      "discriminator": [
        234,
        85,
        237,
        213,
        90,
        97,
        79,
        36
      ]
    },
    {
      "name": "withdrawalRecordCompressedAccount",
      "discriminator": [
        183,
        128,
        252,
        28,
        201,
        204,
        13,
        134
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "depositAmountShouldBeGreaterThanZero",
      "msg": "depositAmountShouldBeGreaterThanZero"
    },
    {
      "code": 6001,
      "name": "withdrawAmountShouldBeGreaterThanZero",
      "msg": "withdrawAmountShouldBeGreaterThanZero"
    },
    {
      "code": 6002,
      "name": "invalidProofData",
      "msg": "Invalid Proof Data"
    },
    {
      "code": 6003,
      "name": "groth16VerificationFailed",
      "msg": "Groth16 Verification Failed"
    },
    {
      "code": 6004,
      "name": "invalidArgs",
      "msg": "Invalid args"
    }
  ],
  "types": [
    {
      "name": "bridgeState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositCount",
            "type": "u128"
          },
          {
            "name": "withdrawCount",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "compressedAccountMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merkleContext",
            "docs": [
              "Merkle tree context."
            ],
            "type": {
              "defined": {
                "name": "packedMerkleContext"
              }
            }
          },
          {
            "name": "address",
            "docs": [
              "Address."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "rootIndex",
            "docs": [
              "Root index."
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "outputMerkleTreeIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "compressedProof",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "b",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "c",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "counterCompressedAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "counter",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "depositRecordCompressedAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "sourceChainId",
            "type": "u32"
          },
          {
            "name": "destChainId",
            "type": "u32"
          },
          {
            "name": "destChainAddr",
            "type": "string"
          },
          {
            "name": "destChainMintAddr",
            "type": "string"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "depositId",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "packedAddressMerkleContext",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addressMerkleTreePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "addressQueuePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "rootIndex",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "packedMerkleContext",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merkleTreePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "queuePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "leafIndex",
            "type": "u32"
          },
          {
            "name": "proveByIndex",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tokenBridge",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sourceChain",
            "type": "u32"
          },
          {
            "name": "sourceChainMintAddr",
            "type": "string"
          },
          {
            "name": "destChain",
            "type": "u32"
          },
          {
            "name": "destChainMintAddr",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "validityProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "option": {
              "defined": {
                "name": "compressedProof"
              }
            }
          }
        ]
      }
    },
    {
      "name": "withdrawalProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proofA",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "proofB",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "proofC",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "nullifier",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "newRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "withdrawalRecordCompressedAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositer",
            "type": "string"
          },
          {
            "name": "sourceChainId",
            "type": "u64"
          },
          {
            "name": "destChainId",
            "type": "u64"
          },
          {
            "name": "destChainAddr",
            "type": "pubkey"
          },
          {
            "name": "destChainMintAddr",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "withdrawalId",
            "type": "u128"
          }
        ]
      }
    }
  ]
};
