<template>
  <div>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="contractAddress"
          addonBefore="授权代币"
          placeholder="输入要授权的代币合约地址"
        ></a-input>
      </a-col>
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="spender"
          addonBefore="授权地址"
          placeholder="输入使用授权的地址"
        ></a-input>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="approveAmount"
          addonBefore="授权数量"
          placeholder="授权地址可用的最大数量"
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
      <a-col span="6">
        <a-input
          allow-clear
          :placeholder="currentGas"
          v-model:value="gas"
          style="text-align: center"
          addonBefore="燃料限制"
        />
      </a-col>
      <a-col span="6">
        <a-button type="primary" @click="estimateGas" ghost
          >燃料限制估算</a-button
        >
      </a-col>
    </a-row>
    <a-row type="flex">
      <a-col flex="1 0"></a-col>
      <a-col flex="0 1 153.91px">
        <a-button type="primary" @click="queryNonce()">刷新「Nonce」</a-button>
      </a-col>
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
          title="授权「合约代币」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="approveWallet(false)"
        >
          <a-button type="primary" :disabled="loading"
            >授权「合约代币」</a-button
          >
        </a-popconfirm>
      </a-col>
      <a-col flex="0 1">
        <a-popconfirm
          placement="bottomRight"
          title="加速授权「合约代币」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="approveWallet(true)"
        >
          <a-tooltip placement="topRight">
            <template #title>
              <span
                >当交易长时间未完成时, <br />可以提高燃料价格来加速交易</span
              >
            </template>
            <a-button type="primary" :disabled="loading"
              >加速授权「合约代币」</a-button
            >
          </a-tooltip>
        </a-popconfirm>
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="8">
        <a-statistic title="执行授权钱包数量" :value="data.length" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="授权成功钱包数量" :value="checkedWallets.length" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="授权失败钱包数量" :value="failedWallets.length" />
      </a-col>
    </a-row>
    <a-row>
      <a-col>
        <a-statistic title="执行授权代币总量" :value="totalTransferAmount" />
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
import { defineComponent, ref, reactive } from "vue";
import store from "../stores/store";
import { message, abi, convertDecimalsToUnit, sleep } from "../common";
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
      //转入地址
      spender: ref<string>(""),
      //合约地址
      contractAddress: ref<string>(""),
      //转账数量
      approveAmount: ref<string>(""),
      //最大燃料价格
      maxFeePerGas: ref<string>(""),
      //根据合约小数位数转换为以太单位
      unit: "",
      //CSV文件数据
      data: ref<Object[]>([]),
      //Nonce Map
      nonceMap: reactive(new Map()),
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
      //加载状态
      loading: false,
    };
  },
  mounted() {
      this.store.changeTokenType("合约代币");
  },
  computed: {
    web3() {
      return this.store.web3;
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
      if (this.data.length === 0 || this.approveAmount.trim().length === 0)
        return 0;

      return new BigNumber(
        this.data.length * parseFloat(this.approveAmount)
      ).toFixed();
    },
    singleFee() {
      return this.store.getSingleFee(this.maxFeePerGas, this.data, this.gas);
    },
    totalFee() {
      return this.store.getTotalFee(this.maxFeePerGas, this.data, this.gas);
    },
  },
  watch: {
    async contractAddress() {
      try {
        const decimals = await this.contract.methods.decimals().call();
        //@ts-ignore
        this.unit = convertDecimalsToUnit(decimals);
      } catch (_error) {}
    },
    txCount(v) {
      this.store.getTxDownload(
        v,
        this.data,
        this.nonceMap,
        this.checkedWallets,
        this.failedWallets,
        "钱包授权"
      );
    },
    "nonceMap.size"() {
      if (this.nonceMap.size == this.data.length) {
        message("success", "刷新「Nonce」", "「Nonce」已刷新");
        this.loading = false;
      }
    },
  },
  methods: {
    //代币转账
    async approveWallet(accelerate: boolean) {
      this.checkedWallets = [];
      this.failedWallets = [];

      if (this.nonceMap.size !== this.data.length) {
        message("warning", "钱包授权", "需点击刷新Nonce");
        return;
      }

      //@ts-ignore
      if (
        this.approveAmount.trim().length === 0 ||
        this.contractAddress.trim().length === 0 ||
        this.spender.trim().length === 0 ||
        this.maxFeePerGas.trim().length === 0 ||
        this.gas.trim().length === 0 ||
        this.data.length === 0
      ) {
        message("warning", "钱包授权", "信息未填写完整或未导入钱包文件");
        return;
      }

      try {
        this.batchApprove(
          { chainId: await this.store.getChainId() },
          accelerate
        );
      } catch (e) {
        console.error(e);
        message("warning", "钱包授权", "执行出错,请重新执行");
      }
    },
    async batchApprove(baseInfo: BaseInfo, accelerate: boolean) {
      for (let i = 0; i < this.data.length; i++) {
        await sleep(i);
        //@ts-ignore
        baseInfo["address"] = this.data[i]["钱包地址"];
        //@ts-ignore
        baseInfo["privateKey"] = this.data[i]["钱包私钥"];
        //@ts-ignore
        baseInfo["nonce"] = this.nonceMap.get(this.data[i]["钱包地址"]);

        if (baseInfo["nonce"] === undefined) {
          this.failedWallets.push([
            //@ts-ignore
            baseInfo["address"],
            "交易失败",
          ]);
          continue;
        }

        this.approve(baseInfo, accelerate);
      }
    },
    //执行转账
    async approve(
      { nonce, chainId, address, privateKey }: BaseInfo,
      accelerate: boolean
    ) {
      const config: TransactionConfig = {
        // from?: string | number;
        from: address,
        // nonce?: number;
        nonce: nonce,
        // chainId?: number;
        chainId: chainId,
      };

      const txData = this.contract.methods
        .approve(
          this.spender,
          //@ts-ignore
          this.toWei(this.approveAmount.trim(), this.unit)
        )
        .encodeABI();

      config.to = this.contractAddress;
      config.data = txData;
      config.gas = this.gas;

      this.store.setGasStratgy(accelerate, config, this.maxFeePerGas);

      let success = (address: string, txHash: string) => {
        this.checkedWallets.push([address, txHash]);
      };

      let reject = (error: Error, address: string) => {
        console.error(error);
        this.failedWallets.push([address, "交易失败"]);
      };

      //@ts-ignore
      this.store.sendTransaction(config, address, privateKey, success, reject);
    },
    //Gas估算
    async estimateGas() {
      if (
        this.contractAddress.trim().length === 0 ||
        this.data.length === 0 ||
        this.spender.trim().length === 0 ||
        this.approveAmount.trim().length === 0
      ) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      this.currentGas = await this.contract.methods
        .approve(
          this.spender,
          //@ts-ignore
          this.toWei(this.approveAmount.trim(), this.unit)
        )
        //@ts-ignore
        .estimateGas({ from: this.data[0]["钱包地址"] });

      this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

      message("success", "燃料限制估算", this.currentGas);
    },
    importWalletFile() {
      this.store.importWalletFile(this.fileList, this.data, (o: Object) => {
        this.queryNonce();
        //@ts-ignore
        if (!o["合约地址"]) return;
        //@ts-ignore
        this.contractAddress = o["合约地址"];
      });
    },
    queryNonce() {
      this.store.queryNonce(
        this.data,
        this.nonceMap,
        "钱包授权",
        () => (this.loading = true)
      );
    },
  },
});
</script>

<style scoped></style>
