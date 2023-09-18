<template>
  <div>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          v-model:value="fromAddress"
          readonly
          addonBefore="转出地址"
          placeholder="根据私钥自动生成"
        ></a-input>
      </a-col>
      <a-col span="12">
        <a-input-password
          allow-clear
          v-model:value="privateKey"
          addonBefore="转出私钥"
          placeholder="输入要转出的钱包私钥"
        ></a-input-password>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="toAddress"
          addonBefore="转入地址"
          placeholder="输入要转入的钱包地址"
        ></a-input>
      </a-col>
      <a-col span="12" v-show="store.tokenType === '合约代币'">
        <a-input
          allow-clear
          v-model:value="contractAddress"
          addonBefore="合约地址"
          placeholder="输入代币的合约地址"
        ></a-input>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="transferAmount"
          addonBefore="转账数量"
          placeholder="输入要转账的代币数量"
        ></a-input>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="6">
        <a-input
          allow-clear
          v-model:value="maxFeePerGas"
          style="text-align: center"
          addonBefore="燃料价格"
          :placeholder="store.currentGasPrice"
        ></a-input>
      </a-col>
      <a-col span="6" v-show="store.tokenType !== '原生代币'">
        <a-input
          allow-clear
          :placeholder="currentGas"
          v-model:value="gas"
          style="text-align: center"
          addonBefore="燃料限制"
        />
      </a-col>
      <a-col span="6" v-show="store.tokenType !== '原生代币'">
        <a-button type="primary" @click="estimateGas" ghost
          >燃料限制估算</a-button
        >
      </a-col>
    </a-row>
    <a-row type="flex">
      <a-col>
        <a-alert
          style="height: 32px; user-select: none"
          :message="`矿工费:「${singleFee}」`"
          type="info"
        />
      </a-col>
      <a-col flex="1 0"></a-col>
      <a-col flex="0 1 168px">
        <a-popconfirm
          placement="bottomRight"
          :title="`发送「${store.tokenType}」`"
          ok-text="确认"
          cancel-text="取消"
          @confirm="transferToken(false)"
        >
          <a-button type="primary">发送「{{ store.tokenType }}」</a-button>
        </a-popconfirm>
      </a-col>
      <a-col flex="0 1">
        <a-popconfirm
          placement="bottomRight"
          :title="`加速交易「${store.tokenType}」`"
          ok-text="确认"
          cancel-text="取消"
          @confirm="transferToken(true)"
        >
          <a-tooltip placement="topRight">
            <template #title>
              <span>当交易长时间未完成时, 可以提高燃料价格来加速交易</span>
            </template>
            <a-button type="primary"
              >加速交易「{{ store.tokenType }}」</a-button
            >
          </a-tooltip>
        </a-popconfirm>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="24">
        <a-table
          bordered
          class="ant-table-striped"
          :pagination="false"
          size="small"
          :scroll="{ y: platform === 'darwin' ? 190 : 145 }"
          :dataSource="tableData"
          :columns="tablecolumns"
          :row-class-name="(_record: any, index: number) => (index % 2 === 1 ? 'table-striped' : null)"
        ></a-table>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import store from "../../stores/store";
import { message, abi, convertDecimalsToUnit } from "../../common";
import { TransactionConfig } from "web3-core";
import BigNumber from "bignumber.js";

interface BaseInfo {
  nonce: number;
  chainId: number;
}

export default defineComponent({
  data() {
    return {
      //列间隔
      gutter: 20,
      //全局状态变量
      store: store(),
      //platform
      platform: process.platform,
      //私钥
      privateKey: ref<string>(""),
      //转入地址
      toAddress: ref<string>(""),
      //合约地址
      contractAddress: ref<string>(""),
      //转账数量
      transferAmount: ref<string>(""),
      //最大燃料价格
      maxFeePerGas: ref<string>(""),
      //当前估计Gas
      currentGas: ref<string>(""),
      //燃料限制
      gas: ref<string>(""),
      //Ether To Wei转换
      toWei: store().web3.utils.toWei,
      //Wei To Ether转换
      fromWei: store().web3.utils.fromWei,
    };
  },
  computed: {
    //表格表头数据
    tablecolumns(): {}[] {
      return [
        {
          title:
            "交易哈希" +
            //@ts-ignore
            (this.store.txHash.oneToOne?.length > 0
              ? `(${this.store.txHash.oneToOne?.length}笔)`
              : ""),
          dataIndex: "txHash",
          key: "txHash",
        },
      ];
    },
    //表身数据
    tableData() {
      const txHashList: {}[] = [];
      this.store.txHash.oneToOne?.forEach((value, _index, _array) => {
        txHashList.push({
          key: value,
          txHash: value,
        });
      });
      return txHashList;
    },
    //根据私钥计算出转出地址
    fromAddress() {
      try {
        const account = this.store.web3.eth.accounts.wallet.add(
          this.privateKey
        );
        return account.address;
      } catch (_) {
        return "";
      }
    },
    //合约对象
    contract() {
      return this.store.getContract(abi, this.contractAddress);
    },
    //根据合约小数位数转换为以太单位
    async unit() {
      return convertDecimalsToUnit(
        await this.contract.methods.decimals().call()
      );
    },
    //计算出与合约交互的十六进制数据
    async data() {
      return this.contract.methods
        .transfer(
          this.toAddress,
          this.toWei(this.transferAmount, await this.unit)
        )
        .encodeABI();
    },
    //矿工费
    singleFee() {
      return this.store.getSingleFee(this.maxFeePerGas, [0], this.gas);
    },
  },
  methods: {
    //代币转账
    async transferToken(accelerate: boolean) {
      try {
        const baseInfo = await this.queryBaseInfo(this.fromAddress);
        this.transfer(baseInfo, accelerate);
      } catch (e) {
        console.error(e);
        message("warning", "代币转账", "执行出错,请重新执行");
      }
    },
    //执行转账
    async transfer({ nonce, chainId }: BaseInfo, accelerate: boolean) {
      const config: TransactionConfig = {
        // from?: string | number;
        from: this.fromAddress,
        // nonce?: number;
        nonce: nonce,
        // chainId?: number;
        chainId: chainId,
      };

      if (this.store.tokenType === "原生代币") {
        config.to = this.toAddress;
        config.value = this.toWei(this.transferAmount.trim(), "ether");
        config.gas = "21000";
      } else {
        config.to = this.contractAddress;
        config.data = await this.data;
        config.gas = this.gas;
      }

      this.store.setGasStratgy(accelerate, config, this.maxFeePerGas);

      let success = (_: string, txHash: string) => {
        this.addTxHash(txHash);
      };

      let reject = (error: Error, _: string) => {
        this.catchError(error);
      };

      this.store.sendTransaction(
        config,
        this.fromAddress,
        this.privateKey,
        success,
        reject
      );
    },
    //查询nonce和chainId
    async queryBaseInfo(address: string) {
      return {
        nonce: await this.store.web3.eth.getTransactionCount(address),
        chainId: await this.store.getChainId(),
      };
    },
    //Gas估算
    async estimateGas() {
      if (
        this.contractAddress.trim().length === 0 ||
        this.transferAmount.trim().length === 0 ||
        this.privateKey.trim().length === 0 ||
        this.toAddress.trim().length === 0
      ) {
        message("warning", "燃料限制估算", "信息未填充完整");
        return;
      }

      let amount = this.toWei(this.transferAmount.trim(), await this.unit);

      try {
        this.currentGas = await this.contract.methods
          .transfer(this.toAddress, amount)
          .estimateGas({ from: this.fromAddress });

        this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

        message("success", "燃料限制估算", this.currentGas);
        //@ts-ignore
      } catch (e) {
        //@ts-ignore
        if (e.message.includes("subtraction overflow")) {
          message(
            "warning",
            "燃料限制估算",
            `代币余额未达到:「${this.transferAmount.trim()}」`
          );
        } else {
          console.error(e);
        }
      }
    },
    //添加txHash到全局存储
    addTxHash(txHash: string) {
      this.store.addTxHash("txHash.oneToOne", txHash);
      message("success", "代币转账", "交易已发送");
    },
    //错误处理
    catchError(e: Error) {
      if (e.message.toLowerCase().includes("exist")) {
        message("warning", "代币转账", "当前存在交易,尝试使用加速交易");
      } else {
        console.error(e);
      }
    },
  },
});
</script>

<style scoped>
.ant-table-striped :deep(.table-striped) td {
  background-color: #fafafa;
}
</style>
