import type { Customer } from '../types/business-objects';

export const mockCustomers: Customer[] = [
  {
    id: 'cust-001',
    name: '华为云',
    industry: '云计算与ICT',
    contactName: '张伟',
    contactPhone: '13800138001',
  },
  {
    id: 'cust-002',
    name: '阿里云',
    industry: '云计算与电商',
    contactName: '王芳',
    contactPhone: '13800138002',
  },
  {
    id: 'cust-003',
    name: '腾讯云',
    industry: '云计算与社交',
    contactName: '李娜',
    contactPhone: '13800138003',
  },
  {
    id: 'cust-004',
    name: '字节跳动',
    industry: '短视频与内容平台',
    contactName: '刘强',
    contactPhone: '13800138004',
  },
  {
    id: 'cust-005',
    name: '京东云',
    industry: '电商与物流',
    contactName: '陈磊',
    contactPhone: '13800138005',
  },
  {
    id: 'cust-006',
    name: '百度云',
    industry: 'AI与搜索引擎',
    contactName: '赵敏',
    contactPhone: '13800138006',
  },
];

export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find((c) => c.id === id);
}
