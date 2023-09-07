<template>
  <div>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="contractAddress"
          addonBefore="授权NFT"
          placeholder="输入要授权的NFT合约地址"
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
      <a-col span="12" v-if="checked">
        <a-input
          allow-clear
          v-model:value="approveNftId"
          addonBefore="NFT编号"
          placeholder="NFT ID"
        ></a-input>
      </a-col>
      <a-col span="12" v-if="!checked">
        <a-input
          style="text-align: center"
          allow-clear
          v-model:value="approveNftId"
          addonBefore="授权状态"
          placeholder="1:授权 0:取消"
        ></a-input>
      </a-col>
      <a-col span="12">
        <a-switch
          style="top: 5px"
          v-model:checked="checked"
          checked-children="单个"
          un-checked-children="全部"
        />
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
      <a-col flex="0 1 162px">
        <a-upload
          v-model:fileList="fileList"
          :beforeUpload="() => false"
          @change="importWalletFile"
        >
          <a-tooltip>
            <template #title>
              <span>若文件中有多个钱包, 只取第一个钱包</span>
            </template>
            <a-button type="primary" ghost>
              <FileAddFilled />
              导入钱包文件
            </a-button>
          </a-tooltip>
        </a-upload>
      </a-col>
      <a-col flex="0 1 138.83px">
        <a-popconfirm
          placement="bottomRight"
          title="授权「NFT」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="approveNft(false)"
        >
          <a-button type="primary">授权「NFT」</a-button>
        </a-popconfirm>
      </a-col>
      <a-col flex="0 1">
        <a-popconfirm
          placement="bottomRight"
          title="加速授权「NFT」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="approveNft(true)"
        >
          <a-tooltip placement="topRight">
            <template #title>
              <span>当交易长时间未完成时, 可以提高燃料价格来加速交易</span>
            </template>
            <a-button type="primary">加速授权「NFT」</a-button>
          </a-tooltip>
        </a-popconfirm>
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="6">
        <a-statistic title="钱包地址" :value="walletAddress" />
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="6">
        <a-statistic title="矿工费" :value="singleFee" />
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import store from "../../stores/store";
import { message, nft_abi, convertDecimalsToUnit } from "../../common";
import { TransactionConfig } from "web3-core";
import { FileAddFilled } from "@ant-design/icons-vue";
import Papa from "papaparse";
import BigNumber from "bignumber.js";

interface BaseInfo {
  nonce?: number;
  chainId?: number;
  address?: string;
  privateKey?: string;
  balance?: string;
}

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
      //切换NFT单个或全部的授权
      checked: true,
      //转入地址
      spender: ref<string>(""),
      //钱包地址
      walletAddress: ref<string>("0x"),
      //合约地址
      contractAddress: ref<string>(""),
      //转账NFT ID
      approveNftId: ref<string>(""),
      //最大燃料价格
      maxFeePerGas: ref<string>(""),
      //CSV文件数据
      data: ref<string[]>([]),
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
    //合约对象
    contract() {
      return new this.store.web3.eth.Contract(nft_abi, this.contractAddress);
    },
    //NFT授权所需矿工费
    singleFee() {
      if (this.maxFeePerGas.trim().length === 0) return 0;
      if (this.gas.trim().length === 0) return 0;
      if (this.data.length === 0) return 0;
      return this.fromWei(
        parseFloat(this.toWei(this.maxFeePerGas, "Gwei")) *
          parseFloat(this.gas) +
          "",
        "ether"
      );
    },
  },
  watch: {
    checked() {
      this.approveNftId = "";
    },
  },
  methods: {
    //代币转账
    async approveNft(accelerate: boolean) {
      if (
        this.approveNftId.trim().length === 0 ||
        this.contractAddress.trim().length === 0 ||
        this.spender.trim().length === 0 ||
        this.maxFeePerGas.trim().length === 0 ||
        this.gas.trim().length === 0 ||
        this.data.length === 0
      ) {
        message("warning", "NFT授权", "信息未填写完整或未导入钱包文件");
        return;
      }

      try {
        // this.batchApprove(await this.queryChainId(), accelerate)
        let baseInfo: BaseInfo = await this.queryChainId();
        //@ts-ignore
        baseInfo["address"] = this.data[0]["钱包地址"];
        baseInfo["nonce"] = await this.store.web3.eth.getTransactionCount(
          //@ts-ignore
          baseInfo["address"]
        );
        //@ts-ignore
        baseInfo["privateKey"] = this.data[0]["钱包私钥"];

        this.approve(baseInfo, accelerate);
      } catch (e) {
        console.error(e);
        message("warning", "NFT授权", "执行出错,请重新执行");
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

      let txData;

      if (this.checked) {
        txData = this.contract.methods
          .approve(this.spender.trim(), this.approveNftId.trim())
          .encodeABI();
      } else {
        txData = this.contract.methods
          .setApprovalForAll(
            this.spender.trim(),
            this.approveNftId.trim() === "1" ? true : false
          )
          .encodeABI();
      }

      config.to = this.contractAddress;
      config.data = txData;
      config.gas = this.gas;

      if (accelerate) {
        config.gasPrice = this.toWei(this.maxFeePerGas, "gwei");
      } else {
        config.maxFeePerGas = this.toWei(this.maxFeePerGas, "gwei");
        config.maxPriorityFeePerGas = this.toWei(
          this.store.maxPriorityFeePerGas,
          "gwei"
        );
      }

      //@ts-ignore
      this.sendTransaction(config, address, privateKey);
    },
    //Gas估算
    async estimateGas() {
      if (this.contractAddress.trim().length === 0 || this.data.length === 0) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      //@ts-ignore
      if (this.approveNftId.trim().length === 0) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      if (this.checked) {
        this.currentGas = await this.contract.methods
          .approve(this.spender, this.approveNftId.trim())
          //@ts-ignore
          .estimateGas({ from: this.data[0]["钱包地址"] });
      } else {
        this.currentGas = await this.contract.methods
          .setApprovalForAll(
            this.spender,
            this.approveNftId.trim() === "1" ? true : false
          )
          //@ts-ignore
          .estimateGas({ from: this.data[0]["钱包地址"] });
      }

      this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

      message("success", "燃料限制估算", this.currentGas);
    },
    //查询chainId
    async queryChainId() {
      return {
        chainId: await this.store.web3.eth.getChainId(),
      };
    },
    //发送交易
    sendTransaction(
      config: TransactionConfig,
      _address: string,
      privateKey: string
    ) {
      //TODO send signed transaction
      this.web3.eth.accounts.signTransaction(
        config,
        privateKey,
        (_error, signedTransaction) => {
          this.web3.eth
            .sendSignedTransaction(
              //@ts-ignore
              signedTransaction.rawTransaction
            )
            .once("transactionHash", (_txHash) => {
              message("success", "NFT授权", "交易已发送");
            })
            .catch((error) => {
              console.error(error);
              message("error", "NFT授权", "交易发送失败,请重试");
            });
        }
      );
    },
    importWalletFile() {
      //@ts-ignore
      this.fileList = [this.fileList[this.fileList.length - 1]];
      const csvFile = new File(
        //@ts-ignore
        [this.fileList[0].originFileObj],
        //@ts-ignore
        this.fileList[0].name
      );
      Papa.parse(csvFile, {
        skipEmptyLines: "greedy",
        header: true,
        complete: (result, _file) => {
          //@ts-ignore
          this.data = result.data;
          //@ts-ignore
          this.walletAddress = this.data[0]["钱包地址"];
        },
      });
    },
  },
});
</script>

<style scoped></style>
