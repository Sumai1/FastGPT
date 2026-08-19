import type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse,
  CustomerServicePublicCitation
} from '../../src/types';
import { CustomerServiceAudienceEnum, CustomerServiceVersionTypeEnum } from '../../src/types';

export const mockPublicBootstrap: CustomerServicePublicBootstrapResponse = {
  project: {
    publicId: 'DEMO_DEVICE_SUPPORT',
    name: '无人自助设备智能服务门户',
    welcomeText: '您好！我是您的无人设备智能客服专家，为您提供 7×24 小时售后排障服务。',
    recommendedQuestions: [
      '拍照机打印相纸卡纸如何清理？',
      '售货机扣费未出货如何申请退款与补发？',
      '屏幕出现 E-01 报错代码如何解决？',
      '售货机冷藏柜温度偏高如何排查？'
    ],
    humanContact: {
      name: '官方售后技术支持中心',
      phone: '400-888-2026',
      workTime: '周一至周日 08:30 - 22:30',
      url: 'https://support.example.com/human'
    }
  },
  catalog: {
    categories: [
      {
        code: 'PHOTO',
        name: '自助拍照机专区',
        aliases: ['拍照机', '自拍亭', '大头贴机'],
        description: '商用自助拍照、复古大头贴及证件照打印终端',
        status: 'active' as any,
        sortOrder: 1
      },
      {
        code: 'VENDING',
        name: '智能售货机专区',
        aliases: ['售货机', '自动贩卖机', '饮料机'],
        description: '弹簧机、履带机与冷藏饮料自动售卖终端',
        status: 'active' as any,
        sortOrder: 2
      }
    ],
    series: [
      {
        categoryCode: 'PHOTO',
        code: 'PHOTO_DESKTOP',
        name: '桌面立式系列',
        aliases: ['桌面机', '立式拍照机'],
        description: '小巧灵活，适用于咖啡馆与轻食展会',
        status: 'active' as any,
        sortOrder: 1
      },
      {
        categoryCode: 'PHOTO',
        code: 'PHOTO_BOOTH',
        name: '沉浸亭式系列',
        aliases: ['拍照亭', '包厢自拍馆'],
        description: '双帘密闭私密拍照亭，支持棚拍级柔光',
        status: 'active' as any,
        sortOrder: 2
      },
      {
        categoryCode: 'VENDING',
        code: 'VEND_SPRING',
        name: '弹簧履带零售系列',
        aliases: ['弹簧机', '零食柜'],
        description: '多规格弹簧与履带货道售货机',
        status: 'active' as any,
        sortOrder: 1
      },
      {
        categoryCode: 'VENDING',
        code: 'VEND_BEVERAGE',
        name: '智能控温饮料系列',
        aliases: ['饮料机', '冷饮机'],
        description: '内置高效压缩机，支持冷热双温区',
        status: 'active' as any,
        sortOrder: 2
      }
    ],
    models: [
      {
        categoryCode: 'PHOTO',
        seriesCode: 'PHOTO_DESKTOP',
        modelCode: 'PHOTO-DT2026',
        name: 'DT-2026 桌面全能拍照机',
        aliases: ['DT2026', '桌面2026', '小方机'],
        description: '21.5寸电容触控屏 + 佳能EOS微单 + 热升华切刀打印机',
        status: 'active' as any,
        sortOrder: 1
      },
      {
        categoryCode: 'PHOTO',
        seriesCode: 'PHOTO_BOOTH',
        modelCode: 'PHOTO-BT400',
        name: 'BT-400 旗舰沉浸拍照亭',
        aliases: ['BT400', '四人拍照亭'],
        description: '全封闭铝合金箱体 + 三路柔光箱闪光灯',
        status: 'active' as any,
        sortOrder: 2
      },
      {
        categoryCode: 'VENDING',
        seriesCode: 'VEND_SPRING',
        modelCode: 'VEND-SP60',
        name: 'SP-60 标准综合售货机',
        aliases: ['SP60', '60门零食机'],
        description: '6层60货道弹簧机，配置红外掉货检测',
        status: 'active' as any,
        sortOrder: 1
      },
      {
        categoryCode: 'VENDING',
        seriesCode: 'VEND_BEVERAGE',
        modelCode: 'VEND-BV80',
        name: 'BV-80 极速变频冷饮售货机',
        aliases: ['BV80', '冷饮机'],
        description: 'R290变频环保压缩机制冷 + 重力下滑轨道',
        status: 'active' as any,
        sortOrder: 2
      }
    ],
    versions: [
      {
        modelCode: 'PHOTO-DT2026',
        type: CustomerServiceVersionTypeEnum.hardware,
        versionCode: 'HW-V1.0',
        name: '硬件 V1.0 (基础切刀版)',
        aliases: ['V1'],
        description: '初版硬件配置',
        status: 'active' as any
      },
      {
        modelCode: 'PHOTO-DT2026',
        type: CustomerServiceVersionTypeEnum.hardware,
        versionCode: 'HW-V2.0',
        name: '硬件 V2.0 (防夹手升级版)',
        aliases: ['V2'],
        description: '升级防夹手光电传感器',
        status: 'active' as any
      },
      {
        modelCode: 'PHOTO-DT2026',
        type: CustomerServiceVersionTypeEnum.software,
        versionCode: 'SW-V3.2.1',
        name: '软件 V3.2.1 (正式发布版)',
        aliases: ['3.2.1'],
        description: '系统稳定运行版',
        status: 'active' as any
      },
      {
        modelCode: 'PHOTO-DT2026',
        type: CustomerServiceVersionTypeEnum.software,
        versionCode: 'SW-V3.5.0',
        name: '软件 V3.5.0 (支持人脸美颜)',
        aliases: ['3.5.0'],
        description: '新增美颜特效',
        status: 'active' as any
      },
      {
        modelCode: 'VEND-BV80',
        type: CustomerServiceVersionTypeEnum.hardware,
        versionCode: 'HW-R290',
        name: '硬件 R290 (环保冷媒版)',
        aliases: ['R290'],
        description: '环保制冷压缩机',
        status: 'active' as any
      }
    ]
  }
};

export const mockCitations: CustomerServicePublicCitation[] = [
  {
    title: '【故障排查卡】DT-2026 打印机相纸卡阻标准处理 SOP',
    summary:
      '当打印机出纸口红灯常亮时，请先关闭设备主电源，按压前仓门释放卡扣并顺着进纸反方向平稳取出卡阻相纸。',
    score: 0.94
  },
  {
    title: '【操作手册】DT-2026 热升华耗材更换与切刀清洁指南',
    summary: '定期使用无水酒精棉签擦拭打印头与切刀滑轨，避免相纸碎屑堆积导致切刀卡死。',
    score: 0.88
  },
  {
    title: '【产品主档】DT-2026A 旗舰桌面拍照机电气与结构规格',
    summary: '额定供电 AC 220V 50Hz，最大运行功率 350W，标配 DNP 热升华打印机与佳能微单。',
    score: 0.82
  },
  {
    title: '【服务政策】无人自助设备售后质保与备件响应时效',
    summary: '整机享受 12 个月全国联保，核心打印机与主控板提供 72 小时顺丰寄修或上门备件更换。',
    score: 0.79
  }
];

export const mockChatResponseAnswered: CustomerServicePublicChatResponse = {
  requestId: 'req-test-001',
  sessionId: 'session-test-001',
  messageId: 'msg-test-001',
  status: 'answered' as any,
  answer: `针对您的拍照机相纸卡纸问题，请按以下步骤进行排查：
1. **切断设备总电源**：关闭机身后侧电源开关，拔掉插头以确保安全
2. **打开打印仓门**：按下打印机右侧仓门释放拨片，缓慢打开前盖
3. **取出卡阻相纸**：沿着滚轴送纸相反方向，双手平稳将卡住的相纸匀速拉出
4. **检查切刀位置**：确认裁切刀是否已归位到最左侧原点位置
5. **通电重启测试**：重新合上仓门并通电，观察指示灯是否恢复常绿`,
  audience: CustomerServiceAudienceEnum.public,
  citations: mockCitations,
  resolvedProduct: {
    modelCode: 'PHOTO-DT2026',
    modelName: 'DT-2026 桌面全能拍照机',
    hardwareVersionCode: 'HW-V2.0',
    softwareVersionCode: 'SW-V3.5.0'
  },
  humanContact: mockPublicBootstrap.project.humanContact
};

export const mockChatResponseWithDanger: CustomerServicePublicChatResponse = {
  requestId: 'req-danger-001',
  sessionId: 'session-danger-001',
  messageId: 'msg-danger-001',
  status: 'answered' as any,
  answer: '警告：您咨询的操作涉及 220V 高压电源和带电拆机。严禁私自拆开后箱外壳测量强电总成！',
  safetyWarning: '检测到高压电与带电拆机危险！请立即停止操作并联系持证专业售后工程师。',
  audience: CustomerServiceAudienceEnum.public,
  humanContact: mockPublicBootstrap.project.humanContact
};

export const mockChatResponseWithCandidates: CustomerServicePublicChatResponse = {
  requestId: 'req-cand-001',
  sessionId: 'session-cand-001',
  messageId: 'msg-cand-001',
  status: 'answered' as any,
  answer: '您询问的问题可能适用于多款机型，请确认您所使用的设备型号：',
  candidates: [
    {
      modelCode: 'PHOTO-DT2026',
      name: 'DT-2026 桌面全能拍照机'
    },
    {
      modelCode: 'PHOTO-BT400',
      name: 'BT-400 旗舰沉浸拍照亭'
    }
  ],
  audience: CustomerServiceAudienceEnum.public
};

export const mockChatResponseWithLowConfidence: CustomerServicePublicChatResponse = {
  requestId: 'req-low-001',
  sessionId: 'session-low-001',
  messageId: 'msg-low-001',
  status: 'answered' as any,
  answer: '抱歉，当前知识库中暂未收录该特殊定制型号的接线说明，建议您转接人工售后工程师协助。',
  lowConfidence: true,
  audience: CustomerServiceAudienceEnum.public,
  humanContact: mockPublicBootstrap.project.humanContact
};
