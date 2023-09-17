<template>
  <a-config-provider :locale="locale">
    <a-layout style="min-height: 100vh">
      <a-layout-sider
        ref="sider"
        v-model:collapsed="store.collapsed"
        :trigger="null"
        collapsible
        :style="{
          overflow: 'auto',
          minHeight: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }"
      >
        <div style="margin: 10px 0 6px 0; text-align: center">
          <img src="/electron.png" height="48" />
        </div>

        <a-menu
          theme="dark"
          mode="inline"
          @click="menuClick"
          v-model:selectedKeys="selectedKeys"
          v-model:openKeys="openKeys"
        >
          <a-menu-item key="start-to-use">
            <template #icon>
              <HomeFilled />
            </template>
            <span>开始使用</span>
          </a-menu-item>

          <a-sub-menu title="代币转账" key="transfer">
            <template #icon>
              <InteractionFilled />
            </template>
            <a-menu-item key="one-to-one">一转一</a-menu-item>
            <a-menu-item key="one-to-many">一转多</a-menu-item>
            <a-menu-item key="many-to-one">多转一</a-menu-item>
          </a-sub-menu>

          <a-sub-menu title="余额查询" key="balance-query">
            <template #icon>
              <DollarCircleFilled />
            </template>
            <a-menu-item key="single-query">单钱包</a-menu-item>
            <a-menu-item key="multi-query">多钱包</a-menu-item>
          </a-sub-menu>

          <a-menu-item key="wallet-approve">
            <template #icon>
              <SafetyCertificateFilled />
            </template>
            <span>钱包授权</span>
          </a-menu-item>

          <a-sub-menu title="NFT" key="nft">
            <template #icon>
              <CodeSandboxSquareFilled />
            </template>
            <a-menu-item key="transfer">转账</a-menu-item>
            <a-menu-item key="approve">授权</a-menu-item>
          </a-sub-menu>

          <a-menu-item key="advanced-call">
            <template #icon>
              <CodeFilled />
            </template>
            <span>高级调用</span>
          </a-menu-item>

          <a-menu-item key="wallet-create">
            <template #icon>
              <WalletFilled />
            </template>
            <span>钱包创建</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout
        :style="{
          marginLeft: store.collapsed ? '80px' : '200px',
          transition: 'margin-left 0.2s',
        }"
      >
        <a-layout-header
          ref="header"
          :style="{ background: '#fff', padding: '0' }"
        >
          <a-row type="flex">
            <a-col flex="50px">
              <menu-unfold-outlined
                v-if="store.collapsed"
                class="trigger"
                @click="menuUnfold"
              />

              <menu-fold-outlined
                v-else
                class="trigger"
                @click="() => store.changeMenuFoldState('fold')"
              />
            </a-col>

            <a-col flex="1 0">
              <a-breadcrumb style="user-select: none; padding-top: 19.5px">
                <template v-for="path in paths">
                  <a-breadcrumb-item>{{ path }}</a-breadcrumb-item>
                </template>
              </a-breadcrumb>
            </a-col>

            <a-col flex="0 1 134px">
              <a-tooltip placement="leftTop">
                <template #title>
                  <span style="text-align: center; display: block">
                    代币切换(举例)
                    <br />
                    【ETH】链【原生代币】为【ETH】
                    <br />
                    【BSC】链【原生代币】为【BNB】
                    <br />
                    【合约代币】指代币有【合约地址】
                  </span>
                </template>
                <a-select
                  style="width: 110px"
                  v-show="store.showTokenType"
                  v-model:value="selectTokenValue"
                  :options="tokenOptions"
                  @change="handleTokenTypeChange"
                />
              </a-tooltip>
            </a-col>

            <a-col flex="0 1 134px">
              <a-tooltip placement="left">
                <template #title>
                  <span>主网切换</span>
                </template>
                <a-select
                  style="width: 110px"
                  v-show="store.showMainnet"
                  v-model:value="selectValue"
                  :options="options"
                  @change="handleMainnetChange"
                />
              </a-tooltip>
            </a-col>
          </a-row>

          <a-modal
            v-model:open="visible"
            title="自定义主网"
            style="top: 180px"
            @cancel="handleModalCancel"
          >
            <a-input
              addonBefore="网址"
              v-model:value="customMainnet"
              placeholder="主网必须兼容以太坊虚拟机..."
            ></a-input>
            <template #footer>
              <a-button type="primary" @click="handleModalOk">确定</a-button>
              <a-button type="danger" ghost @click="handleModalCancel"
                >取消</a-button
              >
            </template>
          </a-modal>
        </a-layout-header>

        <a-layout-content
          :style="`margin: 24px;padding: 24px; background: #fff;height: ${height}px;overflow: scroll;`"
        >
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script lang="ts">
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  WalletFilled,
  HomeFilled,
  MoneyCollectFilled,
  InteractionFilled,
  DollarCircleFilled,
  SafetyCertificateFilled,
  CodeFilled,
  CodeSandboxSquareFilled,
} from "@ant-design/icons-vue";
import { defineComponent, ref } from "vue";
import store from "./stores/store";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");

export default defineComponent({
  components: {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    WalletFilled,
    HomeFilled,
    MoneyCollectFilled,
    InteractionFilled,
    DollarCircleFilled,
    SafetyCertificateFilled,
    CodeFilled,
    CodeSandboxSquareFilled,
  },
  data() {
    return {
      locale: zhCN,
      platform: process.platform,
      visible: ref<boolean>(false),
      //@ts-ignore
      selectedKeys: ref<string[]>(store().selectedKeys),
      openKeys: ref<string[]>([]),
      paths: ref<string[]>(["开始使用"]),
      customMainnet: ref<string>(),
      store: store(),
      selectValue: ref<string | undefined>(store().mainnet),
      selectTokenValue: ref<string | undefined>(store().tokenType),
      tokenOptions: ref([
        { value: "原生代币", label: "原生代币" },
        { value: "合约代币", label: "合约代币" },
      ]),
      options: ref([
        { value: "ETH", label: "ETH" },
        { value: "BSC", label: "BSC" },
        { value: "Polygon", label: "Polygon" },
        { value: "Fantom", label: "Fantom" },
        { value: "Avalanche", label: "Avalanche" },
        { value: "Arbitrum", label: "Arbitrum" },
        { value: "Optimism", label: "Optimism" },
        { value: "自定义", label: "自定义" },
      ]),
      interval: ref<NodeJS.Timer>(),
      height: ref<number>(0),
    };
  },
  beforeMount() {
    //@ts-ignore 恢复到最近路由路径
    this.$router.push(this.store.currentPath).then(() => {
      //面包屑导航
      this.paths = [];
      this.$route.matched.forEach((v, _i, _a) => {
        //@ts-ignore
        this.paths.push(v.name);
      });

      //子菜单开闭
      if (!this.store.collapsed) {
        this.setOpenKeys();
      }
    });

    this.getCurrentGasPrice();

    this.interval = setInterval(() => {
      this.getCurrentGasPrice();
    }, 10000);
  },
  mounted() {
    let height =
      //@ts-ignore
      this.$refs.sider.$el.offsetHeight - this.$refs.header.$el.offsetHeight;
    height -= 48;
    this.height = height;
  },
  methods: {
    //模态窗口事件
    showModal() {
      this.visible = true;
    },
    //模态窗口事件
    handleModalOk() {
      if (this.store.changeCustomMainnet(this.customMainnet)) {
        clearInterval(this.interval);

        this.getCurrentGasPrice();

        this.interval = setInterval(() => {
          this.getCurrentGasPrice();
        }, 10000);

        this.visible = false;
      }
    },
    //模态窗口事件
    handleModalCancel() {
      this.visible = false;
      this.selectValue = this.store.mainnet;
    },
    //菜单事件
    menuClick(event: Event) {
      //路由切换
      this.$router.push(`/${event.keyPath.join("/")}`).then(() => {
        //面包屑导航
        this.paths = [];
        this.$route.matched.forEach((v, _i, _a) => {
          //@ts-ignore
          this.paths.push(v.name);
        });
        //存储全局路由路径
        this.store.changeCurrentPath(`/${event.keyPath.join("/")}`);
        //存储全局菜单选中项
        this.store.changeSelectedKeys(event.keyPath);
        //设置菜单开闭
        this.setOpenKeys();
      });
    },
    //主网切换
    handleMainnetChange(value: string) {
      if (value === "自定义") {
        this.showModal();
        return;
      }
      //@ts-ignore
      this.store.changeMainnet(value);

      clearInterval(this.interval);

      this.getCurrentGasPrice();

      this.interval = setInterval(() => {
        this.getCurrentGasPrice();
      }, 10000);
    },
    //代币类型切换
    handleTokenTypeChange(value: string) {
      this.store.changeTokenType(value);
    },
    menuUnfold() {
      this.store.changeMenuFoldState("unfold");
      this.setOpenKeys();
    },
    setOpenKeys() {
      let openKeys = this.$route.path.split("/").reverse();
      openKeys.pop();
      openKeys = openKeys.reverse();
      openKeys.pop();
      this.openKeys = openKeys;
    },
    getCurrentGasPrice() {
      this.store.web3.eth
        .getGasPrice((error, gasPrice) => {
          if (error === null) {
            gasPrice = this.store.web3.utils.fromWei(gasPrice, "Gwei");
            gasPrice =
              Math.ceil(
                parseFloat(gasPrice) +
                  parseFloat(this.store.maxPriorityFeePerGas)
              ) + "";
            this.store.changeCurrentGasPrice(gasPrice);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    },
  },
});
</script>

<style>
.ant-row {
  margin: 0 0 20px 0;
}

.ant-upload-list {
  display: none;
}

.ant-layout-sider {
  user-select: none;
}

.ant-layout-header .trigger {
  font-size: 18px;
  line-height: 64px;
  padding: 0 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.ant-layout-header .trigger:hover {
  color: #ff8f18;
}

.ant-notification {
  user-select: none;
}

.ant-layout-sider-children .logo {
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
  margin: 16px;
}

*::-webkit-scrollbar {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
