<template>
    <div>
        <a-row :gutter="20">
            <a-col span="6">
                <a-input allow-clear v-model:value="amount">
                    <template #addonBefore>
                        钱包数量
                    </template>
                </a-input>
            </a-col>
        </a-row>
        <a-row :gutter="20">
            <a-col span="6">
                <a-button @click="createWallet" type="primary">创建钱包</a-button>
            </a-col>
        </a-row>
        <a-row>
            <a-col :span="6">
                <a-statistic title="钱包数量" :value="data.data?.length" />
            </a-col>
        </a-row>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue'
import FileSaver from 'file-saver'
import Papa from 'papaparse'
import store from '../stores/store'
import { sleep, Data } from '../common'

export default defineComponent({
    data() {
        return {
            web3: store().web3,
            amount: ref<string>(),
            data: reactive<Data>({
                fields: ['钱包地址', '钱包私钥'],
                data: []
            })
        }
    },
    methods: {
        async createWallet() {
            this.data.data = []
            //@ts-ignore
            for (let i = 0; i < this.amount; i++) {
                await sleep(i, 9, 1)
                const wallet = this.web3.eth.accounts.create()
                this.data.data.push([
                    wallet.address,
                    wallet.privateKey
                ])
            }
            //@ts-ignore
            const result = Papa.unparse(this.data)
            FileSaver.saveAs(
                new Blob(
                    [result],
                    { type: "text/plain;charset=utf-8" }
                ),
                "钱包.csv"
            )
        }
    }
})
</script>

<style></style>
