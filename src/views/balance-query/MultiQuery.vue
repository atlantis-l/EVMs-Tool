<template>
    <div>
        <a-row v-show="store.tokenType === '合约代币'">
            <a-col span="13">
                <a-input allow-clear v-model:value="contractAddress" addonBefore="合约地址" placeholder="输入代币的合约地址"></a-input>
            </a-col>
        </a-row>
        <a-row>
            <a-col>
                <a-upload v-model:fileList="fileList" :beforeUpload="() => false" @change="importWalletFile">
                    <a-button type="primary">
                        <FileAddFilled />
                        导入钱包文件
                    </a-button>
                </a-upload>
            </a-col>
        </a-row>
        <a-row>
            <a-col>
                <a-button type="primary" @click="queryBalance">
                    查询余额「{{ store.tokenType }}」
                </a-button>
            </a-col>
        </a-row>
        <a-row>
            <a-col :span="8">
                <a-statistic title="需查询钱包数量" :value="data.length" />
            </a-col>
            <a-col :span="8">
                <a-statistic :title="`查询成功钱包数量`" :value="checkedWallets.length" />
            </a-col>
            <a-col :span="8">
                <a-statistic :title="`查询失败钱包数量`" :value="failedWallets.length" />
            </a-col>
        </a-row>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import store from '../../stores/store'
import { abi, sleep, Data, message } from '../../common'
import Papa from 'papaparse'
import FileSaver from 'file-saver'
import {
    FileAddFilled
} from '@ant-design/icons-vue'

export default defineComponent({
    components: {
        FileAddFilled
    },
    data() {
        return {
            //全局状态变量
            store: store(),
            //合约地址
            contractAddress: ref<string>(''),
            //查询成功钱包数量
            checkedWallets: ref<string[][]>([]),
            //查询失败钱包数量
            failedWallets: ref<string[][]>([]),
            //文件列表
            fileList: ref<object[]>([]),
            //CSV文件数据
            data: ref<string[]>([]),
            //合约代币精度
            decimals: ref<string>('')
        }
    },
    computed: {
        //Web3对象
        web3() {
            return this.store.web3
        },
        //合约对象
        contract() {
            return new this.web3.eth.Contract(
                abi,
                this.contractAddress,
            )
        },
        //查询总次数
        queryCount() {
            return this.checkedWallets.length + this.failedWallets.length
        }
    },
    watch: {
        queryCount(v) {
            if (v === this.data.length) {

                let data: Data = {
                    fields: undefined,
                    data: undefined
                }

                if (this.store.tokenType === '原生代币') {

                    data.fields = ['钱包地址', '钱包私钥', '钱包余额']

                } else {

                    data.fields = ['钱包地址', '钱包私钥', '合约地址', '代币精度', '钱包余额']

                }

                data.data = this.checkedWallets.concat(this.failedWallets)

                //@ts-ignore
                const result = Papa.unparse(data)

                FileSaver.saveAs(
                    new Blob(
                        [result],
                        { type: 'text/plain;charset=utf-8' }
                    ),
                    this.store.tokenType === '原生代币' ? '原生代币余额查询.csv' : '合约代币余额查询.csv'
                )

            }
        }
    },
    methods: {
        //查询余额
        async queryBalance() {
            this.checkedWallets = []
            this.failedWallets = []
            const failedWalletsSet = new Set<string>()

            //获取合约代币精度
            if (this.store.tokenType === '合约代币') {
                try {
                    this.decimals = await this.contract.methods.decimals().call()
                } catch (_) {
                    message('warning', '余额查询', '合约信息获取失败,重新查询')
                    return
                }
            }

            let batchRequest = new this.web3.eth.BatchRequest()
            let request

            for (let i = 0; i < this.data.length; i++) {

                //@ts-ignore
                const info = [this.data[i]['钱包地址'], this.data[i]['钱包私钥']]

                if (this.store.tokenType === '原生代币') {
                    request = this.web3.eth.getBalance
                        //@ts-ignore
                        .request(this.data[i]['钱包地址'], (error, balance) => {
                            if (error) {
                                //@ts-ignore
                                if (!failedWalletsSet.has(this.data[i]['钱包地址'])) {
                                    //@ts-ignore
                                    failedWalletsSet.add(this.data[i]['钱包地址'])
                                    info.push('查询失败')
                                    this.fillWallets(info, false)
                                }
                            } else {
                                info.push(balance)
                                this.fillWallets(info, true)
                            }
                        })
                } else {
                    info.push(this.contractAddress, this.decimals)
                    //@ts-ignore
                    request = this.contract.methods.balanceOf(this.data[i]['钱包地址'])
                        .call
                        //@ts-ignore
                        .request((error, balance) => {
                            if (error) {
                                //@ts-ignore
                                if (!failedWalletsSet.has(this.data[i]['钱包地址'])) {
                                    //@ts-ignore
                                    failedWalletsSet.add(this.data[i]['钱包地址'])
                                    info.push('查询失败')
                                    this.fillWallets(info, false)
                                }
                            } else {
                                info.push(balance)
                                this.fillWallets(info, true)
                            }
                        })
                }

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
        },
        fillWallets(info: string[], checked: boolean) {
            if (checked) {
                this.checkedWallets.push(info)
            } else {
                this.failedWallets.push(info)
            }
        },
        importWalletFile() {
            this.fileList = [this.fileList[this.fileList.length - 1]]
            //@ts-ignore
            const csvFile = new File([this.fileList[0].originFileObj], this.fileList[0].name)
            Papa.parse(csvFile, {
                skipEmptyLines: 'greedy',
                header: true,
                complete: (result, _file) => {
                    //@ts-ignore
                    this.data = result.data
                }
            })
        }
    }
})
</script>

<style></style>
