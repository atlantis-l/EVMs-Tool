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
          v-model:value="transferAmount"
          addonBefore="转账数量"
          placeholder="输入要转账的代币数量"
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
      <a-col span="6">
        <a-input
          allow-clear
          v-model:value="maxFeePerGas"
          style="text-align: center"
          addonBefore="燃料价格"
          :placeholder="store.currentGasPrice"
        ></a-input>
      </a-col>
      <a-col span="6" v-show="store.tokenType === '原生代币' ? false : true">
        <a-input
          allow-clear
          :placeholder="currentGas"
          v-model:value="gas"
          style="text-align: center"
          addonBefore="燃料限制"
        />
      </a-col>
      <a-col span="6" v-show="store.tokenType === '原生代币' ? false : true">
        <a-button type="primary" @click="estimateGas" ghost
          >燃料限制估算</a-button
        >
      </a-col>
    </a-row>
    <a-row type="flex">
      <a-col flex="1 0"></a-col>
      <a-col flex="0 1 162px">
        <a-upload
          v-model:fileList="fileList"
          :beforeUpload="() => false"
          @change="importWalletFile"
        >
          <a-button type="primary" ghost>
            <FileAddFilled />
            导入钱包文件
          </a-button>
        </a-upload>
      </a-col>
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
              <span
                >当交易长时间未完成时, <br />可以提高燃料价格来加速交易</span
              >
            </template>
            <a-button type="primary"
              >加速交易「{{ store.tokenType }}」</a-button
            >
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
      <a-col>
        <a-statistic title="需消耗矿工费总量" :value="totalFee" />
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import store from "../../stores/store";
import { message, abi, convertDecimalsToUnit, sleep } from "../../common";
import { TransactionConfig } from "web3-core";
import { FileAddFilled } from "@ant-design/icons-vue";
import BigNumber from "bignumber.js";

export default defineComponent({
  components: {
    FileAddFilled,
  },
  data() {
    return {
      //列间隔
      gutter: 20,
      //全局状态变量
      store: store(),
      //私钥
      privateKey: ref<string>(""),
      //合约地址
      contractAddress: ref<string>(""),
      //转账数量
      transferAmount: ref<string>(""),
      //最大燃料价格
      maxFeePerGas: ref<string>(""),
      //根据合约小数位数转换为以太单位
      unit: ref<string>(""),
      //CSV文件数据
      data: ref<Object[]>([]),
      //查询成功钱包数量
      checkedWallets: ref<string[][]>([]),
      //查询失败钱包数量
      failedWallets: ref<string[][]>([]),
      //燃料限制
      gas: ref<string>(""),
      //当前估计Gas
      currentGas: ref<string>(""),
      //Ether To Wei转换
      toWei: store().web3.utils.toWei,
      //Wei To Ether转换
      fromWei: store().web3.utils.fromWei,
      //文件列表
      fileList: [],
    };
  },
  computed: {
    web3() {
      return this.store.web3;
    },
    //根据私钥计算出转出地址
    fromAddress() {
      try {
        const account = this.web3.eth.accounts.wallet.add(this.privateKey);
        return account.address;
      } catch (_) {
        return "";
      }
    },
    //合约对象
    contract() {
      return this.store.getContract(abi, this.contractAddress);
    },
    //查询总次数
    txCount() {
      return this.checkedWallets.length + this.failedWallets.length;
    },
    totalTransferAmount() {
      if (this.transferAmount.trim().length === 0 || this.data.length === 0)
        return 0;

      return new BigNumber(
        this.data.length * parseFloat(this.transferAmount)
      ).toFixed();
    },
    totalFee() {
      return this.store.getTotalFee(this.maxFeePerGas, this.data, this.gas);
    },
  },
  watch: {
    async contractAddress() {
      const decimals = await this.contract.methods.decimals().call();
      //@ts-ignore
      this.unit = convertDecimalsToUnit(decimals);
    },
    txCount(v) {
      this.store.getTxDownload(
        v,
        this.data,
        new Map(),
        this.checkedWallets,
        this.failedWallets,
        "一转多"
      );
    },
  },
  methods: {
    //代币转账
    async transferToken(accelerate: boolean) {
      this.checkedWallets = [];
      this.failedWallets = [];

      try {
        const baseInfo: BaseInfo = await this.queryBaseInfo(this.fromAddress);
        this.batchTransfer(baseInfo, accelerate);
      } catch (e) {
        console.error(e);
        message("warning", "代币转账", "执行出错,请重新执行");
      }
    },
    async batchTransfer(baseInfo: BaseInfo, accelerate: boolean) {
      for (let i = 0; i < this.data.length; i++) {
        await sleep(i);
        //@ts-ignore
        baseInfo["address"] = this.data[i]["钱包地址"];

        this.transfer(baseInfo, accelerate);

        //@ts-ignore
        baseInfo["nonce"] += 1;
      }
    },
    //执行转账
    async transfer({ nonce, chainId, address }: BaseInfo, accelerate: boolean) {
      const config: TransactionConfig = {
        // from?: string | number;
        from: this.fromAddress,
        // nonce?: number;
        nonce: nonce,
        // chainId?: number;
        chainId: chainId,
      };

      if (this.store.tokenType === "原生代币") {
        config.to = address;
        config.value = this.toWei(this.transferAmount.trim(), "ether");
        config.gas = "21000";
      } else {
        const txData = this.contract.methods
          .transfer(
            address,
            //@ts-ignore
            this.toWei(this.transferAmount, this.unit)
          )
          .encodeABI();
        config.to = this.contractAddress;
        config.data = txData;
        config.gas = this.gas;
      }

      this.store.setGasStratgy(accelerate, config, this.maxFeePerGas);

      let success = (address: string, txHash: string) => {
        this.checkedWallets.push([address, txHash]);
      };

      let reject = (error: Error, address: string) => {
        console.error(error);
        this.failedWallets.push([address, "交易失败"]);
      };

      this.store.sendTransaction(
        config,
        //@ts-ignore
        address,
        this.privateKey,
        success,
        reject
      );
    },
    //Gas估算
    async estimateGas() {
      if (
        this.contractAddress.trim().length === 0 ||
        this.transferAmount.trim().length === 0 ||
        this.privateKey.trim().length === 0 ||
        this.data.length === 0
      ) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      this.currentGas = await this.contract.methods
        .transfer(
          //@ts-ignore
          this.web3.eth.accounts.create().address,
          //@ts-ignore
          this.toWei(this.transferAmount, this.unit)
        )
        .estimateGas({ from: this.fromAddress });

      this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

      message("success", "燃料限制估算", this.currentGas);
    },
    //查询nonce和chainId
    async queryBaseInfo(address: string) {
      return {
        nonce: await this.store.web3.eth.getTransactionCount(address),
        chainId: await this.store.web3.eth.getChainId(),
      };
    },
    importWalletFile() {
      this.store.importWalletFile(this.fileList, this.data, (o: Object) => {
        //@ts-ignore
        if (!o["合约地址"]) return;
        //@ts-ignore
        this.contractAddress = o["合约地址"];
      });
    },
  },
});
</script>

<style scoped></style>
