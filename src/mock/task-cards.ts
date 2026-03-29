import type {
  VisitReportCard,
  ActionSuggestionCard,
  TaskCard,
} from '../types/task-card';

// 1. visit_report draft — 华为云拜访汇报，高置信度
const huaweiVisitDraft: VisitReportCard = {
  id: 'card-001',
  cardType: 'visit_report',
  status: 'draft',
  title: '华为云混合云方案第三轮沟通 - 拜访汇报',
  summary:
    '与华为云张伟团队完成第三轮方案沟通，客户对混合云部署架构表示认可，预算审批流程已启动。',
  sourceAgent: 'visit-report-agent',
  priority: 'high',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-25T12:30:00+08:00',
  updatedAt: '2026-03-25T12:30:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-001',
    customerId: 'cust-001',
    meetingId: 'mtg-001',
  },
  explainability: {
    confidence: 0.88,
    freshness: '3小时前',
    dataTimeRange: '2026-03-25 10:00 ~ 11:02',
    coverage: 0.92,
    missingData: [],
    keyReasons: [
      '会议录音已完整转写',
      '客户明确表达预算审批意向',
      '与历史沟通记录一致',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-001',
        label: '3月25日华为云沟通录音',
      },
      {
        type: 'deal_history',
        id: 'deal-001',
        label: '华为云混合云部署方案商机记录',
      },
    ],
  },
  meetingNotes: [
    {
      label: '方案确认',
      content:
        '客户对混合云架构方案表示认可，重点关注数据迁移的停机时间和安全合规性。',
    },
    {
      label: '预算讨论',
      content:
        '张伟提到内部预算审批已启动，预计两周内完成，总预算范围在100-130万之间。',
    },
    {
      label: '时间节点',
      content: '客户希望Q2末完成第一阶段部署，Q3完成全量迁移。',
    },
  ],
  customerAttitude: '积极正面，对方案整体满意',
  suggestedNextSteps: [
    '准备详细的数据迁移方案文档',
    '安排安全合规团队对接',
    '确认Q2部署排期',
  ],
  recordingDuration: 62,
};

// 2. visit_report reported — 阿里云拜访汇报，已汇报状态
const aliVisitReported: VisitReportCard = {
  id: 'card-002',
  cardType: 'visit_report',
  status: 'reported',
  title: '阿里云数据中台需求评审 - 拜访汇报',
  summary:
    '阿里云数据中台升级项目需求评审完成，客户提出新增实时分析模块的需求，需要调整报价方案。',
  sourceAgent: 'visit-report-agent',
  priority: 'medium',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-26T16:00:00+08:00',
  updatedAt: '2026-03-27T09:15:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-002',
    customerId: 'cust-002',
    meetingId: 'mtg-002',
  },
  explainability: {
    confidence: 0.91,
    freshness: '1天前',
    dataTimeRange: '2026-03-26 14:00 ~ 14:45',
    coverage: 0.95,
    missingData: [],
    keyReasons: [
      '会议录音转写完整',
      '需求变更点已明确标注',
      '与CRM商机阶段吻合',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-002',
        label: '3月26日阿里云需求评审录音',
      },
      {
        type: 'deal_history',
        id: 'deal-002',
        label: '阿里云数据中台升级商机记录',
      },
    ],
  },
  meetingNotes: [
    {
      label: '需求变更',
      content:
        '客户新增实时分析模块需求，需要支持每秒10万级事件处理，对现有方案架构有较大影响。',
    },
    {
      label: '报价调整',
      content: '王芳要求在本周内提供包含实时分析模块的更新报价。',
    },
  ],
  customerAttitude: '期望较高，对交付时间敏感',
  suggestedNextSteps: [
    '更新报价方案纳入实时分析模块',
    '评估技术实现难度与工期',
  ],
  recordingDuration: 45,
};

// 3. action_suggestion suggested — 跟进华为云预算确认，高优先级
const huaweiBudgetFollowup: ActionSuggestionCard = {
  id: 'card-003',
  cardType: 'action_suggestion',
  status: 'suggested',
  title: '跟进华为云预算审批进度',
  summary:
    '华为云张伟提到预算审批已启动，建议本周主动跟进确认审批进展，把握签约窗口。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'high',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-26T08:00:00+08:00',
  updatedAt: '2026-03-26T08:00:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-001',
    customerId: 'cust-001',
    meetingId: 'mtg-001',
  },
  explainability: {
    confidence: 0.82,
    freshness: '2天前',
    dataTimeRange: '2026-03-20 ~ 2026-03-25',
    coverage: 0.85,
    missingData: ['华为云内部审批流程文档', '竞品报价信息'],
    keyReasons: [
      '客户在会议中明确提到预算审批已启动',
      '商机金额120万处于客户常规审批周期内',
      '历史数据显示该客户审批周期约2周',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-001',
        label: '3月25日华为云沟通录音',
      },
      {
        type: 'deal_history',
        id: 'deal-001',
        label: '华为云混合云部署方案商机记录',
      },
    ],
  },
  suggestedAction: {
    label: '跟进华为云预算审批进度',
    editableDraft:
      '本周联系华为云张伟，确认预算审批进展和预计时间线。重点了解审批流程中是否有需要我们配合提供的材料，以及是否有其他决策人需要额外沟通。',
    dueDate: '2026-03-29',
  },
};

// 4. action_suggestion suggested + low_confidence — 京东云竞标风险
const jdBidRisk: ActionSuggestionCard = {
  id: 'card-004',
  cardType: 'action_suggestion',
  status: 'suggested',
  title: '京东云容器平台竞标风险预警',
  summary:
    '京东云容器平台项目可能存在竞标风险，近期客户对接频率下降，建议核实竞品动态。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'high',
  assigneeRole: 'manager',
  createdAt: '2026-03-27T10:00:00+08:00',
  updatedAt: '2026-03-27T10:00:00+08:00',
  trustFlags: ['low_confidence', 'data_stale'],
  businessContext: {
    dealId: 'deal-005',
    customerId: 'cust-005',
  },
  explainability: {
    confidence: 0.38,
    freshness: '5天前',
    dataTimeRange: '2026-03-15 ~ 2026-03-22',
    coverage: 0.45,
    missingData: [
      '最近一周客户沟通记录',
      '竞品报价与方案信息',
      '客户内部决策链变化',
    ],
    keyReasons: [
      '客户回复邮件时间延长至3天以上',
      '上周预约的技术交流被推迟',
      '行业情报显示竞品近期在该领域活跃',
    ],
    evidenceRefs: [
      {
        type: 'email',
        id: 'email-jd-0322',
        label: '3月22日京东云邮件往来',
      },
      {
        type: 'deal_history',
        id: 'deal-005',
        label: '京东云容器平台竞标商机记录',
      },
    ],
  },
  suggestedAction: {
    label: '核实京东云竞标情况',
    editableDraft:
      '尽快联系京东云陈磊了解项目评审最新进展，确认是否有竞品介入。如有必要，协调VP级别高层拜访增加竞争力。本周内反馈调查结果。',
    dueDate: '2026-03-30',
  },
};

// 5. action_suggestion confirmed — 更新阿里云报价方案
const aliQuoteUpdate: ActionSuggestionCard = {
  id: 'card-005',
  cardType: 'action_suggestion',
  status: 'confirmed',
  title: '更新阿里云数据中台报价方案',
  summary:
    '根据阿里云新增的实时分析模块需求，需要在本周内更新报价方案并发送给客户王芳。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'medium',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-27T09:30:00+08:00',
  updatedAt: '2026-03-27T14:00:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-002',
    customerId: 'cust-002',
    meetingId: 'mtg-002',
  },
  explainability: {
    confidence: 0.89,
    freshness: '1天前',
    dataTimeRange: '2026-03-26 14:00 ~ 14:45',
    coverage: 0.9,
    missingData: ['实时分析模块成本核算'],
    keyReasons: [
      '客户明确要求本周内收到更新报价',
      '需求评审会议中确认了新增模块规格',
      '当前商机处于proposal阶段',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-002',
        label: '3月26日阿里云需求评审录音',
      },
      {
        type: 'deal_history',
        id: 'deal-002',
        label: '阿里云数据中台升级商机记录',
      },
    ],
  },
  suggestedAction: {
    label: '更新阿里云报价方案',
    editableDraft:
      '根据阿里云新增的实时分析模块需求，本周内更新报价方案（总金额调整为98万元），完成后发送给客户王芳。需要和产品组确认实时分析模块的最新折扣政策。',
    dueDate: '2026-03-29',
  },
};

// 6. action_suggestion dispatched — 联系腾讯云采购部，已派发给李明
const tencentPurchaseContact: ActionSuggestionCard = {
  id: 'card-006',
  cardType: 'action_suggestion',
  status: 'dispatched',
  title: '联系腾讯云采购部确认合规流程',
  summary:
    '腾讯云安全合规改造项目需要与采购部李娜对接合规审查流程，确认供应商资质要求。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'medium',
  assigneeRole: 'sales',
  assigneeName: '李明',
  createdAt: '2026-03-27T11:00:00+08:00',
  updatedAt: '2026-03-27T16:00:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-003',
    customerId: 'cust-003',
    meetingId: 'mtg-003',
  },
  explainability: {
    confidence: 0.78,
    freshness: '1天前',
    dataTimeRange: '2026-03-26 16:30 ~ 17:00',
    coverage: 0.82,
    missingData: ['腾讯云供应商资质清单'],
    keyReasons: [
      '会议中客户提到需要完成供应商合规审查',
      '商机处于qualification阶段，合规审查是关键卡点',
      '采购部流程通常需要5-7个工作日',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-003',
        label: '3月26日腾讯云采购流程对接录音',
      },
      {
        type: 'deal_history',
        id: 'deal-003',
        label: '腾讯云安全合规改造商机记录',
      },
    ],
  },
  suggestedAction: {
    label: '对接腾讯云合规审查流程',
    editableDraft:
      '联系腾讯云采购部李娜，了解供应商合规审查具体要求和所需材料清单。准备好我们的供应商资质文件，争取本周完成材料提交。注意采购部流程通常需要5-7个工作日。',
    dueDate: '2026-03-31',
  },
};

// 7. action_suggestion feedback_submitted — 字节跳动技术评估
const bytedanceTechReview: ActionSuggestionCard = {
  id: 'card-007',
  cardType: 'action_suggestion',
  status: 'feedback_submitted',
  title: '字节跳动推荐引擎技术评估',
  summary:
    '安排与字节跳动技术团队进行推荐引擎优化方案的技术评估会议，评估算法兼容性。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'medium',
  assigneeRole: 'sales',
  assigneeName: '李明',
  createdAt: '2026-03-26T10:00:00+08:00',
  updatedAt: '2026-03-28T09:00:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-004',
    customerId: 'cust-004',
    meetingId: 'mtg-004',
  },
  explainability: {
    confidence: 0.75,
    freshness: '1天前',
    dataTimeRange: '2026-03-27 09:30 ~ 10:25',
    coverage: 0.8,
    missingData: ['字节跳动现有推荐引擎架构文档'],
    keyReasons: [
      '客户技术团队需要验证算法兼容性',
      '技术演示后客户提出深度评估要求',
      '商机处于prospecting阶段，技术评估是推进关键',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-004',
        label: '3月27日字节跳动技术方案演示录音',
      },
      {
        type: 'deal_history',
        id: 'deal-004',
        label: '字节跳动推荐引擎优化商机记录',
      },
    ],
  },
  suggestedAction: {
    label: '安排字节跳动技术评估会议',
    editableDraft:
      '和字节跳动刘强确认周四下午的技术评估会议时间。提前准备好推荐引擎算法兼容性测试结果和性能压测数据，确保我们的架构师团队当天能完整演示。',
    dueDate: '2026-03-30',
  },
  feedback: {
    result: 'partial',
    customerReaction: '客户同意周四下午技术评估，但要求增加性能压测环节',
    nextStepSuggestion: '准备性能压测方案和测试环境',
    notes: '已约定周四14:00，刘强和技术总监都会参加',
    submittedAt: '2026-03-28T09:00:00+08:00',
  },
};

// 8. action_suggestion completed — 美团云上线确认
const meituanLaunchConfirm: ActionSuggestionCard = {
  id: 'card-008',
  cardType: 'action_suggestion',
  status: 'completed',
  title: '美团云上线部署确认',
  summary:
    '美团云项目已完成第一阶段上线部署，确认所有服务运行正常，客户验收通过。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'low',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-24T09:00:00+08:00',
  updatedAt: '2026-03-27T18:00:00+08:00',
  trustFlags: [],
  businessContext: {
    dealId: 'deal-008',
    customerId: 'cust-003',
  },
  explainability: {
    confidence: 0.95,
    freshness: '1天前',
    dataTimeRange: '2026-03-24 ~ 2026-03-27',
    coverage: 0.98,
    missingData: [],
    keyReasons: [
      '部署验收报告已确认',
      '客户签署了阶段验收单',
      '所有监控指标正常运行超过48小时',
    ],
    evidenceRefs: [
      {
        type: 'deal_history',
        id: 'deal-008',
        label: '美团云上线部署商机记录',
      },
      {
        type: 'email',
        id: 'email-mt-0327',
        label: '3月27日美团云验收确认邮件',
      },
    ],
  },
  suggestedAction: {
    label: '完成美团云上线收尾',
    editableDraft:
      '给美团云客户发送正式的上线确认函和后续服务说明文档。同时启动第二阶段扩容规划的需求收集，争取趁热打铁推进。',
  },
  feedback: {
    result: 'completed',
    customerReaction: '客户对上线效果满意，已签署验收单',
    nextStepSuggestion: '启动第二阶段扩容规划',
    submittedAt: '2026-03-27T18:00:00+08:00',
  },
};

// 9. action_suggestion with sync_failed — 百度云同步飞书失败
const baiduSyncFailed: ActionSuggestionCard = {
  id: 'card-009',
  cardType: 'action_suggestion',
  status: 'suggested',
  title: '百度云智能客服集成方案跟进',
  summary:
    '百度云智能客服集成项目需要跟进技术对接进度，但飞书同步失败，部分沟通记录可能缺失。',
  sourceAgent: 'action-suggestion-agent',
  priority: 'medium',
  assigneeRole: 'sales',
  assigneeName: '王明',
  createdAt: '2026-03-28T08:00:00+08:00',
  updatedAt: '2026-03-28T08:00:00+08:00',
  trustFlags: ['sync_failed'],
  businessContext: {
    dealId: 'deal-006',
    customerId: 'cust-006',
    meetingId: 'mtg-006',
  },
  explainability: {
    confidence: 0.62,
    freshness: '刚刚',
    dataTimeRange: '2026-03-25 ~ 2026-03-28',
    coverage: 0.6,
    missingData: [
      '飞书群聊近3天消息记录（同步失败）',
      '客户最新技术对接反馈',
    ],
    keyReasons: [
      '商机处于negotiation阶段，需要持续跟进',
      '上次会议后客户提出集成测试需求',
      '注意：飞书消息同步失败，信息可能不完整',
    ],
    evidenceRefs: [
      {
        type: 'meeting_transcript',
        id: 'mtg-006',
        label: '3月28日百度云进度同步录音',
      },
      {
        type: 'deal_history',
        id: 'deal-006',
        label: '百度云智能客服集成商机记录',
      },
      {
        type: 'chat',
        id: 'feishu-baidu-group',
        label: '百度云项目飞书群（同步失败）',
      },
    ],
  },
  suggestedAction: {
    label: '跟进百度云集成测试进度',
    editableDraft:
      '联系百度云赵敏确认集成测试环境是否已就绪，协调技术团队尽快开始对接测试。注意飞书群同步有问题，先用邮件或电话跟进，同时排查同步故障原因。',
    dueDate: '2026-03-30',
  },
};

export const mockTaskCards: TaskCard[] = [
  huaweiVisitDraft,
  aliVisitReported,
  huaweiBudgetFollowup,
  jdBidRisk,
  aliQuoteUpdate,
  tencentPurchaseContact,
  bytedanceTechReview,
  meituanLaunchConfirm,
  baiduSyncFailed,
];

export function getTaskCardById(id: string): TaskCard | undefined {
  return mockTaskCards.find((c) => c.id === id);
}
