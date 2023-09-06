import { createRouter, createWebHashHistory } from 'vue-router'
import store from '../stores/store'
import StartToUse from '../views/StartToUse.vue'
import OneToOne from '../views/transfer/OneToOne.vue'
import OneToMany from '../views/transfer/OneToMany.vue'
import ManyToOne from '../views/transfer/ManyToOne.vue'
import SingleQuery from '../views/balance-query/SingleQuery.vue'
import MultiQuery from '../views/balance-query/MultiQuery.vue'
import WalletCreate from '../views/WalletCreate.vue'
import WalletApprove from '../views/WalletApprove.vue'
import AdvancedCall from '../views/AdvancedCall.vue'
import Transfer from '../views/nft/Transfer.vue'
import Approve from '../views/nft/Approve.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/start-to-use'
    },
    {
      name: '开始使用',
      path: '/start-to-use',
      component: StartToUse,
    },
    {
      name: '代币转账',
      path: '/transfer',
      children: [
        {
          name: '一转一',
          path: 'one-to-one',
          component: OneToOne,
        },
        {
          name: '一转多',
          path: 'one-to-many',
          component: OneToMany,
        },
        {
          name: '多转一',
          path: 'many-to-one',
          component: ManyToOne,
        }
      ]
    },
    {
      name: '余额查询',
      path: '/balance-query',
      children: [
        {
          name: '单钱包查询',
          path: 'single-query',
          component: SingleQuery,
        },
        {
          name: '多钱包查询',
          path: 'multi-query',
          component: MultiQuery,
        }
      ]
    },
    {
      name: '钱包授权',
      path: '/wallet-approve',
      component: WalletApprove
    },
    {
      name: '高级调用',
      path: '/advanced-call',
      component: AdvancedCall
    },
    {
      name: 'NFT',
      path: '/nft',
      children: [
        {
          name: '转账',
          path: 'transfer',
          component: Transfer
        },
        {
          name: '授权',
          path: 'approve',
          component: Approve
        }
      ]
    },
    {
      name: '钱包创建',
      path: '/wallet-create',
      component: WalletCreate
    }
  ]
})

router.beforeEach((guard) => {
  if (guard.path.startsWith('/transfer') || guard.path.startsWith('/balance-query')) {
    store().changeShowTokenType(true)
  } else {
    store().changeShowTokenType(false)
  }
  if (guard.path.includes('start-to-use') || guard.path.includes('wallet-create')) {
    store().changeShowMainnet(false)
  } else {
    store().changeShowMainnet(true)
  }
})

export default router
