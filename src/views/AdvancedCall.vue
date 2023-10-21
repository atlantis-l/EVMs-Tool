<template>
  <div>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="contractAddress"
          addonBefore="调用合约"
          placeholder="输入要进行调用的合约地址"
        ></a-input>
      </a-col>
      <a-col span="12">
        <a-input
          allow-clear
          v-model:value="contractABI"
          addonBefore="合约ABI"
          placeholder="粘贴合约代码页面的ABI到此处"
        ></a-input>
      </a-col>
    </a-row>
    <a-row :gutter="gutter">
      <a-col span="12">
        <a-select
          style="width: 100%"
          show-search
          v-model:value="functionName"
          placeholder="选择要调用的合约函数"
          :options="options"
          @change="handleChange"
        />
      </a-col>
    </a-row>
    <a-divider style="user-select: none" v-show="parameters.length !== 0"
      >函数参数</a-divider
    >
    <a-row :gutter="gutter">
      <template v-for="parameter in parameters">
        <a-col span="12" style="margin-bottom: 20px">
          <a-input
            allow-clear
            :placeholder="`输入「${parameter.name}」`"
            :addonBefore="parameter.name"
            v-model:value="parameter.value"
          />
        </a-col>
      </template>
    </a-row>
    <a-row
      :gutter="gutter"
      style="margin-top: -20px; margin-bottom: 40px"
      type="flex"
    >
      <a-col flex="1 0"></a-col>
      <a-col flex="0 1 206px">
        <a-input
          allow-clear
          v-model:value="maxFeePerGas"
          style="text-align: center"
          addonBefore="燃料价格"
          :placeholder="store.currentGasPrice"
        ></a-input>
      </a-col>
      <a-col flex="0 1 206px">
        <a-input
          allow-clear
          :placeholder="currentGas"
          v-model:value="gas"
          style="text-align: center"
          addonBefore="燃料限制"
        />
      </a-col>
      <a-col flex="0 1">
        <a-button type="primary" @click="estimateGas" ghost
          >燃料限制估算</a-button
        >
      </a-col>
    </a-row>
    <a-row type="flex" style="margin-top: -20px">
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
          title="执行「合约调用」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="contractCall(false)"
        >
          <a-button type="primary" :disabled="loading"
            >执行「合约调用」</a-button
          >
        </a-popconfirm>
      </a-col>
      <a-col flex="0 1">
        <a-popconfirm
          placement="bottomRight"
          title="加速执行「合约调用」"
          ok-text="确认"
          cancel-text="取消"
          @confirm="contractCall(true)"
        >
          <a-tooltip placement="left">
            <template #title>
              <span
                >当交易长时间未完成时, <br />可以提高燃料价格来加速交易</span
              >
            </template>
            <a-button type="primary" :disabled="loading"
              >加速执行「合约调用」</a-button
            >
          </a-tooltip>
        </a-popconfirm>
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="8">
        <a-statistic title="执行调用钱包数量" :value="data.length" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="调用成功钱包数量" :value="checkedWallets.length" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="调用失败钱包数量" :value="failedWallets.length" />
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
import { message, convertDecimalsToUnit, sleep } from "../common";
import { TransactionConfig } from "web3-core";
import { FileAddFilled } from "@ant-design/icons-vue";
import BigNumber from "bignumber.js";
import { AbiItem } from "web3-utils";

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
      //合约ABI
      contractABI: ref<string>(""),
      //ABI JSON对象
      jsonABI: ref<AbiItem[]>([]),
      //选择的合约函数
      functionName: ref<string>(),
      //函数的参数列表
      parameters: ref<{ name: string; value: string }[]>([]),
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
      return this.store.getContract(
        JSON.parse(this.contractABI),
        this.contractAddress
      );
    },
    //查询总次数
    txCount() {
      return this.checkedWallets.length + this.failedWallets.length;
    },
    options() {
      if (this.contractABI.trim().length === 0) return [];
      try {
        const contractFunctions: object[] = [];
        this.jsonABI.forEach((o: AbiItem) => {
          if (
            o.type === "function" &&
            //@ts-ignore
            !["view", "pure", "constant"].includes(o.stateMutability)
          ) {
            contractFunctions.push({
              label: o.name,
              value: o.name,
              key: o.name,
            });
          }
        });
        return contractFunctions;
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    singleFee() {
      return this.store.getSingleFee(this.maxFeePerGas, this.data, this.gas);
    },
    totalFee() {
      return this.store.getTotalFee(this.maxFeePerGas, this.data, this.gas);
    },
    originFunctionName() {
      const fn = this.functionName?.split(" ")[0];
      return fn?.substring(1, fn.length - 1);
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
        "高级调用"
      );
    },
    "nonceMap.size"() {
      if (this.nonceMap.size == this.data.length) {
        message("success", "刷新「Nonce」", "「Nonce」已刷新");
        this.loading = false;
      }
    },
    contractABI() {
      try {
        this.functionName = undefined;
        this.jsonABI = JSON.parse(this.contractABI);
        this.jsonABI.forEach((o: AbiItem) => {
          o.name = `「${o.name}」 #${this.web3.eth.accounts
            .create()
            .address.substring(6, 16)
            .toLocaleLowerCase()}`;
        });
      } catch (e) {
        this.parameters = [];
      }
    },
  },
  methods: {
    //代币转账
    async contractCall(accelerate: boolean) {
      this.checkedWallets = [];
      this.failedWallets = [];

      if (this.nonceMap.size !== this.data.length) {
        message("warning", "高级调用", "需点击刷新Nonce");
        return;
      }

      if (
        this.contractAddress.trim().length === 0 ||
        this.data.length === 0 ||
        this.contractABI.trim().length === 0 ||
        this.functionName === undefined ||
        this.gas.trim().length === 0 ||
        this.maxFeePerGas.trim().length === 0
      ) {
        message("warning", "高级调用", "信息未填充完整或钱包文件未导入");
        return;
      }

      try {
        this.batchCall({ chainId: await this.store.getChainId() }, accelerate);
      } catch (e) {
        console.error(e);
        message("warning", "高级调用", "执行出错,请重新执行");
      }
    },
    async batchCall(baseInfo: BaseInfo, accelerate: boolean) {
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

        this.call(baseInfo, accelerate);
      }
    },
    //执行转账
    async call(
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

      const AsyncFunction = async function () {}.constructor;

      let asyncFunc = AsyncFunction(
        "contract",
        `
                const result = contract.methods.${
                  this.originFunctionName
                }(${this.concatParameters()})
                .encodeABI()

                return result;
                `
      );

      const txData = await asyncFunc(this.contract);

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
        this.contractABI.trim().length === 0 ||
        this.functionName === undefined
      ) {
        message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
        return;
      }

      for (let i = 0; i < this.parameters.length; i++) {
        const o = this.parameters[i];
        if (o.value.trim().length === 0) {
          message("warning", "燃料限制估算", "信息未填充完整或钱包文件未导入");
          return;
        }
      }

      const AsyncFunction = async function () {}.constructor;

      //@ts-ignore
      const address = this.data[0]["钱包地址"];

      let asyncFunc = AsyncFunction(
        "contract",
        `
                const result = await contract.methods.${
                  this.originFunctionName
                }(${this.concatParameters()})
                .estimateGas({from:'${address}'})

                return result;
                `
      );

      this.currentGas = await asyncFunc(this.contract);

      this.currentGas = new BigNumber(this.currentGas).plus("1000").toFixed();

      message("success", "燃料限制估算", this.currentGas);
    },
    handleChange(value: string) {
      this.parameters = [];
      this.jsonABI.forEach((o: AbiItem) => {
        if (o.name === value) {
          o.inputs?.forEach((v) => {
            this.parameters.push({
              name: v.name,
              value: "",
            });
          });
        }
      });
    },
    concatParameters() {
      let parameters = "";

      for (let i = 0; i < this.parameters.length; i++) {
        const o = this.parameters[i];
        parameters += `'${o.value}',`;
      }

      return parameters;
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
        "高级调用",
        () => (this.loading = true)
      );
    },
  },
});
</script>

<style scoped></style>
