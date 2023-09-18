import { defineStore } from "pinia";
import { Data, message, sleep } from "../common/index";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { TransactionConfig } from "web3-core";
import Papa from "papaparse";
import FileSaver from "file-saver";

const TIMEOUT = 10000;
const toWei = Web3.utils.toWei;
const fromWei = Web3.utils.fromWei;

export default defineStore("store", {
  state: () => ({
    provider: process.env["provider"],
    mainnet: process.env["mainnet"],
    providers: {
      ETH: "https://rpc.ankr.com/eth",
      BSC: "https://rpc.ankr.com/bsc",
      Polygon: "https://rpc.ankr.com/polygon",
      Fantom: "https://rpc.ankr.com/fantom",
      Avalanche: "https://rpc.ankr.com/avalanche",
      Arbitrum: "https://rpc.ankr.com/arbitrum",
      Optimism: "https://rpc.ankr.com/optimism",
    },
    _web: new Web3(
      //@ts-ignore
      new Web3.providers.HttpProvider(process.env["provider"], {
        keepAlive: true,
        timeout: TIMEOUT, //请求超时ms
      })
    ),
    tokenType: process.env["tokenType"],
    showTokenType: false,
    showMainnet: false,
    currentPath: process.env["currentPath"],
    selectedKeys: process.env["selectedKeys"]?.split(","),
    menuFoldState: process.env["menuFoldState"],
    currentGasPrice: "",
    maxPriorityFeePerGas: "2.5",
    txHash: {
      oneToOne:
        process.env["txHash.oneToOne"]?.split(",")[0].length === 0
          ? []
          : process.env["txHash.oneToOne"]?.split(","),
    },
  }),
  actions: {
    changeMainnet(
      provider:
        | "ETH"
        | "BSC"
        | "Polygon"
        | "Fantom"
        | "Avalanche"
        | "Arbitrum"
        | "Optimism"
    ) {
      process.env["mainnet"] = provider;
      process.env["provider"] = this.providers[provider];
      this.provider = process.env["provider"];
      this.mainnet = process.env["mainnet"];
      message("success", `主网切换(${this.mainnet})`, this.provider);
    },
    changeCustomMainnet(provider: string | undefined): boolean {
      if (provider === undefined || provider.trim().length === 0) {
        message("warning", "主网切换(自定义)", "切换失败, 检查输入链接...");
        return false;
      }
      process.env["mainnet"] = "自定义";
      process.env["provider"] = provider;
      this.provider = process.env["provider"];
      this.mainnet = process.env["mainnet"];
      message("success", `主网切换(${this.mainnet})`, this.provider);
      return true;
    },
    changeShowTokenType(flag: boolean) {
      this.showTokenType = flag;
    },
    changeShowMainnet(flag: boolean) {
      this.showMainnet = flag;
    },
    changeTokenType(type: string) {
      process.env["tokenType"] = type;
      this.tokenType = process.env["tokenType"];
      message("success", `代币切换`, this.tokenType);
    },
    changeCurrentPath(path: string) {
      process.env["currentPath"] = path;
      this.currentPath = process.env["currentPath"];
    },
    changeSelectedKeys(selectedKeys: string[]) {
      //@ts-ignore
      process.env["selectedKeys"] = selectedKeys;
      //@ts-ignore
      this.selectedKeys = process.env["selectedKeys"]?.split(",");
    },
    changeMenuFoldState(state: string) {
      process.env["menuFoldState"] = state;
      this.menuFoldState = process.env["menuFoldState"];
    },
    changeCurrentGasPrice(gasPrice: string) {
      this.currentGasPrice = gasPrice;
    },
    addTxHash(path: string, txHash: string) {
      //@ts-ignore
      this.txHash[path.split(".")[1]].push(txHash);
      //@ts-ignore
      process.env[path] = this.txHash[path.split(".")[1]];
    },
    getSingleFee(maxFeePerGas: string, data: any, gas: string) {
      if (this.tokenType === "原生代币") {
        gas = "21000";
      }

      if (
        maxFeePerGas.trim().length === 0 ||
        gas.trim().length === 0 ||
        data.length === 0
      )
        return 0;

      return fromWei(
        parseFloat(toWei(maxFeePerGas, "Gwei")) * parseFloat(gas) + "",
        "ether"
      );
    },
    getTotalFee(maxFeePerGas: string, data: any, gas: string): any {
      return (
        parseFloat(this.getSingleFee(maxFeePerGas, data, gas) + "") *
        data.length
      );
    },
    getContract(abi: AbiItem[], address: string) {
      return new this.web3.eth.Contract(abi, address);
    },
    getChainId() {
      return this.web3.eth.getChainId();
    },
    sendTransaction(
      config: TransactionConfig,
      address: string,
      privateKey: string,
      success: Function,
      reject: Function
    ) {
      //send signed transaction
      this.web3.eth.accounts.signTransaction(
        config,
        privateKey,
        (_, signedTransaction) => {
          this.web3.eth
            .sendSignedTransaction(
              //@ts-ignore
              signedTransaction.rawTransaction
            )
            .once("transactionHash", (txHash) => {
              success(address, txHash);
            })
            .catch((error) => {
              reject(error, address);
            });
        }
      );
    },
    getTxDownload(
      v: number,
      data: object[],
      nonceMap: Map<string, string>,
      checkedWallets: string[][],
      failedWallets: string[][],
      fileName: string
    ) {
      if (v === data.length) {
        nonceMap.clear();

        let data: Data = {
          fields: undefined,
          data: undefined,
        };

        data.fields = ["钱包地址", "交易哈希"];

        data.data = checkedWallets.concat(failedWallets);

        //@ts-ignore
        const result = Papa.unparse(data);

        FileSaver.saveAs(
          new Blob([result], { type: "text/plain;charset=utf-8" }),
          `${fileName}.csv`
        );
      }
    },
    //Gas消耗策略(老式策略或者EIP-1159策略)
    setGasStratgy(
      accelerate: boolean,
      config: TransactionConfig,
      maxFeePerGas: string
    ) {
      if (accelerate) {
        config.gasPrice = toWei(maxFeePerGas, "gwei");
      } else {
        config.maxFeePerGas = toWei(maxFeePerGas, "gwei");
        config.maxPriorityFeePerGas = toWei(this.maxPriorityFeePerGas, "gwei");
      }
    },
    async queryNonce(
      data: object[],
      nonceMap: Map<string, string>,
      name: string,
      setLoading: Function
    ) {
      if (data.length === 0) {
        message("warning", name, "钱包文件未导入");
        return;
      }

      setLoading();
      nonceMap.clear();

      let batchRequest = new this.web3.eth.BatchRequest();

      for (let i = 0; i < data.length; i++) {
        const request = this.web3.eth.getTransactionCount
          //@ts-ignore
          .request(data[i]["钱包地址"], (error, nonce) => {
            if (!error) {
              //@ts-ignore
              nonceMap.set(data[i]["钱包地址"], nonce);
            }
          });

        batchRequest.add(request);

        //执行100次批量查询后暂停5秒
        await sleep(i / 100);

        //每100个钱包作为一次批量查询
        if ((i + 1) % 100 === 0) {
          batchRequest.execute();
          batchRequest = new this.web3.eth.BatchRequest();
        }
      }

      //查询最后未满100个钱包的批量查询
      if (data.length % 100 !== 0) {
        batchRequest.execute();
      }
    },
    importWalletFile(fileList: never[], data: Object[], action: Function) {
      //@ts-ignore
      fileList = [fileList[fileList.length - 1]];
      //@ts-ignore
      const csvFile = new File([fileList[0].originFileObj], fileList[0].name);
      Papa.parse(csvFile, {
        skipEmptyLines: "greedy",
        header: true,
        complete: (result, _file) => {
          while (data.pop());
          result.data.forEach((v, _i, _a) => {
            //@ts-ignore
            data.push(v);
          });
          //@ts-ignore
          action(data[0]);
        },
      });
    },
  },
  getters: {
    web3: (state) => {
      state._web.setProvider(
        //@ts-ignore
        new Web3.providers.HttpProvider(state.provider, {
          keepAlive: true,
          timeout: TIMEOUT,
        })
      );
      return state._web;
    },
    collapsed: (state) => {
      if (state.menuFoldState === "unfold") {
        return false;
      } else if (state.menuFoldState === "fold") {
        return true;
      }
    },
  },
});
