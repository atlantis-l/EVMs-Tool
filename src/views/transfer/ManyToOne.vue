<template>
    <div>
        <a-row :gutter="gutter">
            <a-col span="12">
                <a-input v-model:value="toAddress" addonBefore="转入地址" placeholder="输入要转入的地址"></a-input>
            </a-col>
            <a-col span="12" v-show="store.tokenType === '合约代币'">
                <a-input allow-clear v-model:value="contractAddress" addonBefore="合约地址" placeholder="不填则按导入文件为准"></a-input>
            </a-col>
        </a-row>
        <a-row :gutter="gutter">
            <a-col span="12">
                <a-input allow-clear v-model:value="transferAmount" addonBefore="转账数量" placeholder="不填则按导入文件为准"></a-input>
            </a-col>
        </a-row>
        <a-row :gutter="gutter">
            <a-col span="6">
                <a-input v-model:value="maxFeePerGas" style="text-align: center;" addonBefore="燃料价格"
                    :placeholder="store.currentGasPrice"></a-input>
            </a-col>
            <a-col span="6" v-show="store.tokenType === '原生代币' ? false : true">
                <a-input :placeholder="currentGas" v-model:value="gas" style="text-align: center;" addonBefore="燃料限制" />
            </a-col>
            <a-col span="6" v-show="store.tokenType === '原生代币' ? false : true">
                <a-button type="primary" @click="estimateGas" ghost>燃料限制估算</a-button>
            </a-col>
        </a-row>
        <a-row type="flex">
            <a-col flex="1 0"></a-col>
            <a-col flex="0 1 153.91px">
                <a-button type="primary" @click="queryNonce()">刷新「Nonce」</a-button>
            </a-col>
            <a-col flex="0 1 162px">
                <a-upload v-model:fileList="fileList" :beforeUpload="() => false" @change="importWalletFile">
                    <a-button type="primary" ghost>
                        <FileAddFilled />
                        导入钱包文件
                    </a-button>
                </a-upload>
            </a-col>
            <a-col flex="0 1 168px">
                <a-popconfirm placement="bottomRight" :title="`发送「${store.tokenType}」`" ok-text="确认" cancel-text="取消"
                    @confirm="transferToken(false)">
                    <a-button type="primary" :disabled="loading">发送「{{ store.tokenType }}」</a-button>
                </a-popconfirm>
            </a-col>
            <a-col flex="0 1">
                <a-popconfirm placement="bottomRight" :title="`加速交易「${store.tokenType}」`" ok-text="确认" cancel-text="取消"
                    @confirm="transferToken(true)">
                    <a-tooltip placement="topRight">
                        <template #title>
                            <span>当交易长时间未完成时, 可以提高燃料价格来加速交易</span>
                        </template>
                        <a-button type="primary" :disabled="loading">加速交易「{{ store.tokenType }}」</a-button>
                    </a-tooltip>
                </a-popconfirm>
            </a-col>
        </a-row>
        <a-row>
            <a-col :span="8">
                <a-statistic title="执行转账钱包数量" :value="data.length" />
            </a-col>
            <a-col :span="8">
                <a-statistic title="转账成功钱包数量" :value="checkedWallets.length" />
            </a-col>
            <a-col :span="8">
                <a-statistic title="转账失败钱包数量" :value="failedWallets.length" />
            </a-col>
        </a-row>
        <a-row>
            <a-col>
                <a-statistic title="执行转账代币总量" :value="totalTransferAmount" />
            </a-col>
        </a-row>
        <a-row>
            <a-col span="12">
                <a-statistic title="需消耗矿工费单量" :value="singleFee" />
            </a-col>
            <a-col span="12">
                <a-statistic title="需消耗矿工费总量" :value="totalFee" />
            </a-col>
        </a-row>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue'
import store from '../../stores/store'
import { message, abi, convertDecimalsToUnit, sleep, Data } from '../../common'
import { TransactionConfig } from 'web3-core'
import {
    FileAddFilled
} from '@ant-design/icons-vue'
import Papa from 'papaparse'
import FileSaver from 'file-saver'
import BigNumber from 'bignumber.js'

interface BaseInfo {
    nonce?: number,
    chainId?: number,
    address?: string,
    privateKey?: string,
    balance?: string
}

export default defineComponent({
    components: {
        FileAddFilled
    },
    data() {
        return {
            //列间隔
            gutter: 20,
            //全局状态变量
            store: store(),
            //转入地址
            toAddress: ref<string>(''),
            //合约地址
            contractAddress: ref<string>(''),
            //转账数量
            transferAmount: ref<string>(''),
            //最大燃料价格
            maxFeePerGas: ref<string>(''),
            //根据合约小数位数转换为以太单位
            unit: '',
            //CSV文件数据
            data: ref<string[]>([]),
            //Nonce Map
            nonceMap: reactive(new Map()),
            //查询成功钱包数量
            checkedWallets: ref<string[][]>([]),
            //查询失败钱包数量
            failedWallets: ref<string[][]>([]),
            //燃料限制
            gas: ref<string>(''),
            //当前估计Gas
            currentGas: ref<string>(''),
            //Ether To Wei转换
            toWei: store().web3.utils.toWei,
            //Wei To Ether转换
            fromWei: store().web3.utils.fromWei,
            //文件列表
            fileList: [],
            //加载状态
            loading: false
        }
    },
    computed: {
        web3() {
            return this.store.web3
        },
        //合约对象
        contract() {
            return new this.store.web3.eth.Contract(
                abi,
                this.contractAddress,
            )
        },
        //查询总次数
        txCount() {
            return this.checkedWallets.length + this.failedWallets.length
        },
        totalTransferAmount() {
            if (this.data.length === 0) return 0
            //@ts-ignore
            if (this.transferAmount.trim().length === 0 && this.data[0]['钱包余额'] === undefined) return 0

            if (this.transferAmount.trim().length === 0) {
                let total = new BigNumber(0)
                for (let i = 0; i < this.data.length; i++) {

                    //@ts-ignore
                    total = total.plus(this.data[i]['钱包余额'])
                }
                //@ts-ignore
                return this.fromWei(total.toFixed(), this.unit)
            }

            return (new BigNumber(this.data.length * parseFloat(this.transferAmount))).toFixed()
        },
        singleFee() {
            if (this.store.tokenType === '原生代币') {
                if (this.maxFeePerGas.trim().length === 0) return 0
                if (this.data.length === 0) return 0
                return this.fromWei(parseFloat(this.toWei(this.maxFeePerGas, 'Gwei')) * 21000 + '', 'ether')
            } else {
                if (this.maxFeePerGas.trim().length === 0) return 0
                if (this.gas.trim().length === 0) return 0
                if (this.data.length === 0) return 0
                return this.fromWei(parseFloat(this.toWei(this.maxFeePerGas, 'Gwei')) * parseFloat(this.gas) + '', 'ether')
            }
        },
        totalFee() {
            if (this.store.tokenType === '原生代币') {
                if (this.maxFeePerGas.trim().length === 0) return 0
                if (this.data.length === 0) return 0
                return this.fromWei(parseFloat(this.toWei(this.maxFeePerGas, 'Gwei')) * 21000 * this.data.length + '', 'ether')
            } else {
                if (this.maxFeePerGas.trim().length === 0) return 0
                if (this.gas.trim().length === 0) return 0
                if (this.data.length === 0) return 0
                return this.fromWei(parseFloat(this.toWei(this.maxFeePerGas, 'Gwei')) * parseFloat(this.gas) * this.data.length + '', 'ether')
            }
        }
    },
    watch: {
        async contractAddress() {
            try {
                const decimals = await this.contract.methods.decimals().call()
                //@ts-ignore
                this.unit = convertDecimalsToUnit(decimals)
            } catch (_error) {

            }
        },
        txCount(v) {
            if (v === this.data.length) {

                this.nonceMap.clear()

                let data: Data = {
                    fields: undefined,
                    data: undefined
                }

                if (this.store.tokenType === '原生代币') {

                    data.fields = ['钱包地址', '交易哈希']

                } else {

                    data.fields = ['钱包地址', '交易哈希']

                }

                data.data = this.checkedWallets.concat(this.failedWallets)

                //@ts-ignore
                const result = Papa.unparse(data)

                FileSaver.saveAs(
                    new Blob(
                        [result],
                        { type: 'text/plain;charset=utf-8' }
                    ),
                    "多转一.csv"
                )

            }
        },
        async data() {
            this.queryNonce()
        },
        'nonceMap.size'() {
            if (this.nonceMap.size == this.data.length) {
                message('success', '刷新「Nonce」', '「Nonce」已刷新')
                this.loading = false
            }
        }
    },
    methods: {
        //代币转账
        async transferToken(accelerate: boolean) {

            this.checkedWallets = []
            this.failedWallets = []

            if (this.nonceMap.size !== this.data.length) {
                message('warning', '代币转账', '需点击刷新Nonce')
                return
            }

            if (this.toAddress.trim().length === 0
                || this.gas.trim().length === 0
                || this.maxFeePerGas.trim().length === 0
                || this.data.length === 0
            ) {
                message('warning', '代币转账', '信息未填充完整或钱包文件未导入')
                return
            }

            //@ts-ignore
            if (this.transferAmount.trim().length === 0 && this.data[0]['钱包余额'] === undefined) {
                message('warning', '代币转账', '无转账数量信息')
                return
            }

            try {
                this.batchTransfer(await this.queryChainId(), accelerate)
            } catch (e) {
                console.log(e)
                message('warning', '代币转账', '执行出错,请重新执行')
            }
        },
        async batchTransfer(baseInfo: BaseInfo, accelerate: boolean) {

            for (let i = 0; i < this.data.length; i++) {
                await sleep(i)
                //@ts-ignore
                baseInfo['address'] = this.data[i]['钱包地址']
                //@ts-ignore
                baseInfo['privateKey'] = this.data[i]['钱包私钥']
                //@ts-ignore
                baseInfo['balance'] = this.data[i]['钱包余额']
                //@ts-ignore
                baseInfo['nonce'] = this.nonceMap.get(this.data[i]['钱包地址'])

                if (this.transferAmount.trim().length === 0 && baseInfo['balance'] === '0') {
                    this.failedWallets.push([
                        //@ts-ignore
                        baseInfo['address'],
                        '余额为0,不交易'
                    ])
                    continue
                }

                if (baseInfo['nonce'] === undefined) {
                    this.failedWallets.push([
                        //@ts-ignore
                        baseInfo['address'],
                        '交易失败'
                    ])
                    continue
                }

                this.transfer(baseInfo, accelerate)

            }
        },
        //执行转账
        async transfer({ nonce, chainId, address, balance, privateKey }: BaseInfo, accelerate: boolean) {

            const config: TransactionConfig = {
                // from?: string | number;
                from: address,
                // nonce?: number;
                nonce: nonce,
                // chainId?: number;
                chainId: chainId
            }

            if (this.store.tokenType === '原生代币') {
                config.to = this.toAddress

                let fee = new BigNumber(this.toWei(this.maxFeePerGas, 'gwei'))

                fee = fee.times('21000')

                //@ts-ignore
                balance = (new BigNumber(balance)).minus(fee).toFixed()

                config.value = this.transferAmount.trim().length === 0
                    ? balance
                    : this.toWei(this.transferAmount.trim(), 'ether')

                config.gas = '21000'
            } else {

                const txData = this.contract.methods.transfer(
                    this.toAddress,

                    this.transferAmount.trim().length === 0
                        ? balance
                        //@ts-ignore
                        : this.toWei(this.transferAmount.trim(), this.unit)

                ).encodeABI()

                config.to = this.contractAddress
                config.data = txData
                config.gas = this.gas
            }

            if (accelerate) {
                config.gasPrice = this.toWei(this.maxFeePerGas, 'gwei')
            } else {
                config.maxFeePerGas = this.toWei(this.maxFeePerGas, 'gwei')
                config.maxPriorityFeePerGas = this.toWei(this.store.maxPriorityFeePerGas, 'gwei')
            }

            //@ts-ignore
            this.sendTransaction(config, address, privateKey)
        },
        //Gas估算
        async estimateGas() {

            if (this.contractAddress.trim().length === 0
                || this.data.length === 0) {
                message('warning', '燃料限制估算', '信息未填充完整或钱包文件未导入')
                return
            }

            //@ts-ignore
            if (this.transferAmount.trim().length === 0 && this.data[0]['钱包余额'] === undefined) {
                message('warning', '燃料限制估算', '信息未填充完整或钱包文件未导入')
                return
            }

            let balance, address;

            //@ts-ignore
            address = this.data[0]['钱包地址']

            if (this.transferAmount.trim().length > 0) {
                //@ts-ignore
                balance = this.toWei(this.transferAmount.trim(), this.unit)
            } else {
                //@ts-ignore
                balance = this.data[0]['钱包余额']
            }

            try {
                this.currentGas = await this.contract.methods.transfer(
                    this.toAddress,
                    balance
                ).estimateGas({ from: address })

                this.currentGas = (new BigNumber(this.currentGas)).plus('1000').toFixed()

                message('success', '燃料限制估算', this.currentGas)
                //@ts-ignore
            } catch (e) {
                //@ts-ignore
                if (e.message.includes('subtraction overflow')) {
                    message('warning', '燃料限制估算', `代币余额未达到:「${this.transferAmount.trim()}」`)
                } else {
                    console.log(e)
                }
            }
        },
        //查询chainId
        async queryChainId() {
            return {
                chainId: await this.store.web3.eth.getChainId()
            }
        },
        //发送交易
        sendTransaction(config: TransactionConfig, address: string, privateKey: string) {
            //TODO send signed transaction
            this.web3.eth.accounts
                .signTransaction(config, privateKey,
                    (_error, signedTransaction) => {
                        this.web3.eth
                            .sendSignedTransaction(
                                //@ts-ignore
                                signedTransaction.rawTransaction,
                            ).once('transactionHash', (txHash) => {
                                this.checkedWallets.push([
                                    address,
                                    txHash
                                ])
                            }).catch((error) => {
                                console.log(error)
                                this.failedWallets.push([
                                    address,
                                    '交易失败'
                                ])
                            })
                    }
                )
        },
        importWalletFile() {
            //@ts-ignore
            this.fileList = [this.fileList[this.fileList.length - 1]]
            //@ts-ignore
            const csvFile = new File([this.fileList[0].originFileObj], this.fileList[0].name)
            Papa.parse(csvFile, {
                skipEmptyLines: 'greedy',
                header: true,
                complete: (result, _file) => {
                    //@ts-ignore
                    this.data = result.data
                    //@ts-ignore
                    if (this.data[0]['合约地址']) {
                        //@ts-ignore
                        this.contractAddress = this.data[0]['合约地址']
                    }
                }
            })
        },
        async queryNonce() {

            if (this.data.length === 0) {
                message('warning', '代币转账', '钱包文件未导入')
                return
            }

            this.loading = true
            this.nonceMap.clear()

            let batchRequest = new this.web3.eth.BatchRequest()

            for (let i = 0; i < this.data.length; i++) {

                const request = this.web3.eth.getTransactionCount
                    //@ts-ignore
                    .request(this.data[i]['钱包地址'], (error, nonce) => {
                        if (!error) {
                            //@ts-ignore
                            this.nonceMap.set(this.data[i]['钱包地址'], nonce)
                        }
                    })

                batchRequest.add(request)

                //执行100次批量查询后暂停5秒
                await sleep(i / 100)

                //每100个钱包作为一次批量查询
                if ((i + 1) % 100 === 0) {
                    batchRequest.execute()
                    batchRequest = new this.web3.eth.BatchRequest()
                }

            }

            //查询最后未满100个钱包的批量查询
            if (this.data.length % 100 !== 0) {
                batchRequest.execute()
            }
        }
    }
})
</script>

<style scoped></style>
