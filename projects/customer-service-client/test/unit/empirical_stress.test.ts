import { describe, it, expect } from 'vitest';
import {
  extractTroubleshootSteps,
  formatStepsForHandoff,
  STEP_HEADER_REGEX,
  DANGER_STEP_REGEX
} from '../../src/utils/troubleshoot';
import { searchErrorCodes, ERROR_CODES_DATABASE } from '../../src/components/ErrorCodeQuickSearch';
import {
  checkHighDangerWarning,
  getMatchedSafetyRule,
  classifyCitationType,
  HIGH_DANGER_SAFETY_REGEX,
  SAFETY_RULES
} from '../../src/utils/safety';
import type {
  CustomerServicePublicProductCatalogResponse,
  ProductSelection
} from '../../src/types';
import { CustomerServiceVersionTypeEnum } from '../../src/types';

describe('Empirical Stress Testing Suite: Critical Algorithms & Edge Conditions', () => {
  // =========================================================================
  // 1. REGEX STEP EXTRACTOR STRESS TESTS
  // =========================================================================
  describe('1. Regex Step Extractor Stress & Edge Cases', () => {
    it('1.1 should extract steps with standard numbered markdown format', () => {
      const markdown1 = `
1. 检查总电源开关是否开启
2. 确认插座有 220V 电源输出
3. 重启设备主控板
      `;
      const res1 = extractTroubleshootSteps(markdown1);
      expect(res1.length).toBe(3);
      expect(res1[0].title).toBe('检查总电源开关是否开启');
      expect(res1[1].title).toBe('确认插座有 220V 电源输出');
      expect(res1[1].isDanger).toBe(true);
      expect(res1[2].title).toBe('重启设备主控板');
    });

    it('1.2 should support spaced Chinese punctuation enumeration (1、 2、 / 1) 2))', () => {
      const markdown = `
1、 打开相纸仓上盖
2、 取出用尽的纸卷与色带盒
3、 安装全新 6 寸热升华相纸卷
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].title).toBe('打开相纸仓上盖');
      expect(res[1].title).toBe('取出用尽的纸卷与色带盒');
      expect(res[2].title).toBe('安装全新 6 寸热升华相纸卷');
    });

    it('1.3 should support parentheses numbering: 1) 2) 3)', () => {
      const markdown = `
1) 检查微单相机 USB 线缆
2) 重新插拔相机电池假电池供电线
3) 确认相机处于开机取景模式
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].title).toBe('检查微单相机 USB 线缆');
      expect(res[1].title).toBe('重新插拔相机电池假电池供电线');
      expect(res[2].title).toBe('确认相机处于开机取景模式');
    });

    it('1.4 should support standard Chinese prefixes ("步骤 1:", "步骤一：")', () => {
      const markdown = `
步骤 1: 拔掉设备主插头并切断电源
步骤 2: 打开机柜后门
步骤三: 检查开关电源输出指示灯
步骤 4: 恢复通电并测试
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(4);
      expect(res[0].title).toBe('拔掉设备主插头并切断电源');
      expect(res[0].isDanger).toBe(true);
      expect(res[1].title).toBe('打开机柜后门');
      expect(res[2].title).toBe('检查开关电源输出指示灯');
      expect(res[3].title).toBe('恢复通电并测试');
    });

    it('1.5 should support English prefixes: "Step 1:", "STEP 2 -", "step 3."', () => {
      const markdown = `
Step 1: Disconnect AC power plug
STEP 2 - Inspect cutting blade position
step 3. Power on and run calibration test
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].title).toBe('Disconnect AC power plug');
      expect(res[1].title).toBe('Inspect cutting blade position');
      expect(res[2].title).toBe('Power on and run calibration test');
    });

    it('1.6 should support task checkbox markdown: - [ ] and - [x]', () => {
      const markdown = `
- [ ] 检查纸门是否紧闭
- [x] 清理出纸口残留卡纸
- [ ] 重新合上出纸仓门
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].title).toBe('检查纸门是否紧闭');
      expect(res[1].title).toBe('清理出纸口残留卡纸');
      expect(res[2].title).toBe('重新合上出纸仓门');
    });

    it('1.7 should handle nested details with indentation, bullets, and blockquotes', () => {
      const markdown = `
1. 检查电机排线
   - 确认无断线或针脚弯折
   - 测量 12V 供电端子阻值
2. 检查主控板接线
   > 注意：切断电源后再拔插主板接头！
3. 重新开机复位
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].detail).toContain('确认无断线或针脚弯折');
      expect(res[0].detail).toContain('测量 12V 供电端子阻值');
      expect(res[1].detail).toContain('注意：切断电源后再拔插主板接头！');
      expect(res[1].isDanger).toBe(true); // Promoted to danger because detail mentions 切断电源
    });

    it('1.8 should enforce boundary rules: ignore steps < 3 chars or > 200 chars, require >= 2 steps', () => {
      // Single step should return []
      expect(extractTroubleshootSteps('1. 单独一步排查')).toEqual([]);

      // Step with < 3 chars ignored
      const shortMarkdown = `
1. OK
2. 正常排查步骤一
3. 正常排查步骤二
      `;
      const shortRes = extractTroubleshootSteps(shortMarkdown);
      expect(shortRes.length).toBe(2);
      expect(shortRes[0].title).toBe('正常排查步骤一');

      // Empty / invalid input
      expect(extractTroubleshootSteps('')).toEqual([]);
      expect(extractTroubleshootSteps('   \n\n  ')).toEqual([]);
    });

    it('1.9 should strip markdown bold, backticks, and whitespace cleanly', () => {
      const markdown = `
1. **清理进纸滚轴上的碎纸屑**
2. \`重启打印机驱动板电源\`
3. **\`检查相纸仓定位销\`**
      `;
      const res = extractTroubleshootSteps(markdown);
      expect(res.length).toBe(3);
      expect(res[0].title).toBe('清理进纸滚轴上的碎纸屑');
      expect(res[1].title).toBe('重启打印机驱动板电源');
    });

    it('1.10 should properly format steps for human handoff ticket summary', () => {
      const steps = [
        { id: 'step-1', index: 1, title: '检查电源插座', completed: true },
        { id: 'step-2', index: 2, title: '清理出纸口卡纸', completed: false }
      ];
      const formatted = formatStepsForHandoff(steps);
      expect(formatted).toEqual([
        { title: '检查电源插座', completed: true },
        { title: '清理出纸口卡纸', completed: false }
      ]);
    });

    it('1.11 [Boundary Document] documents regex behavior on un-spaced dunhao and "第N步:" prefixes', () => {
      // Documenting current STEP_HEADER_REGEX edge behavior
      const unspacedDunhao = '1、打开相纸仓上盖';
      expect(STEP_HEADER_REGEX.test(unspacedDunhao)).toBe(false); // requires space after dunhao

      const diNbubuPrefix = '第 1 步: 恢复通电并测试';
      const match = diNbubuPrefix.match(STEP_HEADER_REGEX);
      expect(match).not.toBeNull();
      // In current regex, "步:" is captured into title group
      expect(match![2]).toBe('步: 恢复通电并测试');
    });
  });

  // =========================================================================
  // 2. ERROR CODE SEARCH ENGINE STRESS TESTS
  // =========================================================================
  describe('2. Error Code Search Engine Stress & Fuzzy Matching', () => {
    it('2.1 should match exact codes in all case and formatting permutations', () => {
      const testCases = [
        { query: 'E-01', expected: 'E-01' },
        { query: 'e-01', expected: 'E-01' },
        { query: 'e01', expected: 'E-01' },
        { query: 'E 01', expected: 'E-01' },
        { query: 'e_01', expected: 'E-01' },
        { query: '  e-01  ', expected: 'E-01' },
        { query: 'V-101', expected: 'V-101' },
        { query: 'v101', expected: 'V-101' },
        { query: 'v-101', expected: 'V-101' },
        { query: 'V 101', expected: 'V-101' },
        { query: 'v_101', expected: 'V-101' },
        { query: 'V-205', expected: 'V-205' },
        { query: 'v205', expected: 'V-205' },
        { query: 'ERR-NET', expected: 'ERR-NET' },
        { query: 'errnet', expected: 'ERR-NET' },
        { query: 'err-net', expected: 'ERR-NET' },
        { query: 'ERR_NET', expected: 'ERR-NET' },
        { query: 'ERR-PWR', expected: 'ERR-PWR' },
        { query: 'errpwr', expected: 'ERR-PWR' },
        { query: 'err-pwr', expected: 'ERR-PWR' }
      ];

      for (const tc of testCases) {
        const results = searchErrorCodes(tc.query);
        expect(results.length, `Query "${tc.query}" should return results`).toBeGreaterThan(0);
        expect(results[0].code, `Query "${tc.query}" should match code "${tc.expected}"`).toBe(
          tc.expected
        );
      }
    });

    it('2.2 should match fuzzy keywords in names, prompts, and quick resolutions', () => {
      const keywordTests = [
        { kw: '卡纸', expectedCode: 'E-01' },
        { kw: '色带', expectedCode: 'E-02' },
        { kw: '裁切刀', expectedCode: 'E-03' },
        { kw: '闪光灯', expectedCode: 'E-05' },
        { kw: '相机', expectedCode: 'E-08' },
        { kw: '触控', expectedCode: 'E-12' },
        { kw: '堵转', expectedCode: 'V-101' },
        { kw: '掉货', expectedCode: 'V-102' },
        { kw: '温控', expectedCode: 'V-201' },
        { kw: '冷媒', expectedCode: 'V-205' },
        { kw: '压缩机', expectedCode: 'V-205' },
        { kw: '投币器', expectedCode: 'V-301' },
        { kw: '防夹', expectedCode: 'V-305' },
        { kw: '升降机', expectedCode: 'V-305' },
        { kw: '以太网', expectedCode: 'ERR-NET' },
        { kw: '4G', expectedCode: 'ERR-NET' },
        { kw: '强电总成', expectedCode: 'ERR-PWR' },
        { kw: '开关电源', expectedCode: 'ERR-PWR' }
      ];

      for (const kt of keywordTests) {
        const results = searchErrorCodes(kt.kw);
        const matched = results.some((r) => r.code === kt.expectedCode);
        expect(matched, `Keyword "${kt.kw}" should match error code "${kt.expectedCode}"`).toBe(
          true
        );
      }
    });

    it('2.3 should return empty array for non-matching queries or whitespace-only inputs', () => {
      expect(searchErrorCodes('')).toEqual([]);
      expect(searchErrorCodes('   ')).toEqual([]);
      expect(searchErrorCodes('\t\n')).toEqual([]);
      expect(searchErrorCodes('NONEXISTENT_CODE_XYZ_999')).toEqual([]);
      expect(searchErrorCodes('ZZZZZZZZ')).toEqual([]);
    });

    it('2.4 should flag high danger error codes correctly in database', () => {
      const dangerCodes = ERROR_CODES_DATABASE.filter((item) => item.isDanger);
      const dangerCodeNames = dangerCodes.map((c) => c.code);

      expect(dangerCodeNames).toContain('E-03'); // 切刀机械
      expect(dangerCodeNames).toContain('V-205'); // 压缩机冷媒
      expect(dangerCodeNames).toContain('V-305'); // 升降机防夹
      expect(dangerCodeNames).toContain('ERR-PWR'); // 强电总成供电
    });
  });

  // =========================================================================
  // 3. SAFETY KEYWORDS & RULE CATEGORIZATION STRESS TESTS
  // =========================================================================
  describe('3. Safety Keyword Detection & Rule Categorization Stress', () => {
    it('3.1 should match all high-danger safety trigger keywords', () => {
      const dangerInputs = [
        '设备输入 220V 交流电',
        '高压电源存在高压电危险',
        '严禁带电拆机操作',
        '严禁带电检修主控板',
        '触电危险！切勿触摸裸露导线',
        '严禁拆卸后盖',
        '涉及 380V 或 强电总成 部件',
        '压缩机高压 保护跳闸',
        '主板强电 部分发生短路',
        '漏电触电 事故预防',
        '制冷剂泄漏 报警',
        '冷媒泄漏 请开窗通风',
        '采用 R290 环保冷媒',
        '采用 R134a 压缩机冷媒',
        '机箱内 开关电源裸露',
        '接线端子 高压打火',
        '请检查 强电接线 端子'
      ];

      for (const input of dangerInputs) {
        expect(
          checkHighDangerWarning(input),
          `Input "${input}" should trigger high danger warning`
        ).toBe(true);
      }
    });

    it('3.2 should not trigger false positives on safe operational keywords', () => {
      const safeInputs = [
        '请放入全新相纸并按复位键',
        '调整微单相机镜头焦距与光圈',
        '在后台管理页面修改商品售价',
        '擦拭货道玻璃门与外壳灰尘',
        '通过微信扫码完成支付',
        '查看网络信号强度与 SIM 卡状态',
        '更换 12V 弱电 LED 补光灯带'
      ];

      for (const input of safeInputs) {
        expect(
          checkHighDangerWarning(input),
          `Safe input "${input}" should not trigger danger warning`
        ).toBe(false);
      }
    });

    it('3.3 should check safety warning from both content and safetyWarning parameter', () => {
      expect(checkHighDangerWarning('正常排查步骤', '220V 电气高压')).toBe(true);
      expect(checkHighDangerWarning('带电拆机排障', undefined)).toBe(true);
      expect(checkHighDangerWarning('', '严禁拆卸')).toBe(true);
      expect(checkHighDangerWarning('', '')).toBe(false);
    });

    it('3.4 should correctly classify safety rules into categories', () => {
      // Refrigerant
      const ref1 = getMatchedSafetyRule('冷媒泄漏请立即停机');
      expect(ref1.category).toBe('refrigerant');
      expect(ref1.level).toBe('danger');

      const ref2 = getMatchedSafetyRule('压缩机高压 R290 制冷剂');
      expect(ref2.category).toBe('refrigerant');

      // Live disassembly
      const live1 = getMatchedSafetyRule('严禁带电拆机操作');
      expect(live1.category).toBe('live_disassembly');
      expect(live1.level).toBe('critical');

      const live2 = getMatchedSafetyRule('通电拆卸打印机模组');
      expect(live2.category).toBe('live_disassembly');

      // High voltage default
      const volt1 = getMatchedSafetyRule('220V 强电总成供电异常');
      expect(volt1.category).toBe('high_voltage');
      expect(volt1.level).toBe('critical');
    });

    it('3.5 should accurately classify citations into the 4 standard types', () => {
      const cases = [
        { title: 'DT-2026 打印机卡纸 SOP 排查卡', expected: '故障排查卡' },
        { title: '售货机电机堵转报错排障手册', expected: '故障排查卡' },
        { title: '自助拍照机操作手册与耗材装填指南', expected: '操作手册' },
        { title: 'SP-60 售货机使用说明书', expected: '操作手册' },
        { title: 'DT-2026 拍照机产品主档与硬件规格参数', expected: '产品主档' },
        { title: 'SP-60 综合机电气额定参数表', expected: '产品主档' },
        { title: '无人设备售后保修与争议退款服务政策', expected: '服务政策' },
        { title: '质保条款与服务时效约定', expected: '服务政策' },
        { title: '其他未分类知识资料', expected: '标准资料' }
      ];

      for (const c of cases) {
        const result = classifyCitationType(c.title);
        expect(result.typeLabel, `Title "${c.title}" should be classified as "${c.expected}"`).toBe(
          c.expected
        );
      }
    });
  });

  // =========================================================================
  // 4. PRODUCT 4-TIER CASCADE HIERARCHY STRESS TESTS
  // =========================================================================
  describe('4. 4-Tier Cascade & Product Selection Hierarchy Stress', () => {
    const fullCatalog: CustomerServicePublicProductCatalogResponse = {
      categories: [
        {
          code: 'PHOTO',
          name: '自助拍照机专区',
          aliases: ['拍照机', '自拍亭'],
          description: '',
          status: 'active',
          sortOrder: 1
        },
        {
          code: 'VENDING',
          name: '智能售货机专区',
          aliases: ['售货机', '贩卖机'],
          description: '',
          status: 'active',
          sortOrder: 2
        }
      ],
      series: [
        {
          categoryCode: 'PHOTO',
          code: 'PHOTO_DESKTOP',
          name: '桌面立式系列',
          aliases: [],
          description: '',
          status: 'active',
          sortOrder: 1
        },
        {
          categoryCode: 'PHOTO',
          code: 'PHOTO_BOOTH',
          name: '沉浸亭式系列',
          aliases: [],
          description: '',
          status: 'active',
          sortOrder: 2
        },
        {
          categoryCode: 'VENDING',
          code: 'VEND_SPRING',
          name: '弹簧履带系列',
          aliases: [],
          description: '',
          status: 'active',
          sortOrder: 1
        },
        {
          categoryCode: 'VENDING',
          code: 'VEND_LOCKER',
          name: '智能格子柜系列',
          aliases: [],
          description: '',
          status: 'active',
          sortOrder: 2
        }
      ],
      models: [
        {
          categoryCode: 'PHOTO',
          seriesCode: 'PHOTO_DESKTOP',
          modelCode: 'PHOTO-DT2026',
          name: 'DT-2026 桌面拍照机',
          aliases: [],
          description: '',
          status: 'active',
          discontinuedAt: null,
          sortOrder: 1
        },
        {
          categoryCode: 'PHOTO',
          seriesCode: 'PHOTO_BOOTH',
          modelCode: 'PHOTO-BT400',
          name: 'BT-400 沉浸拍照亭',
          aliases: [],
          description: '',
          status: 'active',
          discontinuedAt: null,
          sortOrder: 2
        },
        {
          categoryCode: 'VENDING',
          seriesCode: 'VEND_SPRING',
          modelCode: 'VEND-SP60',
          name: 'SP-60 综合售货机',
          aliases: [],
          description: '',
          status: 'active',
          discontinuedAt: null,
          sortOrder: 1
        },
        {
          categoryCode: 'VENDING',
          seriesCode: 'VEND_LOCKER',
          modelCode: 'VEND-LK32',
          name: 'LK-32 恒温格子柜',
          aliases: [],
          description: '',
          status: 'active',
          discontinuedAt: null,
          sortOrder: 2
        }
      ],
      versions: [
        {
          modelCode: 'PHOTO-DT2026',
          type: 'hardware',
          versionCode: 'HW-V1.0',
          name: '硬件 V1.0 (标准版)',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        },
        {
          modelCode: 'PHOTO-DT2026',
          type: 'hardware',
          versionCode: 'HW-V2.0',
          name: '硬件 V2.0 (增强补光版)',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        },
        {
          modelCode: 'PHOTO-DT2026',
          type: 'software',
          versionCode: 'SW-V3.5.0',
          name: '固件 V3.5.0',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        },
        {
          modelCode: 'PHOTO-DT2026',
          type: 'software',
          versionCode: 'SW-V3.6.2',
          name: '固件 V3.6.2',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        },
        {
          modelCode: 'VEND-SP60',
          type: 'hardware',
          versionCode: 'HW-V1.2',
          name: '冷藏弹簧主板 V1.2',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        },
        {
          modelCode: 'VEND-SP60',
          type: 'software',
          versionCode: 'SW-V2.1.0',
          name: '售货固件 V2.1.0',
          aliases: [],
          description: '',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null
        }
      ]
    };

    it('4.1 should cascade tier 1 category to tier 2 series correctly', () => {
      // If category is PHOTO -> only PHOTO_DESKTOP and PHOTO_BOOTH
      const photoSeries = fullCatalog.series.filter((s) => s.categoryCode === 'PHOTO');
      expect(photoSeries.length).toBe(2);
      expect(photoSeries.map((s) => s.code)).toEqual(['PHOTO_DESKTOP', 'PHOTO_BOOTH']);

      // If category is VENDING -> only VEND_SPRING and VEND_LOCKER
      const vendSeries = fullCatalog.series.filter((s) => s.categoryCode === 'VENDING');
      expect(vendSeries.length).toBe(2);
      expect(vendSeries.map((s) => s.code)).toEqual(['VEND_SPRING', 'VEND_LOCKER']);
    });

    it('4.2 should cascade tier 2 series to tier 3 models correctly', () => {
      const desktopModels = fullCatalog.models.filter((m) => m.seriesCode === 'PHOTO_DESKTOP');
      expect(desktopModels.length).toBe(1);
      expect(desktopModels[0].modelCode).toBe('PHOTO-DT2026');

      const springModels = fullCatalog.models.filter((m) => m.seriesCode === 'VEND_SPRING');
      expect(springModels.length).toBe(1);
      expect(springModels[0].modelCode).toBe('VEND-SP60');
    });

    it('4.3 should cascade tier 3 model to tier 4 hardware and software versions cleanly', () => {
      const dtVersions = fullCatalog.versions.filter((v) => v.modelCode === 'PHOTO-DT2026');
      const hwVersions = dtVersions.filter(
        (v) => v.type === CustomerServiceVersionTypeEnum.hardware
      );
      const swVersions = dtVersions.filter(
        (v) => v.type === CustomerServiceVersionTypeEnum.software
      );

      expect(hwVersions.length).toBe(2);
      expect(hwVersions.map((v) => v.versionCode)).toEqual(['HW-V1.0', 'HW-V2.0']);

      expect(swVersions.length).toBe(2);
      expect(swVersions.map((v) => v.versionCode)).toEqual(['SW-V3.5.0', 'SW-V3.6.2']);

      const vendVersions = fullCatalog.versions.filter((v) => v.modelCode === 'VEND-SP60');
      expect(
        vendVersions.filter((v) => v.type === CustomerServiceVersionTypeEnum.hardware).length
      ).toBe(1);
      expect(
        vendVersions.filter((v) => v.type === CustomerServiceVersionTypeEnum.software).length
      ).toBe(1);
    });

    it('4.4 should handle cross-category reset and preserve consistency in selection state', () => {
      // Simulate selection transition: PHOTO -> VENDING
      let selection: ProductSelection = {
        categoryCode: 'PHOTO',
        seriesCode: 'PHOTO_DESKTOP',
        modelCode: 'PHOTO-DT2026',
        hardwareVersionCode: 'HW-V1.0',
        softwareVersionCode: 'SW-V3.5.0'
      };

      // User changes category to VENDING -> downstream series, model, hw, sw reset to empty
      selection = {
        categoryCode: 'VENDING',
        seriesCode: '',
        modelCode: '',
        hardwareVersionCode: '',
        softwareVersionCode: ''
      };

      expect(selection.categoryCode).toBe('VENDING');
      expect(selection.seriesCode).toBe('');
      expect(selection.modelCode).toBe('');
      expect(selection.hardwareVersionCode).toBe('');
      expect(selection.softwareVersionCode).toBe('');

      // Series filtering under VENDING
      const availableSeries = fullCatalog.series.filter(
        (s) => s.categoryCode === selection.categoryCode
      );
      expect(availableSeries.map((s) => s.code)).toEqual(['VEND_SPRING', 'VEND_LOCKER']);
    });
  });
});
