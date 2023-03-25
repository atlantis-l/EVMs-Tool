import { notification } from 'ant-design-vue'
import { AbiItem } from 'web3-utils';

export interface Data {
    fields: string[] | undefined,
    data: string[][] | undefined
}

const sleep = (count: number, step: number = 100, ms: number = 5000): Promise<unknown> | void => {
    if (count % step === 0 && count !== 0) {
        return new Promise((r) => setTimeout(r, ms));
    }
}

const message = (type: 'warning' | 'error' | 'info' | 'success', message: string, description: string | undefined): void => {
    notification[type]({
        message: message,
        description: description,
        duration: 5,
        placement: 'bottomRight'
    })
}

const convertDecimalsToUnit = (decimals: string) => {
    switch (decimals) {
        case '9':
            return 'gwei'
        case '18':
            return 'ether'
    }
}

const abi: AbiItem[] = [
    {
        "constant": false,
        "inputs": [{ "name": "spender", "type": "address" }, { "name": "value", "type": "uint256" }],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{ "name": "recipient", "type": "address" }, { "name": "amount", "type": "uint256" }],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

export { sleep, message, abi, convertDecimalsToUnit }
