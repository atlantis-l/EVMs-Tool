<template>
    <div>
        <a-row :gutter="20">
            <a-col span="12">
                <a-input allow-clear v-model:value="queryBase" :placeholder="`输入${queryBaseType}:「0x开头」`">
                    <template #addonBefore>
                        <a-select v-model:value="queryBaseType">
                            <a-select-option value="钱包地址">钱包地址</a-select-option>
                            <a-select-option value="钱包私钥">钱包私钥</a-select-option>
                        </a-select>
                    </template>
                </a-input>
            </a-col>
            <a-col span="12" v-show="store.tokenType === '合约代币'">
                <a-input allow-clear v-model:value="contractAddress" addonBefore="合约地址" placeholder="输入代币的合约地址"></a-input>
            </a-col>
        </a-row>
        <a-row>
            <a-col span="4">
                <a-button type="primary" @click="queryBalance">
                    查询余额「{{ store.tokenType }}」
                </a-button>
            </a-col>
        </a-row>
        <a-row>
            <a-col :span="6">
                <a-statistic title="钱包地址" :value="address" />
            </a-col>
        </a-row>
        <a-row>
            <a-col :span="6">
                <a-statistic :title="`钱包余额「${store.tokenType}」`" :value="balance" />
            </a-col>
        </a-row>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import store from '../../stores/store'
import { abi, convertDecimalsToUnit, message } from '../../common'

export default defineComponent({
    data() {
        return {
            //全局状态变量
            store: store(),
            //合约地址
            contractAddress: ref<string>(''),
            //「钱包地址」或「钱包私钥」类型
            queryBaseType: ref<string>('钱包地址'),
            //根据钱包地址或钱包私钥类型来查询
            queryBase: ref<string>(''),
            //余额
            balance: ref<string>(''),
            //合约代币精度
            decimals: ref<string>('0'),
        }
    },
    computed: {
        //Web3对象
        web3() {
            return this.store.web3
        },
        //Wei转换
        fromWei() {
            return this.store.web3.utils.fromWei
        },
        //合约对象
        contract() {
            return new this.web3.eth.Contract(
                abi,
                this.contractAddress,
            )
        },
        address() {
            if (this.queryBaseType === '钱包地址') {
                if (this.queryBase.length === 42) {
                    return this.queryBase
                }
                return '0x'
            } else {
                try {
                    return this.web3.eth.accounts.privateKeyToAccount(this.queryBase).address
                } catch (_) {
                    return '0x'
                }
            }
        },
        //根据合约小数位数转换为以太单位
        unit() {
            return convertDecimalsToUnit(this.decimals)
        },
    },
    methods: {
        //查询余额
        queryBalance() {
            this.query(this.address)
        },
        //查询
        async query(address: string) {
            this.balance = '0'

            if (this.store.tokenType === '原生代币') {

                this.web3.eth
                    .getBalance(address)
                    .then((balance: string) => {
                        this.balance = this.fromWei(balance, 'ether')
                    }).catch(() => {
                        message('warning', '余额查询', '查询失败,重新查询')
                    })

            } else {

                //获取合约代币精度
                try {
                    this.decimals = await this.contract.methods.decimals().call()
                } catch (_) {
                    message('warning', '余额查询', '合约信息获取失败,重新查询')
                    return
                }

                this.contract.methods.balanceOf(
                    address,
                ).call().then((balance: string) => {
                    this.balance = this.fromWei(balance, this.unit)
                }).catch(() => {
                    message('warning', '余额查询', '查询失败,重新查询')
                })
            }
        }
    }
})
</script>

<style></style>
