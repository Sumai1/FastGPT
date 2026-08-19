import { describe, it, expect } from 'vitest';
import {
  checkHighDangerWarning,
  getMatchedSafetyRule,
  classifyCitationType
} from '../../src/utils/safety';

describe('Safety Interlock & Citation Classifier', () => {
  it('should detect high danger keywords (high voltage, live disassembly, refrigerant leak)', () => {
    expect(checkHighDangerWarning('严禁带电拆机')).toBe(true);
    expect(checkHighDangerWarning('当前排查涉及 220V 强电总成')).toBe(true);
    expect(checkHighDangerWarning('检测到制冷剂泄漏与冷媒压力异常')).toBe(true);
    expect(checkHighDangerWarning('机箱内开关电源裸露触电危险')).toBe(true);
    expect(checkHighDangerWarning('更换相纸卷')).toBe(false);
    expect(checkHighDangerWarning('调整屏幕亮度与音量')).toBe(false);
  });

  it('should get correct matched safety rule details', () => {
    const voltRule = getMatchedSafetyRule('涉及 220V 高压电源');
    expect(voltRule.category).toBe('high_voltage');
    expect(voltRule.level).toBe('critical');

    const liveRule = getMatchedSafetyRule('带电拆机检修主板');
    expect(liveRule.category).toBe('live_disassembly');

    const refRule = getMatchedSafetyRule('压缩机 R290 制冷剂泄漏');
    expect(refRule.category).toBe('refrigerant');
    expect(refRule.level).toBe('danger');
  });

  it('should classify citations into 4 standard knowledge card types', () => {
    const fault = classifyCitationType('DT-2026 打印机卡纸 SOP 排查指南');
    expect(fault.typeLabel).toBe('故障排查卡');

    const manual = classifyCitationType('自助拍照机用户操作手册与耗材更换');
    expect(manual.typeLabel).toBe('操作手册');

    const master = classifyCitationType('SP-60 售货机电气主档与规格参数表');
    expect(master.typeLabel).toBe('产品主档');

    const policy = classifyCitationType('无人零售设备售后退款与质保服务政策');
    expect(policy.typeLabel).toBe('服务政策');

    const standard = classifyCitationType('常见问答汇总');
    expect(standard.typeLabel).toBe('标准资料');
  });
});
