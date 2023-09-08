<template>
  <div>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="contractAddress"
          addonBefore="合约地址"
          placeholder="输入要转账的NFT合约地址"
        ></a-input>
      </a-col>
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="toAddress"
          addonBefore="转入地址"
          placeholder="输入接收NFT的地址"
        ></a-input>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="NftIds"
          addonBefore="NFT编号"
          placeholder="NFT ID(多个NFT编号用 , 隔开)"
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
          @confirm="transferNfts(false)"
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
          @confirm="transferNfts(true)"
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
import { message, os_abi, erc1155_abi, nft_abi } from "../../common";
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

const osContractAddress = "0x0000000000c2d145a2526bD8C716263bFeBe1A72";

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
      toAddress: ref<string>(""),
      //钱包地址
      walletAddress: ref<string>("0x"),
      //合约地址
      contractAddress: ref<string>(""),
      //转账NFT ID
      NftIds: ref<string>(""),
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
    //合约对象
    contract() {
      return new this.store.web3.eth.Contract(os_abi, osContractAddress);
    },
    async nftType() {
      try {
        const nft_contract = new this.store.web3.eth.Contract(
          erc1155_abi,
          this.contractAddress
        );
        await nft_contract.methods
          .balanceOfBatch([this.store.web3.eth.accounts.create().address], [0])
          .call();
        return "ERC-1155";
      } catch (_e) {
        return "ERC-721";
      }
    },
    async isApprovedForAll() {
      const nftContract = new this.store.web3.eth.Contract(
        nft_abi,
        this.contractAddress
      );
      return await nftContract.methods
        .isApprovedForAll(
          //@ts-ignore
          this.data[0]["钱包地址"],
          "0x1E0049783F008A0085193E00003D00cd54003c71"
        )
        .call();
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
  methods: {
    //代币转账
    async transferNfts(accelerate: boolean) {
      if (
        this.NftIds.trim().length === 0 ||
        this.contractAddress.trim().length === 0 ||
        this.toAddress.trim().length === 0 ||
        this.maxFeePerGas.trim().length === 0 ||
        this.gas.trim().length === 0 ||
        this.data.length === 0
      ) {
        message("warning", "NFT转账", "信息未填写完整或未导入钱包文件");
        return;
      }

      if (!(await this.isApprovedForAll)) {
        message("warning", "NFT转账", "未授权OpenSea,请先进行NFT授权");
        return;
      }

      try {
        let baseInfo: BaseInfo = await this.queryChainId();
        //@ts-ignore
        baseInfo["address"] = this.data[0]["钱包地址"];
        baseInfo["nonce"] = await this.store.web3.eth.getTransactionCount(
          //@ts-ignore
          baseInfo["address"]
        );
        //@ts-ignore
        baseInfo["privateKey"] = this.data[0]["钱包私钥"];

        this.transfer(baseInfo, accelerate);
      } catch (e) {
        console.error(e);
        message("warning", "NFT转账", "执行出错,请重新执行");
      }
    },
    //执行转账
    async transfer(
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
      let items: any[] = [];

      if ((await this.nftType) === "ERC-721") {
        this.NftIds.split(",").forEach((v, _i, _a) => {
          items.push({
            itemType: 2,
            token: this.contractAddress,
            identifier: v,
            amount: 1,
          });
        });
      } else {
        this.NftIds.split(",").forEach((v, _i, _a) => {
          items.push({
            itemType: 3,
            token: this.contractAddress,
            identifier: v,
            amount: 1,
          });
        });
      }

      txData = this.contract.methods
        .bulkTransfer(
          [
            {
              items: items,
              recipient: this.toAddress,
              validateERC721Receiver: true,
            },
          ],
          "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000"
        )
        .encodeABI();

      config.to = osContractAddress;
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

      if (!(await this.isApprovedForAll)) {
        message("warning", "燃料限制估算", "未授权OpenSea,请先进行NFT授权");
        return;
      }

      //@ts-ignore
      if (
        this.NftIds.trim().length === 0 ||
        this.toAddress.trim().length === 0
      ) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      let items: any[] = [];

      if ((await this.nftType) === "ERC-721") {
        this.NftIds.split(",").forEach((v, _i, _a) => {
          items.push({
            itemType: 2,
            token: this.contractAddress,
            identifier: v,
            amount: 1,
          });
        });
      } else {
        this.NftIds.split(",").forEach((v, _i, _a) => {
          items.push({
            itemType: 3,
            token: this.contractAddress,
            identifier: v,
            amount: 1,
          });
        });
      }
      try {
        this.currentGas = await this.contract.methods
          .bulkTransfer(
            [
              {
                items: items,
                recipient: this.toAddress,
                validateERC721Receiver: true,
              },
            ],
            "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000"
          )
          //@ts-ignore
          .estimateGas({ from: this.data[0]["钱包地址"] });

        this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

        message("success", "燃料限制估算", this.currentGas);
      } catch (e) {
        console.error(e);
        message("error", "燃料限制估算", "执行出错,请重新执行");
      }
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
      this.store.web3.eth.accounts.signTransaction(
        config,
        privateKey,
        (_error, signedTransaction) => {
          this.store.web3.eth
            .sendSignedTransaction(
              //@ts-ignore
              signedTransaction.rawTransaction
            )
            .once("transactionHash", (_txHash) => {
              message("success", "NFT转账", "交易已发送");
            })
            .catch((error) => {
              console.error(error);
              message("error", "NFT转账", "交易发送失败,请重试");
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
