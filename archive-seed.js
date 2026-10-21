/* 内置体检档案（2026-10-18 体检报告）
 * 用户已确认可公开：仅含检查指标与结论，不含姓名、证件号等身份信息。
 * 仅在首次打开且健康档案为空时写入，不覆盖用户已有记录。
 */
window.__H30_ARCHIVE_SEED = {
  issues: [
    {
      id: 1, name: "血脂异常", type: "健康问题",
      currentStatus: "总胆固醇 7.12 mmol/L（参考 <5.17）、甘油三酯 2.65 mmol/L（参考 <2.3）、低密度脂蛋白胆固醇 4.69 mmol/L（参考 <3.37），三项均增高",
      keywords: ["总胆固醇", "甘油三酯", "低密度脂蛋白", "血脂"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [1, 2, 3],
      cycleGoal: "低脂低糖饮食、控制体重、规律有氧运动，按医嘱复查血脂",
      linkedActions: ["dietOk", "walkMin", "sedentaryBreaks"],
      nextReviewDate: "2027-01-18", reviewDate: null,
      seekCare: "报告建议至心内科/内分泌科评估；先生活方式干预 3~6 个月，复查血脂后由医生决定是否用药",
      focus: true, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 2, name: "肝功能异常", type: "健康问题",
      currentStatus: "ALT 182 U/L（参考 9-50）、AST 87 U/L（参考 15-40）、GGT 296 U/L（参考 10-60），均明显增高",
      keywords: ["ALT", "AST", "GGT", "转氨酶", "肝功能"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [4, 5, 6],
      cycleGoal: "按医嘱复查肝功能，避免饮酒、熬夜与不必要的药物/保健品",
      linkedActions: ["dietOk", "noAlcoholSweet", "sleepH"],
      nextReviewDate: "2026-11-18", reviewDate: null,
      seekCare: "报告建议尽快至消化内科/肝病科就诊，完善肝炎病毒等检查并复查肝功能；打卡不能替代就医",
      focus: true, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 3, name: "空腹血糖升高（待复查）", type: "检查指标",
      currentStatus: "空腹血糖 9.05 mmol/L（参考 3.9-6.1），糖化血红蛋白 6.8%（参考 4.0-6.0）；报告提示糖尿病可能",
      keywords: ["空腹血糖", "糖化血红蛋白", "血糖"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [7, 8],
      cycleGoal: "按医生要求复查空腹血糖与糖化血红蛋白；控糖饮食、规律运动，不自行调药",
      linkedActions: ["dietOk", "noAlcoholSweet", "walkMin"],
      nextReviewDate: "2026-11-18", reviewDate: null,
      seekCare: "报告建议内分泌科就诊，进一步检查明确情况；是否用药由医生决定",
      focus: true, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 4, name: "肥胖（BMI 30.5）", type: "健康问题",
      currentStatus: "BMI 30.5 kg/m²（参考 18.5-23.9，≥28 为肥胖），身高 171.1 cm、体重 89.5 kg",
      keywords: ["BMI", "体重", "肥胖"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [9],
      cycleGoal: "控制膳食总量、低脂低糖、规律有氧运动，3~6 个月减重 5%~15%",
      linkedActions: ["dietOk", "walkMin", "sedentaryBreaks"],
      nextReviewDate: "2027-01-18", reviewDate: null,
      seekCare: "报告建议控制饮食并增加运动；必要时至体重管理门诊或营养科制定方案",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 5, name: "脂肪肝", type: "健康问题",
      currentStatus: "肝脏彩超：脂肪肝声像图（轻-中度）",
      keywords: ["脂肪肝", "超声", "肝脏"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "控制体重与腰围，低脂低糖饮食，配合规律运动；脂肪肝具有一定可逆性",
      linkedActions: ["dietOk", "walkMin"],
      nextReviewDate: "2027-01-18", reviewDate: null,
      seekCare: "结合肝功能异常，建议至消化内科/肝病科一并评估；复查肝胆彩超",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 6, name: "胆囊息肉", type: "健康问题",
      currentStatus: "胆囊彩超：胆囊息肉（大小与形态以报告原件为准）",
      keywords: ["胆囊息肉", "胆囊", "超声"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "按报告建议年度复查肝胆彩超，观察息肉大小变化",
      linkedActions: ["dietOk"],
      nextReviewDate: "2027-10-18", reviewDate: null,
      seekCare: "报告建议年度复查肝胆彩超；如息肉生长过快或直径超过 10mm，及时肝胆外科就诊",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 7, name: "胆囊壁胆固醇结晶", type: "健康问题",
      currentStatus: "胆囊彩超：胆囊壁胆固醇结晶",
      keywords: ["胆囊", "胆固醇结晶", "超声"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "低脂饮食、规律吃早餐、控制体重，年度复查肝胆彩超",
      linkedActions: ["dietOk", "walkMin"],
      nextReviewDate: "2027-10-18", reviewDate: null,
      seekCare: "报告指出与油腻饮食、肥胖、高脂血症、缺乏运动、不吃早餐等有关；如右上腹不适及时就诊",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 8, name: "双肾结晶", type: "健康问题",
      currentStatus: "双肾彩超：双肾大小正常，肾内可见点状强回声，后方不伴声影；报告结论为双肾结晶",
      keywords: ["肾结晶", "结石", "泌尿"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "保持充足饮水与尿量，适量运动，定期复查泌尿系超声",
      linkedActions: ["waterMl", "walkMin"],
      nextReviewDate: "2027-10-18", reviewDate: null,
      seekCare: "报告建议多饮水稀释尿液；如有腰痛、血尿等不适，及时泌尿外科就诊",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 9, name: "骨质增生", type: "健康问题",
      currentStatus: "颈椎侧位 DR：颈 3-6 椎体前、后缘及上下角骨质显示唇样增生，报告结论为颈椎椎体轻度骨质增生",
      keywords: ["骨质增生", "颈椎", "DR"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "避免长时间低头与单一姿势，注意颈肩保暖与适度活动",
      linkedActions: ["sedentaryBreaks"],
      nextReviewDate: null, reviewDate: null,
      seekCare: "报告指出与年龄、劳损、姿势等有关；如出现颈痛、上肢麻木等加重，及时骨科就诊",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    },
    {
      id: 10, name: "口腔多项异常", type: "健康问题",
      currentStatus: "口腔检查：部分牙楔状缺损、龋齿",
      keywords: ["龋齿", "楔状缺损", "口腔"],
      source: "体检报告", occurDate: "2026-10-18", monitorIds: [],
      cycleGoal: "改善刷牙方式（软毛、竖刷、避免横向用力），安排口腔科检查与治疗",
      linkedActions: [],
      nextReviewDate: "2026-11-18", reviewDate: null,
      seekCare: "报告建议口腔科就诊处理龋齿与楔状缺损，避免缺损加深引起牙髓问题",
      focus: false, archived: false, archivedAt: null, archivedReason: ""
    }
  ],
  monitorItems: [
    { id: 1, issueId: 1, name: "总胆固醇", kind: "num", unit: "mmol/L", refRange: "＜5.17", options: [], notes: "TC" },
    { id: 2, issueId: 1, name: "甘油三酯", kind: "num", unit: "mmol/L", refRange: "＜2.3", options: [], notes: "TG" },
    { id: 3, issueId: 1, name: "低密度脂蛋白胆固醇", kind: "num", unit: "mmol/L", refRange: "＜3.37", options: [], notes: "LDL-C" },
    { id: 4, issueId: 2, name: "ALT", kind: "num", unit: "U/L", refRange: "9-50", options: [], notes: "谷丙转氨酶" },
    { id: 5, issueId: 2, name: "AST", kind: "num", unit: "U/L", refRange: "15-40", options: [], notes: "天门冬氨酸氨基转移酶" },
    { id: 6, issueId: 2, name: "GGT", kind: "num", unit: "U/L", refRange: "10-60", options: [], notes: "γ-谷氨酰基转移酶" },
    { id: 7, issueId: 3, name: "空腹血糖", kind: "num", unit: "mmol/L", refRange: "3.9-6.1", options: [], notes: "按医生要求复查，不因单次读数自行调药" },
    { id: 8, issueId: 3, name: "糖化血红蛋白", kind: "num", unit: "%", refRange: "4.0-6.0", options: [], notes: "反映近 2-3 个月平均血糖" },
    { id: 9, issueId: 4, name: "体重指数", kind: "num", unit: "kg/m²", refRange: "18.5-23.9", options: [], notes: "BMI，≥28 为肥胖" }
  ],
  events: [
    { id: 1, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [1], description: "总胆固醇", source: "体检报告", value: 7.12, valueUnit: "mmol/L", refRange: "＜5.17", notes: "生化检测；报告提示增高" },
    { id: 2, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [1], description: "低密度脂蛋白胆固醇", source: "体检报告", value: 4.69, valueUnit: "mmol/L", refRange: "＜3.37", notes: "生化检测；报告提示增高" },
    { id: 3, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [1], description: "甘油三酯", source: "体检报告", value: 2.65, valueUnit: "mmol/L", refRange: "＜2.3", notes: "生化检测；报告提示增高" },
    { id: 4, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [2], description: "ALT（谷丙转氨酶）", source: "体检报告", value: 182, valueUnit: "U/L", refRange: "9-50", notes: "生化检测；报告提示明显增高" },
    { id: 5, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [2], description: "AST（天门冬氨酸氨基转移酶）", source: "体检报告", value: 87, valueUnit: "U/L", refRange: "15-40", notes: "生化检测；报告提示增高" },
    { id: 6, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [2], description: "GGT（γ-谷氨酰基转移酶）", source: "体检报告", value: 296, valueUnit: "U/L", refRange: "10-60", notes: "生化检测；报告提示明显增高" },
    { id: 7, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [3], description: "空腹血糖（体检）", source: "体检报告", value: 9.05, valueUnit: "mmol/L", refRange: "3.9-6.1", notes: "报告提示增高，建议复查明确；不因一次读数自行调药" },
    { id: 8, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [3], description: "糖化血红蛋白（HbA1c）", source: "体检报告", value: 6.8, valueUnit: "%", refRange: "4.0-6.0", notes: "反映近 2-3 个月平均血糖水平" },
    { id: 9, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [4], description: "体重指数（BMI）", source: "体检报告", value: 30.5, valueUnit: "kg/m²", refRange: "18.5-23.9", notes: "身高 171.1 cm、体重 89.5 kg" },
    { id: 10, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [5], description: "肝胆彩超：脂肪肝", source: "体检报告", value: null, valueUnit: "", notes: "脂肪肝声像图（轻-中度）" },
    { id: 11, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [6], description: "肝胆彩超：胆囊息肉", source: "体检报告", value: null, valueUnit: "", notes: "息肉大小与形态以报告原件为准；建议年度复查" },
    { id: 12, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [7], description: "肝胆彩超：胆囊壁胆固醇结晶", source: "体检报告", value: null, valueUnit: "", notes: "与油腻饮食、肥胖、高脂血症、缺乏运动、不吃早餐等有关" },
    { id: 13, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [8], description: "泌尿系超声：双肾结晶", source: "体检报告", value: null, valueUnit: "", notes: "双肾大小正常，肾内可见点状强回声，后方不伴声影" },
    { id: 14, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [9], description: "影像检查：颈椎椎体轻度骨质增生", source: "体检报告", value: null, valueUnit: "", notes: "颈 3-6 椎体前、后缘，上下角骨质显示唇样增生；椎间隙未见变窄" },
    { id: 15, date: "2026-10-18", approxDate: false, type: "检查", issueIds: [10], description: "口腔检查：部分牙楔状缺损、龋齿", source: "体检报告", value: null, valueUnit: "", notes: "建议口腔科就诊处理" }
  ],
  baseline: {
    weight: { value: "89.5", date: "2026-10-18", source: "体检报告", note: "身高 171.1 cm，BMI 30.5" },
    constitution: {
      value: "气虚质为主，兼夹气郁质",
      date: "2026-10-19",
      source: "中医体检报告",
      note: "齿痕舌、舌下络脉色紫黑；宜柔缓运动（八段锦），注意疏肝解郁、调养情志",
      reviewMonths: 3
    }
  }
};
