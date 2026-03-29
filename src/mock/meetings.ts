import type { Meeting } from '../types/business-objects';

export const mockMeetings: Meeting[] = [
  {
    id: 'mtg-001',
    title: '华为云混合云方案第三轮沟通',
    date: '2026-03-25T10:00:00+08:00',
    dealId: 'deal-001',
    customerId: 'cust-001',
    duration: 62,
    recordingUrl: '/recordings/mtg-001.mp3',
  },
  {
    id: 'mtg-002',
    title: '阿里云数据中台需求评审',
    date: '2026-03-26T14:00:00+08:00',
    dealId: 'deal-002',
    customerId: 'cust-002',
    duration: 45,
    recordingUrl: '/recordings/mtg-002.mp3',
  },
  {
    id: 'mtg-003',
    title: '腾讯云采购流程对接',
    date: '2026-03-26T16:30:00+08:00',
    dealId: 'deal-003',
    customerId: 'cust-003',
    duration: 30,
  },
  {
    id: 'mtg-004',
    title: '字节跳动技术方案演示',
    date: '2026-03-27T09:30:00+08:00',
    dealId: 'deal-004',
    customerId: 'cust-004',
    duration: 55,
    recordingUrl: '/recordings/mtg-004.mp3',
  },
  {
    id: 'mtg-005',
    title: '京东云容器平台竞标答疑',
    date: '2026-03-27T15:00:00+08:00',
    dealId: 'deal-005',
    customerId: 'cust-005',
    duration: 40,
  },
  {
    id: 'mtg-006',
    title: '百度云智能客服集成进度同步',
    date: '2026-03-28T11:00:00+08:00',
    dealId: 'deal-006',
    customerId: 'cust-006',
    duration: 35,
    recordingUrl: '/recordings/mtg-006.mp3',
  },
];

export function getMeetingById(id: string): Meeting | undefined {
  return mockMeetings.find((m) => m.id === id);
}
