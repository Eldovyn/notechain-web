import type { Abi } from "abitype";

export const noteChainAbi = [
    {
        "type": "error",
        "name": "EmptyContent",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptySummary",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyTags",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyTitle",
        "inputs": []
    },
    {
        "type": "event",
        "name": "NoteAdded",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address",
                "indexed": true
            },
            {
                "name": "id",
                "type": "uint256",
                "internalType": "uint256",
                "indexed": true
            },
            {
                "name": "title",
                "type": "string",
                "internalType": "string",
                "indexed": false
            },
            {
                "name": "summary",
                "type": "string",
                "internalType": "string",
                "indexed": false
            },
            {
                "name": "tags",
                "type": "string[]",
                "internalType": "string[]",
                "indexed": false
            },
            {
                "name": "createdAt",
                "type": "uint256",
                "internalType": "uint256",
                "indexed": false
            },
            {
                "name": "updatedAt",
                "type": "uint256",
                "internalType": "uint256",
                "indexed": false
            }
        ],
        "anonymous": false
    },
    {
        "type": "function",
        "name": "createNote",
        "stateMutability": "nonpayable",
        "inputs": [
            {
                "name": "_title",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_content",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_summary",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_tags",
                "type": "string[]",
                "internalType": "string[]"
            }
        ],
        "outputs": [
            {
                "name": "id",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getNote",
        "stateMutability": "view",
        "inputs": [
            {
                "name": "id",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "note",
                "type": "tuple",
                "components": [
                    {
                        "name": "id",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "title",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "content",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "summary",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "tags",
                        "type": "string[]",
                        "internalType": "string[]"
                    },
                    {
                        "name": "createdAt",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "updatedAt",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ],
                "internalType": "struct NoteChain.Note"
            }
        ]
    },
    {
        "type": "function",
        "name": "getNotes",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {
                "name": "notes",
                "type": "tuple[]",
                "components": [
                    {
                        "name": "id",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "title",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "content",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "summary",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "tags",
                        "type": "string[]",
                        "internalType": "string[]"
                    },
                    {
                        "name": "createdAt",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "updatedAt",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ],
                "internalType": "struct NoteChain.Note[]"
            }
        ]
    }
] as const satisfies Abi;
