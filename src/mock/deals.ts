import type { Deal } from '../types/business-objects';

export const mockDeals: Deal[] = [
  {
    id: 'deal-001',
    name: '华为云混合云部署方案',
    stage: 'negotiation',
    amount: 1200000,
    customerId: 'cust-001',
  },
  {
    id: 'deal-002',
    name: '阿里云数据中台升级',
    stage: 'proposal',
    amount: 850000,
    customerId: 'cust-002',
  },
  {
    id: 'deal-003',
    name: '腾讯云安全合规改造',
    stage: 'qualification',
    amount: 600000,
    customerId: 'cust-003',
  },
  {
    id: 'deal-004',
    name: '字节跳动推荐引擎优化',
    stage: 'prospecting',
    amount: 450000,
    customerId: 'cust-004',
  },
  {
    id: 'deal-005',
    name: '京东云容器平台竞标',
    stage: 'proposal',
    amount: 780000,
    customerId: 'cust-005',
  },
  {
    id: 'deal-006',
    name: '百度云智能客服集成',
    stage: 'negotiation',
    amount: 520000,
    customerId: 'cust-006',
  },
  {
    id: 'deal-007',
    name: '阿里云边缘计算扩展',
    stage: 'closed_won',
    amount: 930000,
    customerId: 'cust-002',
  },
  {
    id: 'deal-008',
    name: '美团云上线部署',
    stage: 'closed_won',
    amount: 680000,
    customerId: 'cust-003',
  },
];

export function getDealById(id: string): Deal | undefined {
  return mockDeals.find((d) => d.id === id);
}
