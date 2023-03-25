import { defineStore } from 'pinia'
import { message } from '../common/index'
import Web3 from 'web3'

const TIMEOUT = 10000

export default defineStore('store', {
  state: () => ({
    provider: process.env['provider'],
    mainnet: process.env['mainnet'],
    providers: {
      ETH: 'https://rpc.ankr.com/eth',
      BSC: 'https://rpc.ankr.com/bsc',
      Polygon: 'https://rpc.ankr.com/polygon',
      Fantom: 'https://rpc.ankr.com/fantom',
      Avalanche: 'https://rpc.ankr.com/avalanche',
      Arbitrum: 'https://rpc.ankr.com/arbitrum',
      Optimism: 'https://rpc.ankr.com/optimism'
    },
    //@ts-ignore
    _web: new Web3(new Web3.providers.HttpProvider(process.env['provider'], {
      keepAlive: true,
      timeout: TIMEOUT //请求超时ms
    })),
    tokenType: process.env['tokenType'],
    showTokenType: false,
    showMainnet: false,
    currentPath: process.env['currentPath'],
    selectedKeys: process.env['selectedKeys']?.split(','),
    menuFoldState: process.env['menuFoldState'],
    currentGasPrice: '',
    maxPriorityFeePerGas: '2.5',
    txHash: {
      oneToOne: process.env['txHash.oneToOne']?.split(',')[0].length === 0 ? [] : process.env['txHash.oneToOne']?.split(',')
    }
  }),
  actions: {
    changeMainnet(provider: 'ETH' | 'BSC' | 'Polygon' | 'Fantom' | 'Avalanche' | 'Arbitrum' | 'Optimism') {
      process.env['mainnet'] = provider
      process.env['provider'] = this.providers[provider]
      this.provider = process.env['provider']
      this.mainnet = process.env['mainnet']
      message('success', `主网切换(${this.mainnet})`, this.provider)
    },
    changeCustomMainnet(provider: string | undefined): boolean {
      if (provider === undefined || provider.trim().length === 0) {
        message('warning', '主网切换(自定义)', '切换失败, 检查输入链接...')
        return false
      }
      process.env['mainnet'] = '自定义'
      process.env['provider'] = provider
      this.provider = process.env['provider']
      this.mainnet = process.env['mainnet']
      message('success', `主网切换(${this.mainnet})`, this.provider)
      return true
    },
    changeShowTokenType(flag: boolean) {
      this.showTokenType = flag
    },
    changeShowMainnet(flag: boolean) {
      this.showMainnet = flag
    },
    changeTokenType(type: string) {
      process.env['tokenType'] = type
      this.tokenType = process.env['tokenType']
      message('success', `代币切换`, this.tokenType)
    },
    changeCurrentPath(path: string) {
      process.env['currentPath'] = path
      this.currentPath = process.env['currentPath']
    },
    changeSelectedKeys(selectedKeys: string[]) {
      //@ts-ignore
      process.env['selectedKeys'] = selectedKeys
      //@ts-ignore
      this.selectedKeys = process.env['selectedKeys']?.split(',')
    },
    changeMenuFoldState(state: string) {
      process.env['menuFoldState'] = state
      this.menuFoldState = process.env['menuFoldState']
    },
    changeCurrentGasPrice(gasPrice: string) {
      this.currentGasPrice = gasPrice
    },
    addTxHash(path: string, txHash: string) {
      //@ts-ignore
      this.txHash[path.split('.')[1]].push(txHash)
      //@ts-ignore
      process.env[path] = this.txHash[path.split('.')[1]]
    }
  },
  getters: {
    web3: (state) => {
      //@ts-ignore
      state._web.setProvider(new Web3.providers.HttpProvider(state.provider, {
        keepAlive: true,
        timeout: TIMEOUT
      }))
      return state._web
    },
    collapsed: (state) => {
      if (state.menuFoldState === 'unfold') {
        return false
      } else if (state.menuFoldState === 'fold') {
        return true
      }
    }
  }
})
