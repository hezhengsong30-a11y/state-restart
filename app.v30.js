/* 30天生活调理打卡 - 纯前端本机存储 v2 */
(function(){
'use strict';

/* ========== 常量 ========== */
/* 三个月目标（12 周 · 91 天 · 2026-10-20 → 2027-01-18） */
var QUARTER = {
  title: '三个月 · 体重从 89.5 → 80 kg（BMI 30.6 → 27.3）',
  start:'2026-10-20', end:'2027-01-18',
  baselineWeight:89.5, targetWeight:80,
  baselineBMI:30.6,   targetBMI:27.3,
  stages:[
    { weeks:'第 1–4 周', focus:'稳定习惯',
      desc:'完全戒烟戒酒；步行 8000–10000 步/天（约 30 分钟以上）；三餐规律；晨起称重用 7 天移动平均观察趋势。' },
    { weeks:'第 5–8 周', focus:'根据趋势调整',
      desc:'若体重连续两三周没变化，检查饮食份量/零食/周末饮食。身体适应后每周加 2–3 次轻度力量训练。' },
    { weeks:'第 9–12 周', focus:'巩固',
      desc:'逐步接近 80kg，不挨饿赶日期。同时记录腰围、精力、睡眠，看整体改善而非单一数字。' }
  ],
  medical:[
    { when:'30 天内', title:'消化内科 / 肝病门诊', detail:'做 FIB-4 风险评估（结合血小板等），必要时肝脏弹性检测；肝酶异常已 11 年，不等体重降下来再看。' },
    { when:'30 天内', title:'内分泌复核血糖', detail:'空腹 9.05 + 糖化 6.8% 已达糖尿病诊断阈值，尽快评估是否需要治疗。' },
    { when:'近期',    title:'心血管 / 降脂评估', detail:'LDL-C 4.69 明显偏高，评估心血管风险和降脂方案。' }
  ]
};

var START = '2026-10-20';         // 兜底值（DB.cycles 未就绪时用）
var END   = '2026-11-18';
var TOTAL = 30;
var CYCLE = '2026年10月20日至11月18日';
var LS_KEY = 'health30_v1';   // 沿用原 key，保证已有数据不丢

/* 当前周期 getter（从 DB.cycles 读，无则回退到硬编码） */
function currentCycle(){
  if(DB && Array.isArray(DB.cycles) && DB.cycles.length) return DB.cycles[0];
  return { id:1, start:START, end:END, name:'2026年10月至11月', reviewDate:'2026-11-18', active:true };
}
function cycleStart(){ return currentCycle().start || START; }
function cycleEnd(){ return currentCycle().end || END; }
function cycleTotal(){
  var cs=parseD(cycleStart()), ce=parseD(cycleEnd());
  return Math.round((ce-cs)/86400000) + 1;
}
function cycleLabel(){
  var c=currentCycle();
  if(!c) return CYCLE;
  var ps=c.start.split('-'), pe=c.end.split('-');
  var sm=+ps[1], sd=+ps[2], em=+pe[1], ed=+pe[2];
  return ps[0]+'年'+sm+'月'+sd+'日至'+em+'月'+ed+'日';
}

var PLAN = [
  {focus:'第 1 天：开始 30 天 + 3 个月计划，选定起床睡觉时间，称重量腰围记录基线', walk:'饭后10分钟', weigh:true},
  {focus:'戒烟第 2 天：烟瘾发作通常 3–5 分钟就减弱，提前准备替代动作', walk:'饭后10分钟'},
  {focus:'早餐加蛋白质，避免只有碳水；外卖优先清炒少油无甜饮', walk:'饭后10～15分钟'},
  {focus:'午餐餐盘比例：半盘蔬菜、四分之一鱼肉蛋豆、四分之一主食', walk:'两次各10分钟'},
  {focus:'观察饮水是否集中在晚上，提前放一杯在手边', walk:'两次各10分钟'},
  {focus:'练习一顿健康外卖：少油少酱无甜饮；戒烟一周了', walk:'两次各10分钟'},
  {focus:'第 1 周复盘：戒烟坚持、饮食餐盘比例、最难的一项？门诊约了吗？', walk:'轻松走15～20分钟', review:true, medicCheck:true},
  {focus:'同条件称重；查看一周睡眠和血糖记录；没约门诊的本周内约', walk:'累计20分钟', weigh:true},
  {focus:'上午、下午都安排久坐中断（每坐1小时起身3分钟）', walk:'累计20分钟'},
  {focus:'晚饭后不再边工作边吃零食；戒烟第二周', walk:'累计20～25分钟'},
  {focus:'工作结束前写好明天最重要的一件事', walk:'累计20～25分钟'},
  {focus:'周末也尽量保持起床时间；戒烟最容易复吸的场景通常在聚会', walk:'累计20～25分钟'},
  {focus:'为下周准备蔬菜、蛋白质和早餐食材', walk:'累计20～25分钟'},
  {focus:'第 2 周复盘：精神、饥饿感和执行难度；已两周无酒无甜饮无吸烟', walk:'轻松走20分钟', review:true, medicCheck:true},
  {focus:'同条件称重、量腰围；不因单日波动加码，看 7 天平均', walk:'耐受时累计30分钟', weigh:true},
  {focus:'检查早餐是否只有主食，补上鸡蛋/牛奶/蛋白', walk:'累计25～30分钟'},
  {focus:'留意会议、加班时是否忘记吃饭喝水；忙时先保证不抽烟不喝酒', walk:'累计25～30分钟'},
  {focus:'聚餐仍正常进食，不跳餐补偿；不喝酒，找一杯替代饮品', walk:'累计25～30分钟'},
  {focus:'选择一次喜欢的户外散步，重在放松', walk:'累计25～30分钟'},
  {focus:'提前结束工作，给睡前留出完整 30 分钟', walk:'累计25～30分钟'},
  {focus:'第 3 周复盘：选出最容易长期保留的三个习惯', walk:'轻松走20分钟', review:true, medicCheck:true},
  {focus:'同条件称重；看整体趋势，不比较每天数字', walk:'累计约30分钟', weigh:true},
  {focus:'把最常点的外卖固定成两三种合适组合', walk:'累计约30分钟'},
  {focus:'练习忙碌日简化版：正常吃饭、不抽烟、不喝酒、走10分钟', walk:'允许减至10～15分钟'},
  {focus:'回顾压力大的时候是否容易晚睡、吃零食、想抽烟', walk:'累计约30分钟'},
  {focus:'给自己安排一项喜欢、轻松的活动', walk:'舒适步行'},
  {focus:'准备下一周食材，保持原有节奏', walk:'累计约30分钟'},
  {focus:'第 4 周复盘，整理医嘱复查时间和监测记录', walk:'轻松走20分钟', review:true, medicCheck:true},
  {focus:'同条件称重，选定下个月继续保留的习惯', walk:'累计约30分钟', weigh:true},
  {focus:'量腰围，完成月度复盘，核对医嘱复查时间', walk:'舒适步行，不额外加量', weigh:true}
];

/* 七项统一口径 */
var ITEMS = [
  {key:'dietOk',          name:'饮食',      type:'tri'},
  {key:'noAlcoholSweet',  name:'无酒无甜饮', type:'tri'},
  {key:'noSmoke',         name:'不吸烟',    type:'tri'},
  {key:'walkMin',         name:'步行',      type:'num', unit:'分钟'},
  {key:'sleepH',          name:'睡眠',      type:'num', unit:'小时'},
  {key:'waterMl',         name:'饮水',      type:'num', unit:'毫升'},
  {key:'sedentaryBreaks', name:'久坐中断',   type:'tri'},
  {key:'relax',           name:'放松',      type:'tri', optional:true}
];
var ITEM_MAP = {};
ITEMS.forEach(function(it){ ITEM_MAP[it.key]=it; });
var STD_KEYS  = ['dietOk','noAlcoholSweet','noSmoke','walkMin','sleepH','waterMl','sedentaryBreaks','relax'];
var BUSY_KEYS = ['dietOk','noAlcoholSweet','noSmoke','walkMin','sleepRest'];

var TIPS = {
  diet: '三餐规律，不跳餐、不吃撑。午晚餐尽量半盘非淀粉类蔬菜、四分之一鱼肉蛋豆、四分之一主食。<b>土豆、玉米、山药算主食。</b><br>参考热量约1300～1400千卡/日（碳水45%、蛋白质30%、脂肪25%），具体以营养科方案为准。气虚质宜选平和补气食物：山药、小米、南瓜、红枣、牛肉、鲫鱼、鸡肉等；少生冷、苦寒、辛辣。<b>注意：蜂蜜、红糖、桂圆、荔枝虽属体质宜食，但含糖高，血糖管理期间请控糖优先、遵医嘱。</b>',
  breakfast: '原味燕麦＋无糖牛奶＋鸡蛋；或适量全麦面包＋鸡蛋＋黄瓜。份量按食量和医生建议调整。',
  takeout: '优先清蒸、白灼、少油炒；酱汁少放，不搭配含糖饮料。',
  walkTail: '可以拆分完成，以能正常说完整句子、不明显气喘为宜；疲劳或不适时减量。气虚质宜柔缓：可用八段锦等低强度运动替代或补充步行，避免憋气发力。',
  water: '分次饮水，避免晚上集中补喝。没有限水要求时参考原计划，具体服从医嘱。肾结晶者建议保持充足饮水（如医嘱无限制）。',
  sleep: '固定起床时间，预留7～9小时睡眠；睡前30分钟结束工作。晚睡时逐步调整，不必一次提前很多。',
  sedentary: '每坐约1小时，起身活动3分钟；避免长时间保持同一姿势（骨质增生者尤甚），注意关节保暖。',
  relax: '按摩或缓慢呼吸任选一种，3～5分钟即可。',
  noSmoke: '戒烟初期，烟瘾发作通常持续 3～5 分钟就会减弱。可以：喝一杯水、慢慢呼吸 5 次、起身走几步、嚼无糖口香糖。聚会场景特别容易复吸，提前准备一个替代动作。'
};
var RELAX_TIPS = '印堂按揉：两眉之间的中点，干净指腹轻柔画圈2～3分钟，力度舒适、不疼；皮肤破损或红肿时跳过。仅作辅助放松。<br>'
  + '缓慢呼吸：坐稳、肩膀放松，自然吸气、缓慢呼气，不憋气；头晕时停止。<br>'
  + '气海／关元按揉：气海在肚脐下2横指、关元在肚脐下4横指（前正中线上）。掌根轻柔按揉，每穴2～3分钟，每天1～2次；力度舒适、不疼。仅作辅助放松。';

var G_TIMINGS = ['空腹','餐后2小时','餐前','睡前','随机','糖化血红蛋白'];
var G_COLORS  = {'空腹':'#2f7d5b','餐后2小时':'#d97706','餐前':'#2563eb','睡前':'#7c3aed','随机':'#9ca3af','糖化血红蛋白':'#0ea5e9'};
var MOOD_TEXT = { low:'低落', neutral:'平稳', good:'愉快' };

/* ========== 工具 ========== */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseD(s){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function todayStr(){ return fmt(new Date()); }
function addDays(s, n){ var d=parseD(s); d.setDate(d.getDate()+n); return fmt(d); }
/* 按整月推算：用于中医体质复评到期提醒（不做"每30天"近似） */
function addMonths(s, m){
  var p=s.split('-'), d=new Date(+p[0], (+p[1])-1, +p[2]);
  var day=d.getDate(); d.setMonth(d.getMonth()+m);
  if(d.getDate()<day) d.setDate(0);   /* 月末回退，避免 1/31 + 1 月变成 3/3 */
  return fmt(d);
}
function constReviewDue(cons){
  if(!cons || !cons.date) return '';
  var m = cons.reviewMonths ? +cons.reviewMonths : 3;
  return addMonths(cons.date, m);
}
function dayIndex(dateStr){ return Math.round((parseD(dateStr) - parseD(cycleStart())) / 86400000) + 1; }
function dateLabel(dateStr){ var p=dateStr.split('-'); return (+p[1])+'月'+(+p[2])+'日'; }
function hhmm(dt){ return pad(dt.getHours())+':'+pad(dt.getMinutes()); }
function $(sel, el){ return (el||document).querySelector(sel); }
function $$(sel, el){ return Array.prototype.slice.call((el||document).querySelectorAll(sel)); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function hasNum(v){ return v!==undefined && v!==null && v!=='' && !isNaN(parseFloat(v)); }
function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
function isSubmitted(d){ return !!(d && d.done===true); }
/* 三态：true 完成 / false 未完成 / undefined 未记录 */
function triOf(d,k){ return d[k]===true ? 'yes' : (d[k]===false ? 'no' : 'unknown'); }

function toast(msg){
  var t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(function(){ t.classList.remove('show'); }, 1800);
}

/* ========== 数据层 ========== */
function blankDay(){
  return {
    mode: undefined,
    dietOk: undefined, noAlcoholSweet: undefined, noSmoke: undefined, sedentaryBreaks: undefined, relax: undefined,
    sleepRest: undefined,
    skipped: {},
    waterMl:'', walkMin:'', sleepH:'',
    wakeTime:'', weight:'', waist:'',
    stress:'', mood:'', oneLine:'', did:'', tomorrow:'', note:'',
    glucose:[],
    done: undefined, submitTime:'', draftSavedAt:''
  };
}
function blankBase(){
  return {
    weight : { value:'89.5', date:null,   source:'体检报告', note:'' },
    glucose: { value:'7.0',  date:START,  source:'',        note:'' },
    waist  : { value:'',     date:null,   source:'',        note:'' },
    constitution : { value:'', date:null, source:'',        note:'', reviewMonths:3 },
    wakeTime:'07:00', bedTime:'23:00'
  };
}
function blankDB(){
  return {
    version:4,
    baseline:blankBase(),
    days:{}, weeks:{}, settings:{},
    cycles:[
      { id:1, start:START, end:END, name:'2026年10月至11月', reviewDate:'2026-11-18', active:true }
    ],
    issues:[],           // {id,name,type,currentStatus,keywords[],source,occurDate,monitorIds[],cycleGoal,linkedActions[],nextReviewDate,reviewDate,focus:boolean,archived:boolean,archivedAt,archivedReason,createdAt,updatedAt}
    events:[],           // {id,date,approxDate,type,issueIds[],description,source,value,valueUnit,notes,createdAt}
    reviews:[],          // 月度复盘快照 {id,cycleId,reviewDate,completedAt,evaluations:[{issueId,rating,evidence,note}],nextPlan}
    monitorItems:[],     // 监测项目定义 {id,issueId,name,kind:'num'|'score'|'status'|'text',unit,options[],notes,createdAt}
    trash:[]             // 回收站 {type:'issue'|'event'|'monitorItem',obj,deletedAt}
  };
}
function load(){
  var db = null;
  try{ var raw = localStorage.getItem(LS_KEY); if(raw) db = JSON.parse(raw); }catch(e){ db=null; }
  if(!db) return blankDB();
  db = migrate(db);
  /* 迁移后立即写回，保证 localStorage 中的版本号与结构与内存一致 */
  try{ localStorage.setItem(LS_KEY, JSON.stringify(db)); }catch(e){}
  return db;
}
/* 旧数据迁移：字段缺失一律视为未记录，不补成 0 / false */
function migrate(db){
  db.days = db.days || {};
  var old = !(db.version >= 2);
  if(old){
    var b = db.baseline || {};
    var bw = (b.weight!==undefined && b.weight!==null && b.weight!=='') ? b.weight : '89.5';
    var bg = (b.glucose!==undefined && b.glucose!==null && b.glucose!=='') ? b.glucose : '7.0';
    db.baseline = {
      weight : { value:String(bw), date:null,  source:'体检报告', note:'' },
      glucose: { value:String(bg), date:START, source:'',        note:'' },
      waist  : { value: b.waist!==undefined?String(b.waist):'', date:null, source:'', note:'' },
      wakeTime: b.wakeTime||'07:00', bedTime: b.bedTime||'23:00'
    };
    Object.keys(db.days).forEach(function(ds){
      var d = db.days[ds] || {};
      /* 旧版本默认值 false 并不能代表真实完成情况 → 还原为未记录 */
      ['dietOk','noAlcoholSweet','noSmoke','sedentaryBreaks','relax','sleepRest'].forEach(function(k){
        if(d[k]===false) d[k]=undefined;
        if(d[k]===undefined) delete d[k];
      });
      if(!Array.isArray(d.glucose)) d.glucose=[];
      if(!d.skipped || typeof d.skipped!=='object') d.skipped={};
      d.done = d.done===true ? true : undefined;
      ['mode','wakeTime','weight','waist','stress','oneLine','did','tomorrow','note','submitTime','draftSavedAt'].forEach(function(k){
        if(d[k]===undefined || d[k]===null) d[k]='';
      });
      d.mode = d.mode||undefined;
      db.days[ds]=d;
    });
  }
  db.version = 3;
  db.baseline = db.baseline || blankBase();
  if(Array.isArray(db.baseline)) db.baseline = blankBase();
  ['weight','glucose','waist'].forEach(function(k){
    var o = db.baseline[k];
    if(o===undefined || o===null || typeof o!=='object'){
      o = { value:(o==null?'':String(o)), date:null, source:'', note:'' };
    }
    if(o.date===undefined) o.date=null;
    if(o.source===undefined) o.source='';
    if(o.note===undefined) o.note='';
    if(o.value===undefined||o.value===null) o.value='';
    db.baseline[k]=o;
  });
  if(!db.baseline.wakeTime) db.baseline.wakeTime='07:00';
  if(!db.baseline.bedTime)  db.baseline.bedTime='23:00';
  /* v3 → v4：中医体质字段 */
  var bc = db.baseline.constitution;
  if(!bc || typeof bc!=='object') bc = {};
  db.baseline.constitution = {
    value:  bc.value  || '',
    date:   bc.date   || null,
    source: bc.source || '',
    note:   bc.note   || '',
    reviewMonths: bc.reviewMonths ? +bc.reviewMonths : 3
  };
  db.weeks = db.weeks || {};
  db.settings = db.settings || {};
  if(!Array.isArray(db.settings.dismissedBackup)) db.settings.dismissedBackup=[];
  /* 兜底：任何版本、任何来源的每日记录缺 glucose 数组时补齐，避免页面渲染报错 */
  Object.keys(db.days).forEach(function(ds){
    var d = db.days[ds];
    if(!d || typeof d!=='object'){ db.days[ds]=blankDay(); return; }
    if(!Array.isArray(d.glucose)) d.glucose=[];
    if(!d.skipped || typeof d.skipped!=='object') d.skipped={};
  });

  /* v2 → v3：新增健康档案集合，旧数据完整保留 */
  if(!Array.isArray(db.cycles) || db.cycles.length===0){
    db.cycles = [{ id:1, start:START, end:END, name:'2026年10月至11月', reviewDate:'2026-11-18', active:true }];
  }
  if(!Array.isArray(db.issues)) db.issues=[];
  if(!Array.isArray(db.events)) db.events=[];
  if(!Array.isArray(db.reviews)) db.reviews=[];
  if(!Array.isArray(db.monitorItems)) db.monitorItems=[];
  if(!Array.isArray(db.trash)) db.trash=[];
  /* 血糖迁移：同天同 timing 只保留最新一条（覆盖逻辑） */
  if(!db._migGlucoseDeduped){
    Object.keys(db.days).forEach(function(ds){
      var d=db.days[ds];
      if(!Array.isArray(d.glucose)||d.glucose.length<=1){ db.days[ds]=d; return; }
      var seen={}, dedup=[];
      /* 最新在后，所以反向遍历、先到的留 */
      for(var i=d.glucose.length-1;i>=0;i--){
        var g=d.glucose[i];
        if(!g||!g.timing){ dedup.unshift(g); continue; }
        if(seen[g.timing]) continue; /* 同 timing 已经留过了（就是更晚的那条） */
        seen[g.timing]=true; dedup.unshift(g);
      }
      d.glucose=dedup;
      db.days[ds]=d;
    });
    db._migGlucoseDeduped=true;
  }
  db.version = 4;
  return db;
}

var DB = load();

var saveState = { status:'idle', time:'' };   // idle | saving | saved | failed
function save(){
  saveState.status='saving';
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
    saveState.status='saved';
    saveState.time = hhmm(new Date());
    return true;
  }catch(e){
    saveState.status='failed';
    return false;
  }
}
function getDay(dateStr){
  if(!DB.days[dateStr]){
    /* 新记录：只在真正写入时落库，读时返回空白对象 */
  }
  return DB.days[dateStr] || blankDay();
}
function ensureDay(dateStr){
  if(!DB.days[dateStr]) DB.days[dateStr] = blankDay();
  return DB.days[dateStr];
}
function isRecorded(d){ return !!d && typeof d==='object'; }
function dayHasContent(d){
  if(!isRecorded(d)) return false;
  if(isSubmitted(d)) return true;
  var has = ['dietOk','noAlcoholSweet','noSmoke','sedentaryBreaks','relax','sleepRest'].some(function(k){ return d[k]!==undefined; });
  has = has || ['waterMl','walkMin','sleepH','wakeTime','weight','waist','stress','oneLine','did','tomorrow','note']
    .some(function(k){ return d[k]!==undefined && d[k]!==''; });
  has = has || (Array.isArray(d.glucose) && d.glucose.length>0);
  return has;
}

/* ========== 统计 ========== */
var undoStack = {};   // 内存态：{date:{water:[], walk:[]}}

function weekOfIdx(idx){ return Math.floor((idx-1)/7)+1; }        // 1..N
function weekRange(w){ return [ addDays(cycleStart(),(w-1)*7), addDays(cycleStart(), Math.min(w*7,cycleTotal())-1) ]; }
function currentWeek(){
  var idx = dayIndex(todayStr());
  var tot = cycleTotal();
  if(idx<1) return 1;
  if(idx>tot) return Math.ceil(tot/7);
  return weekOfIdx(idx);
}
/* 已打卡 = 提交了记录（唯一日期计数，重复提交不增加） */
function submittedDates(){ return Object.keys(DB.days).filter(function(ds){ return isSubmitted(DB.days[ds]); }); }
function weekSubmittedDays(w){
  var tot = cycleTotal();
  var st = submittedDates().filter(function(ds){ var i=dayIndex(ds); return i>=1 && i<=tot && weekOfIdx(i)===w; });
  return st.length;
}
function streak(){
  var s=0, d=todayStr();
  if(dayIndex(d)<1) return 0;
  if(!isSubmitted(DB.days[d])) d = addDays(d,-1);
  while(DB.days[d] && isSubmitted(DB.days[d])){ s++; d=addDays(d,-1); }
  return s;
}
/* 取最近一次记录的体重；没有则返回基线 */
function baselineOrLatestWeight(){
  var ds = Object.keys(DB.days).sort();
  for(var i=ds.length-1;i>=0;i--){
    var w = num(DB.days[ds[i]].weight);
    if(w!=null) return w.toFixed(1);
  }
  var bw = num((DB.baseline.weight||{}).value);
  return bw!=null ? bw.toFixed(1) : '—';
}
/* 当日模式目标完成：该模式全部项目都达到完成/已记录 */
function dayModeKeys(d){ return (d.mode==='busy') ? BUSY_KEYS : STD_KEYS; }
function dayTargetFull(d){
  var busy = (d.mode==='busy');
  var keys = dayModeKeys(d);
  return keys.every(function(k){
    if(k==='walkMin'){ var m=num(d.walkMin); return m!=null && m>0 && (!busy || m>=10); }
    if(k==='sleepH' || k==='waterMl') return hasNum(d[k]);
    return d[k]===true;
  });
}
function modeFullDays(){
  var tot = cycleTotal();
  return Object.keys(DB.days).filter(function(ds){
    var d=DB.days[ds]; var i=dayIndex(ds);
    if(i<1||i>tot) return false;
    return dayHasContent(d) && dayTargetFull(d);
  }).length;
}

/* ========== 页面状态 ========== */
var currentTab='today';
var viewDate=todayStr();
var editing=false;
var uiState={ glucose:false, mood:false, moodMore:false, extra:false, tips:{} };

function renderAll(){ renderToday(); renderPlan(); renderTrend(); renderSetting(); if(typeof window.__h30_renderArchive==='function') window.__h30_renderArchive(); }

/* ============ 今日页 ============ */
function renderToday(){
  var el=$('#page-today');
  var t=viewDate, today=todayStr();
  var isToday=(t===today), future=(t>today);
  var idx=dayIndex(t), inRange=(idx>=1&&idx<=TOTAL);
  var plan = inRange ? PLAN[idx-1]
    : (idx<1 ? {focus:'计划尚未开始（10月20日开始）', walk:''}
    : {focus:'30天计划已结束，继续保持已养成的习惯', walk:'舒适步行'});
  var d = getDay(t);
  /* 收集所有历史空腹血糖（跨日期）用于今日页一览 */
  var histFasting=[];
  Object.keys(DB.days).sort().forEach(function(ds){
    (DB.days[ds].glucose||[]).forEach(function(g){
      if(g.timing==='空腹'){ var v=num(g.value); if(v!=null) histFasting.push({date:ds, value:v, method:g.method||'', meds:g.meds||''}); }
    });
  });
  var submitted = isSubmitted(d);
  var locked = future || (isToday && submitted && !editing);
  var mode = d.mode || 'standard';
  var busy = (mode==='busy');
  var st = streak();

  var html='';

  /* 1. 日期、第几天、当天重点 */
  var canPrev = t>START, canNext = t<today;
  html += '<div class="date-nav">'
    + '<button class="nav-arrow" id="nav-prev" '+(canPrev?'':'disabled')+'>‹</button>'
    + '<div class="nav-label"><div>'+dateLabel(t)
    + (isToday?' <span class="today-badge">今天</span>':'')
    + (future?' <span class="draft-badge future">未开始</span>':'')
    + (submitted?' <span class="draft-badge ok">已打卡</span>':(dayHasContent(d)?' <span class="draft-badge">草稿</span>':''))
    + '</div>'
    + (isToday
        ? '<div class="nav-hint">点两侧箭头可查看、修改其他日期</div>'
        : '<a href="javascript:void 0" id="nav-back-today" class="back-today">✕ 回到今天</a>')
    + '</div>'
    + '<button class="nav-arrow" id="nav-next" '+(canNext?'':'disabled')+'>›</button>'
    + '</div>';

  html += '<div class="day-hero">'
    + '<div class="day-num">' + (inRange?('第 '+idx+' 天 / 共 30 天'):(idx<1?'准备阶段':'计划已完成'))
    + ' · ' + dateLabel(t) + '</div>'
    + '<div class="day-focus">'+esc(plan.focus)+'</div>'
    + (plan.walk?'<div class="day-walk">🚶 步行安排：'+esc(plan.walk)+'</div>':'')
    + '<div class="hero-stats hero-stats-2">'
    +   '<div class="hero-stat"><div class="v">'+weekSubmittedDays(currentWeek())+'</div><div class="k">本周已打卡 天</div></div>'
    +   '<div class="hero-stat"><div class="v">'+submittedDates().length+'</div><div class="k">累计已打卡 天</div></div>'
    + '</div>'
        + '<div class="hero-sub">连续打卡 '+st+' 天 · 周期 '+CYCLE+'</div>'
    + '</div>';

  /* 三月总目标进度条 */
  var qStart = parseD(QUARTER.start), qEnd = parseD(QUARTER.end), qToday = parseD(todayStr());
  var qTotal = (qEnd-qStart)/86400000;
  var qDone  = Math.max(0, Math.min(qTotal, Math.round((qToday-qStart)/86400000)));
  var qPct   = Math.round(qDone/qTotal*100);
  var qLabel;
  if(qDone <= 0)              qLabel = '三月目标还剩 '+(Math.round((qStart-parseD(t))/86400000))+' 天开始';
  else if(qDone > qTotal)     qLabel = '三月目标周期已结束';
  else                        qLabel = '三月目标第 '+qDone+' 天 / 共 '+qTotal+' 天';
  html += '<div class="qcard">'
    + '<div class="qcard-head"><b>🎯 '+esc(QUARTER.title)+'</b></div>'
    + '<div class="qbar"><div class="qbar-inner" style="width:'+qPct+'%"></div></div>'
    + '<div class="qbar-labels"><span>'+esc(qLabel)+'</span><span>已完成 '+qPct+'%</span></div>';
  var qDaysLeft = Math.max(0, qTotal - qDone);
  html += '<div class="qcard-body"><div class="qstat">当前体重 <b>'+esc(baselineOrLatestWeight())+' kg</b>（基线 '+QUARTER.baselineWeight+' → 目标 '+QUARTER.targetWeight+'）</div>'
    + '<div class="qstat">三月还剩 <b>'+qDaysLeft+' 天</b> · 平均每周减重约 <b>'+((QUARTER.baselineWeight-QUARTER.targetWeight)/12).toFixed(1)+' kg</b></div></div>';
  QUARTER.stages.forEach(function(stg,i){
    var cls='qstage';
    if(i===0 && qDone<=28) cls += ' active';
    else if(i===1 && qDone>28 && qDone<=56) cls += ' active';
    else if(i===2 && qDone>56) cls += ' active';
    html += '<div class="'+cls+'"><b>'+esc(stg.weeks)+' · '+esc(stg.focus)+'</b> — '+esc(stg.desc)+'</div>';
  });
  html += '</div>';

  if(plan.review){
    var wk=weekOfIdx(idx);
    var dismissed=(DB.settings.dismissedBackup||[]).indexOf(wk)>=0;
    html += '<div class="notice" style="margin-bottom:12px">📋 <b>今天是周复盘日</b>：在第 '+wk+' 周的「下周调整」里写下一句调整方向。</div>';
    if(plan.medicCheck){
      html += '<div class="notice" style="margin-bottom:12px;color:var(--text);background:#fff4e6;border:1px solid #ffd591">🏥 <b>本周请安排一次门诊</b>：消化内科（肝酶 11 年异常 · 做 FIB-4）、内分泌（血糖复核）、心血管（降脂评估），三项不等体重降下来。</div>';
    }
  }
  if(plan.weigh){ html += '<div class="notice" style="margin-bottom:12px">⚖️ 今天建议<b>同条件称重</b>（晨起、如厕后、早餐前），并记录体重／腰围。</div>'; }
  /* 就诊提醒（P0）：健康档案里有「报告建议就诊」标注且未归档的问题 */
  if(isToday){
    var careIssues = (DB.issues||[]).filter(function(i){ return i.seekCare && !i.archived; });
    if(careIssues.length && DB.settings.dismissedCareAt!==today){
      html += '<div class="banner care"><div class="banner-txt">🏥 就诊提醒：'+esc(careIssues.map(function(i){return i.name;}).join('、'))
        + '。请按体检报告建议尽快到专科就诊——打卡不能替代就医。</div>'
        + '<button class="banner-x" id="btn-view-care">查看</button><button class="banner-x" id="btn-dismiss-care">✕</button></div>';
    }
  }
  if(future){ html += '<div class="notice" style="margin-bottom:12px">🔒 该日期尚未到来，仅可查看计划，不能填写或提交。</div>'; }
  if(isToday && submitted && !editing){ html += '<div class="notice" style="margin-bottom:12px">✅ 今日已打卡 · '+esc(d.submitTime||'')+'。如需更正，点底部「修改」。</div>'; }

  /* 2. 标准版／忙碌版切换 */
  html += '<div class="mode-switch">'
    + '<div class="mode-label">显示模式</div>'
    + '<div class="seg-switch">'
    +   '<button class="seg-btn'+(busy?'':' on')+'" data-mode="standard" '+(locked?'disabled':'')+'>标准版</button>'
    +   '<button class="seg-btn'+(busy?' on':'')+'" data-mode="busy" '+(locked?'disabled':'')+'>极简版</button>'
    + '</div></div>';
  html += '<div class="chart-note" style="margin:-4px 0 12px">极简版只简化显示，不影响其他记录，也不会自动打勾。</div>';

  /* 3. 今日行动与快捷打卡 */
  /* 监测数据永远可编辑：血糖、体重、腰围、心情、起床时间 —— 不是承诺，是记录 */
  var dis = locked ? ' disabled' : '';
  var disMon = ''; /* 监测类字段：永远不禁用 */
  html += '<div class="card"><div class="card-title">今日行动 <span class="sub">'+(busy?'极简版 4 项':'标准版 8 项')+'</span></div>';
  if(!busy){
    html += actionTri(t,'dietOk','饮食规律，餐盘比例基本合理','',locked);
    html += actionTri(t,'noAlcoholSweet','无酒、无含糖饮料','',locked);
    html += actionTri(t,'noSmoke','不吸烟','聚会、压力大时特别留意',locked);
    html += actionNum(t,'walkMin','步行','分钟','例如 30',locked,'plan-walk');
    html += actionNum(t,'sleepH','睡眠（昨晚）','小时','例如 7.5',locked);
    html += actionNum(t,'waterMl','饮水','毫升','例如 2500',locked,'quick-water');
    html += actionTri(t,'sedentaryBreaks','久坐中断','每坐约1小时起身3分钟',locked);
    html += actionTri(t,'relax','放松 3～5 分钟','可选，可今日跳过',locked,true);
  } else {
    html += '<div class="chart-note" style="margin:-2px 0 8px">极简版保住这 4 项即可：规律吃饭、无酒无甜饮、步行10分钟、尽量按时休息。</div>';
    html += actionTri(t,'dietOk','规律吃饭','不跳餐、不吃撑',locked);
    html += actionTri(t,'noAlcoholSweet','无酒、无含糖饮料','',locked);
    html += actionTri(t,'noSmoke','不吸烟','聚会、压力大时特别留意',locked);
    html += actionNum(t,'walkMin','步行（至少10分钟）','分钟','例如 15',locked,'plan-walk');
    html += actionTri(t,'sleepRest','尽量按时休息','目标 23:00 上床 / 7:00 起床',locked);
    html += '<details class="fold" id="fold-extra"'+(uiState.extra?' open':'')+'><summary>其他记录（睡眠／饮水／久坐／放松）</summary>'
      + actionNum(t,'sleepH','睡眠（昨晚）','小时','例如 7.5',locked)
      + actionNum(t,'waterMl','饮水','毫升','例如 2500',locked,'quick-water')
      + actionTri(t,'sedentaryBreaks','久坐中断','每坐约1小时起身3分钟',locked)
      + actionTri(t,'relax','放松 3～5 分钟','可选，可今日跳过',locked,true)
      + '</details>';
  }
  html += '</div>';

  /* 4. 今日数值 */
  html += '<div class="card"><div class="card-title">今日数值 <span class="sub">空着代表未记录，不算 0</span></div>';
  html += '<div class="num-summary" id="num-summary">'+numSummary(d)+'</div>';
  html += '<div class="chart-note" style="text-align:left">饮水量／步行在「今日行动」里填写，可用快捷按钮累加。</div>';
  html += '<div class="field"><label>起床时间（当天实际）</label><input type="time"'+disMon+' id="f-wake" value="'+esc(d.wakeTime)+'"></div>';
  html += '<div class="chart-note" style="text-align:left">起床时间留空代表未记录，不会用设置里的目标时间代替。</div>';
  if(plan.weigh){
    html += '<div class="weigh-box"><div class="weigh-title">⚖️ 今天是指定测量日</div>'
      + '<div class="field-row">'
      + '<div class="field input-suffix"><label>体重</label><input type="number" step="0.1"'+disMon+' id="f-weight" value="'+esc(d.weight)+'" placeholder="例如 88.5"><span class="suffix">kg</span></div>'
      + '<div class="field input-suffix"><label>腰围</label><input type="number" step="0.5"'+disMon+' id="f-waist" value="'+esc(d.waist)+'" placeholder="例如 98"><span class="suffix">cm</span></div>'
      + '</div></div>';
  } else {
    html += '<details class="fold" id="fold-measure"><summary>其他测量（体重／腰围）</summary>'
      + '<div class="field-row">'
      + '<div class="field input-suffix"><label>体重</label><input type="number" step="0.1"'+disMon+' id="f-weight" value="'+esc(d.weight)+'" placeholder="例如 88.5"><span class="suffix">kg</span></div>'
      + '<div class="field input-suffix"><label>腰围</label><input type="number" step="0.5"'+disMon+' id="f-waist" value="'+esc(d.waist)+'" placeholder="例如 98"><span class="suffix">cm</span></div>'
      + '</div></details>';
  }
  html += '</div>';

  /* 5. 血糖记录（默认折叠，覆盖逻辑：同天同时机只保留最新一条） */
  html += '<details class="fold card" id="fold-glucose"'+(uiState.glucose?' open':'')+'><summary>血糖记录（空腹）'
    + '<span class="fold-sub">'+((d.glucose.length>0||histFasting.length>0)?('今日 '+d.glucose.filter(function(x){return x.timing==='空腹';}).length+' 条 · 历史 '+histFasting.length+' 条'):'默认折叠')+'</span></summary>';
  html += '<div class="chart-note" style="text-align:left;margin:2px 0 8px">家用血糖仪每天早上测的就是空腹血糖。重复记录同天同时机会自动覆盖，只保留最新值。</div>';

  /* 今日（所有时机） */
  var todayGlucose = d.glucose.slice().reverse(); /* 最新在前 */
  if(todayGlucose.length===0 && histFasting.length===0){
    html += '<div class="empty" style="padding:8px 0">还没有血糖记录</div>';
  } else {
    if(todayGlucose.length>0){
      html += '<div class="g-group">今日测量</div>';
      todayGlucose.forEach(function(g){
        html += '<div class="glucose-item"><span class="val">'+esc(g.value)+'</span><span class="tag">mmol/L</span>'
          + '<span class="tag">'+esc(g.timing)+'</span>'
          + (g.method?'<span class="tag">'+esc(g.method)+'</span>':'<span class="tag warn">测量方式待补充</span>')
          + (g.meds?'<span class="tag">用药：'+esc(g.meds)+'</span>':'')+'</div>';
      });
    }
    /* 历史空腹（跨日期，最新在前，不含今天） */
    var histOnly = histFasting.filter(function(p){ return p.date!==t; });
    if(histOnly.length>0){
      html += '<div class="g-group">历史空腹血糖（'+histOnly.length+' 条）</div>';
      histOnly.slice().reverse().forEach(function(p){
        html += '<div class="glucose-item"><span class="val">'+p.value+'</span><span class="tag">mmol/L</span>'
          + '<span class="tag">空腹</span><span class="tag">'+dateLabel(p.date)+'</span>'
          + (p.method?'<span class="tag">'+esc(p.method)+'</span>':'<span class="tag warn">测量方式未记录</span>')+'</div>';
      });
    }
  }
  html += '<div class="field-row" style="margin-top:8px">'
    + '<div class="field input-suffix"><input type="number" step="0.1" id="g-value" placeholder="数值"><span class="suffix">mmol/L</span></div>'
    + '<div class="field"><select id="g-timing">'+G_TIMINGS.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><input type="text" id="g-method" placeholder="测量方式（如：家用血糖仪）"></div>'
    + '<div class="field"><input type="text" id="g-meds" placeholder="用药情况（可不填）"></div>'
    + '</div>'
    + '<button class="btn secondary small" id="btn-add-glucose">保存血糖（同天覆盖）</button>';
  html += '</details>';

  /* 6. 心情记录（默认折叠） */
  html += '<details class="fold card" id="fold-mood"'+(uiState.mood?' open':'')+'><summary>心情记录'
    + '<span class="fold-sub">'+(hasNum(d.stress)?('压力 '+esc(d.stress)+'/10'):'默认折叠，可不填')+'</span></summary>';
  html += '<div class="field"><label>今日压力（0-10，可不填）</label><input type="number" min="0" max="10"'+disMon+' id="f-stress" value="'+esc(d.stress)+'" placeholder="例如 6"></div>';
  /* 情绪状态：气郁质追踪用，可选 */
  html += '<div class="field"><label>情绪状态（可选）</label><div class="chip-row" id="mood-row">'
    + ['low','neutral','good'].map(function(m){
        var on = d.mood===m;
        return '<button type="button" class="chip'+(on?' on':'')+'" data-mood="'+m+'">'+MOOD_TEXT[m]+'</button>';
      }).join('')
    + '</div></div>';
  html += '<div class="field"><label>一句话记录（可不填）</label><textarea'+disMon+' id="f-oneLine" placeholder="例如：今天有点累，但把午饭吃踏实了">'+esc(d.oneLine)+'</textarea></div>';
  html += '<details class="fold" id="fold-moodmore"'+(uiState.moodMore?' open':'')+'><summary>更多记录</summary>'
    + '<div class="field"><label>今天我做到了</label><textarea'+disMon+' id="f-did" placeholder="一两句话">'+esc(d.did)+'</textarea></div>'
    + '<div class="field"><label>明天最重要的一件事</label><textarea'+disMon+' id="f-tomorrow" placeholder="一句话">'+esc(d.tomorrow)+'</textarea></div>'
    + '<div class="field"><label>备注／复盘</label><textarea'+disMon+' id="f-note" placeholder="复盘日写在这里">'+esc(d.note)+'</textarea></div>'
    + '</details>';
  html += '</details>';

  /* 7. 保存状态与提交按钮 */
  html += '<div class="save-area">';
  html += '<div class="save-status '+saveStateClass(d,submitted,t,isToday)+'" id="save-status">'+saveStatusText(d,submitted,t,isToday)+'</div>';
  if(future){
    html += '<div class="chart-note">未来日期不可提交</div>';
  } else if(locked){
    html += '<button class="btn secondary" id="btn-edit">修改</button>';
  } else {
    var mainLabel = isToday ? (submitted?'保存修改':'完成今日打卡') : (submitted?'保存修改':'补记打卡');
    html += '<div class="btn-row">'
      + '<button class="btn secondary" id="btn-draft">保存草稿</button>'
      + '<button class="btn" id="btn-submit">'+mainLabel+'</button>'
      + '</div>';
  }
  html += '</div>';
  html += '<div class="notice">数据保存在当前浏览器，换设备或清理浏览器前请导出备份。允许部分完成时提交，不强制填写血糖、体重、腰围或心情。</div>';
  html += '<div class="notice red">⚠️ 如出现黄疸、持续腹痛、腰痛伴发热或尿量显著减少等明显新症状，请及时就医。本工具不替代医嘱，用药和复查按医生要求执行。</div>';

  el.innerHTML = html;
  bindToday(el, d, t);
  bindFolds(el);
}

/* 三态行动行 */
function actionTri(dateStr,key,label,hint,locked,optional){
  var d=getDay(dateStr), s=triOf(d,key);
  var skipped = d.skipped && d.skipped[key];
  var boxCls = 'box'+(s==='yes'?' on':(s==='no'?' off':(skipped?' skip':'')));
  var boxTxt = s==='yes'?'✓':(s==='no'?'✕':(skipped?'—':''));
  return '<div class="check-row'+(locked?' locked':'')+'">'
    + '<div class="'+boxCls+'"'+(locked?'':' data-tri="'+key+'"')+'>'+boxTxt+'</div>'
    + '<div class="label">'+esc(label)
    + (hint?'<div class="hint">'+esc(hint)+'</div>':'')
    + triLegend(key,optional,locked)
    + tipBlock(key,dateStr,locked)
    + '</div></div>';
}
function triLegend(key,optional,locked){
  if(locked) return '';
  var d0=getDay(viewDate);
  var skipped=d0.skipped&&d0.skipped[key];
  var lg='<div class="tri-hint">连点方框切换：未记录 → 完成 → 未完成'
    + (skipped?' <b style="color:var(--primary)">已跳过</b>':'')+'</div>';
  if(optional) lg += '<button class="link-btn" data-skip="'+key+'">'+(skipped?'取消跳过':'今日跳过')+'</button>';
  return lg;
}
/* 数值型行动行 */
function actionNum(dateStr,key,label,unit,ph,locked,extra){
  var d=getDay(dateStr);
  var v=d[key];
  var s='<div class="num-state'+(hasNum(v)?' ok':'')+'">'+(hasNum(v)?('已记录 '+esc(v)+' '+unit):'未记录')+'</div>';
  var tip=tipBlock(key,dateStr,locked);
  var quick='';
  if(extra==='quick-water') quick=quickRow('water',locked);
  else if(extra==='plan-walk') quick=quickRow('walk',locked);
  return '<div class="num-row'+(locked?' locked':'')+'">'
    + '<div class="num-head"><div class="num-label">'+esc(label)+'</div><div class="num-input">'
    + '<input type="number"'+(locked?' disabled':'')+' id="q-'+key+'" value="'+esc(v)+'" placeholder="'+esc(ph)+'"><span class="unit">'+esc(unit)+'</span>'
    + '</div></div>'
    + s + quick + tip + '</div>';
}
function tipBlock(key,dateStr,locked){
  var body='';
  if(key==='dietOk'){
    body = '<div class="tip-body">'+TIPS.diet+'<div class="tip-sub">早餐参考</div>'+TIPS.breakfast
         + '<div class="tip-sub">外卖参考</div>'+TIPS.takeout+'</div>';
  } else if(key==='walkMin'){
    var idx=dayIndex(dateStr), p=(idx>=1&&idx<=TOTAL)?PLAN[idx-1]:null;
    body = '<div class="tip-body">当天安排：<b>'+esc(p?p.walk:'舒适步行')+'</b>。'+TIPS.walkTail+'</div>';
  } else if(key==='waterMl'){ body='<div class="tip-body">'+TIPS.water+'</div>'; }
  else if(key==='sleepH'||key==='sleepRest'){ body='<div class="tip-body">'+TIPS.sleep+'</div>'; }
  else if(key==='sedentaryBreaks'){ body='<div class="tip-body">'+TIPS.sedentary+'</div>'; }
  else if(key==='relax'){
    body='<div class="tip-body">'+TIPS.relax+'<div class="tip-sub">两种做法</div>'+RELAX_TIPS
      + '<div class="acu-wrap">'
      + '<svg class="acu-svg" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="气海与关元位置示意图">'
      + '<rect x="38" y="8" width="84" height="184" rx="34" fill="#f8faf9" stroke="#cfd8d3"/>'
      + '<line x1="80" y1="18" x2="80" y2="186" stroke="#dde5e1" stroke-dasharray="3 4"/>'
      + '<circle cx="80" cy="78" r="9" fill="#fff" stroke="#9aa8a1" stroke-width="1.5"/>'
      + '<text x="80" y="81" font-size="8" text-anchor="middle" fill="#7b8a83">脐</text>'
      + '<circle cx="80" cy="104" r="4.5" fill="#2f7d5b"/>'
      + '<circle cx="80" cy="126" r="4.5" fill="#d97706"/>'
      + '<line x1="88" y1="104" x2="118" y2="100" stroke="#2f7d5b" stroke-width="1"/>'
      + '<text x="121" y="103" font-size="9" fill="#2f7d5b">气海</text>'
      + '<line x1="88" y1="126" x2="118" y2="130" stroke="#d97706" stroke-width="1"/>'
      + '<text x="121" y="133" font-size="9" fill="#b45309">关元</text>'
      + '<text x="80" y="190" font-size="7.5" text-anchor="middle" fill="#8b9a93">前正中线 · 脐下 2 / 4 横指</text>'
      + '</svg>'
      + '<div class="acu-cap">位置示意，仅作参考；孕妇、腹部术后或皮肤异常者请先咨询医生</div>'
      + '</div></div>';
  }
  if(!body) return '';
  return '<details class="tips"><summary>查看方法</summary>'+body+'</details>';
}
function numSummary(d){
  var parts=[];
  parts.push('<div class="ns-item'+(hasNum(d.waterMl)?' ok':'')+'">饮水 <b>'+(hasNum(d.waterMl)?esc(d.waterMl)+' 毫升':'未记录')+'</b></div>');
  parts.push('<div class="ns-item'+(hasNum(d.walkMin)?' ok':'')+'">步行 <b>'+(hasNum(d.walkMin)?esc(d.walkMin)+' 分钟':'未记录')+'</b></div>');
  parts.push('<div class="ns-item'+(hasNum(d.sleepH)?' ok':'')+'">睡眠 <b>'+(hasNum(d.sleepH)?esc(d.sleepH)+' 小时':'未记录')+'</b></div>');
  return parts.join('');
}
function quickRow(kind,locked){
  if(locked) return '';
  var stack=(undoStack[viewDate]&&undoStack[viewDate][kind])||[];
  var btns = kind==='water'
    ? '<button class="chip" data-add="water" data-val="200">＋200毫升</button><button class="chip" data-add="water" data-val="300">＋300毫升</button>'
    : '<button class="chip" data-add="walk" data-val="10">＋10分钟</button><button class="chip" data-add="walk" data-val="15">＋15分钟</button>';
  return '<div class="chip-row">'+btns
    + '<button class="chip undo" id="undo-'+kind+'" '+(stack.length?'':'disabled')+'>撤销</button></div>';
}

function saveStateClass(d,submitted,t,isToday){
  if(saveState.status==='failed') return 'failed';
  if(submitted) return 'ok';
  if(d.draftSavedAt) return 'saved';
  return '';
}
function saveStatusText(d,submitted,t,isToday){
  if(saveState.status==='failed') return '保存失败，请重试。';
  if(saveState.status==='saving') return '正在保存……';
  if(submitted){
    var when = d.submitTime||'';
    return (isToday?'今日已打卡':'该日已打卡')+(when?' · '+when:'');
  }
  if(d.draftSavedAt) return '草稿已保存 · '+d.draftSavedAt;
  return '尚未记录';
}

/* 把表单内容写入记录（不含提交标记） */
function collectFields(el,d){
  var pairs=['q-waterMl:waterMl','q-walkMin:walkMin','q-sleepH:sleepH',
   'f-wake:wakeTime','f-weight:weight','f-waist:waist',
   'f-stress:stress','f-oneLine:oneLine','f-did:did','f-tomorrow:tomorrow','f-note:note'];
  pairs.forEach(function(pair){
    var p=pair.split(':'), f=$('#'+p[0],el);
    if(f) d[p[1]]=f.value;
  });
}

function bindFolds(el){
  $$('details.fold',el).forEach(function(dt){
    dt.addEventListener('toggle', function(){
      var id=dt.id;
      if(id==='fold-glucose') uiState.glucose=dt.open;
      else if(id==='fold-mood') uiState.mood=dt.open;
      else if(id==='fold-moodmore') uiState.moodMore=dt.open;
      else if(id==='fold-extra') uiState.extra=dt.open;
    });
  });
}

function bindToday(el,d,t){
  var today=todayStr(), future=(t>today);
  function flushDraft(){
    collectFields(el,d);
    d.draftSavedAt=hhmm(new Date());
    var ok=save();
    updateSaveLine(el,t);
    return ok;
  }
  function updateSaveLine(el,t){
    var node=$('#save-status',el); if(!node) return;
    var dd=getDay(t), sub=isSubmitted(dd);
    node.textContent=saveStatusText(dd,sub,t,t===todayStr());
    node.className='save-status '+saveStateClass(dd,sub,t,t===todayStr());
  }

  /* 日期切换 */
  var prev=$('#nav-prev',el), next=$('#nav-next',el), back=$('#nav-back-today',el);
  if(prev) prev.addEventListener('click',function(){ viewDate=addDays(viewDate,-1); editing=false; renderToday(); window.scrollTo(0,0); });
  if(next) next.addEventListener('click',function(){ viewDate=addDays(viewDate,1); editing=false; renderToday(); window.scrollTo(0,0); });
  if(back) back.addEventListener('click',function(){ viewDate=todayStr(); editing=false; renderToday(); window.scrollTo(0,0); });

  /* 就诊提醒横幅 */
  var vc=$('#btn-view-care',el);
  if(vc) vc.addEventListener('click',function(){
    var tab=$$('.tab').filter(function(b){ return b.getAttribute('data-tab')==='archive'; })[0];
    if(tab) tab.click();
  });
  var dc=$('#btn-dismiss-care',el);
  if(dc) dc.addEventListener('click',function(){
    DB.settings.dismissedCareAt=todayStr(); save(); renderToday();
  });

  if(future) return;   // 未来日期只读查看

  /* 进入可编辑状态后才真正落库，避免浏览日期就产生空记录 */
  d = ensureDay(t);

  /* 模式切换：只改显示，不写业务数据 */
  $$('[data-mode]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var m=b.getAttribute('data-mode');
      if(m==='standard') delete d.mode; else d.mode=m;
      save(); renderToday();
    });
  });

  /* 情绪状态（可选） */
  $$('[data-mood]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var m=b.getAttribute('data-mood');
      d.mood = (d.mood===m) ? '' : m;   /* 再点一次取消 */
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });

  /* 三态勾选 */
  $$('[data-tri]',el).forEach(function(box){
    box.addEventListener('click',function(){
      collectFields(el,d);
      var k=box.getAttribute('data-tri');
      var cur=triOf(d,k);
      if(d.skipped && d.skipped[k]) delete d.skipped[k];
      if(cur==='unknown') d[k]=true; else if(cur==='yes') d[k]=false; else delete d[k];
      if(d[k]===undefined){ delete d[k]; }
      save(); renderToday();
    });
  });
  /* 今日跳过 */
  $$('[data-skip]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var k=b.getAttribute('data-skip');
      d.skipped=d.skipped||{};
      if(d.skipped[k]) delete d.skipped[k]; else { d.skipped[k]=true; delete d[k]; }
      save(); renderToday();
    });
  });

  /* 快捷累加 */
  $$('[data-add]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var kind=b.getAttribute('data-add'), val=parseFloat(b.getAttribute('data-val'));
      undoStack[t]=undoStack[t]||{water:[],walk:[]};
      if(kind==='water'){ d.waterMl=String((num(d.waterMl)||0)+val); undoStack[t].water.push(val); }
      else { d.walkMin=String((num(d.walkMin)||0)+val); undoStack[t].walk.push(val); }
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });
  ['water','walk'].forEach(function(kind){
    var u=$('#undo-'+kind,el);
    if(!u) return;
    u.addEventListener('click',function(){
      collectFields(el,d);
      var stack=(undoStack[t]&&undoStack[t][kind])||[];
      if(!stack.length) return;
      var val=stack.pop();
      if(kind==='water') d.waterMl=String(Math.max(0,(num(d.waterMl)||0)-val));
      else d.walkMin=String(Math.max(0,(num(d.walkMin)||0)-val));
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });

  /* 数值输入：自动存草稿 */
  var timer=null;
  $$('#q-walkMin,#q-sleepH,#q-waterMl,#f-wake,#f-weight,#f-waist,#f-stress,#f-oneLine,#f-did,#f-tomorrow,#f-note',el)
  .forEach(function(f){
    f.addEventListener('input',function(){
      var node=$('#save-status',el); if(node){ node.textContent='正在保存……'; node.className='save-status'; }
      clearTimeout(timer);
      timer=setTimeout(function(){
        if(flushDraft()) syncNumStates(el,d);
      },600);
    });
  });

  var addG=$('#btn-add-glucose',el);
  if(addG) addG.addEventListener('click',function(){
    var v=$('#g-value',el).value.trim();
    if(!v){ toast('请填写血糖数值'); return; }
    collectFields(el,d);
    var dd=ensureDay(t), timing=$('#g-timing',el).value;
    /* 覆盖逻辑：同天同 timing 的只保留最新一条，不是追加 */
    dd.glucose = (dd.glucose||[]).filter(function(g){ return g.timing!==timing; });
    dd.glucose.push({
      value:v, timing:timing,
      method:$('#g-method',el).value.trim(), meds:$('#g-meds',el).value.trim()
    });
    save(); renderToday(); toast('已更新 · 覆盖了今日 '+timing+' 记录');
  });

  var btnDraft=$('#btn-draft',el);
  if(btnDraft) btnDraft.addEventListener('click',function(){
    if(flushDraft()) toast('草稿已保存 · '+d.draftSavedAt);
    else toast('保存失败，请重试');
  });

  var btnSubmit=$('#btn-submit',el);
  if(btnSubmit) btnSubmit.addEventListener('click',function(){
    collectFields(el,d);
    var now=new Date();
    d.done=true;
    d.submitTime=pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+hhmm(now);
    d.draftSavedAt=hhmm(now);
    editing=false;
    if(!save()){ updateSaveLine(el,t); toast('保存失败，请重试'); return; }
    renderAll();
    toast(isToday(t)?'已提交打卡数据 ✓':'已保存 ✓');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  var btnEdit=$('#btn-edit',el);
  if(btnEdit) btnEdit.addEventListener('click',function(){
    editing=true; renderToday();
    var c=el.querySelector('.mode-switch');
    if(c) c.scrollIntoView({behavior:'smooth',block:'start'});
  });

  /* 备份提示关闭 */
  $$('[data-dismiss-backup]',el).forEach(function(b){
    b.addEventListener('click',function(){
      DB.settings.dismissedBackup=DB.settings.dismissedBackup||[];
      var w=b.getAttribute('data-dismiss-backup');
      if(DB.settings.dismissedBackup.indexOf(w)<0) DB.settings.dismissedBackup.push(w);
      save(); renderToday();
    });
  });
}
function isToday(t){ return t===todayStr(); }
/* 轻量同步数值状态与汇总，避免重绘打断输入 */
function syncNumStates(el,d){
  $$('.num-row',el).forEach(function(row){
    var inp=$('input',row), node=$('.num-state',row);
    if(!inp || !node) return;
    var v=inp.value, unit=(row.querySelector('.unit')||{}).textContent||'';
    node.textContent = hasNum(v) ? ('已记录 '+v+' '+unit) : '未记录';
    node.className = 'num-state'+(hasNum(v)?' ok':'');
  });
  var sum=$('#num-summary',el);
  if(sum) sum.innerHTML=numSummary(d);
}

/* ============ 计划页 ============ */
function renderPlan(){
  var el=$('#page-plan');
  var t=todayStr(), todayIdx=dayIndex(t);
  var html='<div class="notice" style="margin-bottom:12px">周期：<b>'+CYCLE+'</b>（共 30 天）。漏掉的任务不用补做；当天已经做过但忘记记录的，可以补记。<br><b>点击任意一天可查看；未来日期可查看但不能提交。</b></div>';
  var lastWeek=0;
  for(var i=0;i<TOTAL;i++){
    var week=weekOfIdx(i+1);
    if(week!==lastWeek){
      var rg=weekRange(week);
      html += '<div class="week-sep">第 '+week+' 周（'+dateLabel(rg[0])+'–'+dateLabel(rg[1])+'）</div>';
      lastWeek=week;
    }
    var dateStr=addDays(START,i);
    var p=PLAN[i];
    var rec=DB.days[dateStr];
    var state = dateStr>t ? '未开始' : (isSubmitted(rec)?'已打卡' : (dayHasContent(rec)?'已有草稿':'待记录'));
    var cls='plan-item'+(isSubmitted(rec)?' done':'')+((i+1)===todayIdx?' today':'')+(p.review?' review':'')+' editable';
    html += '<div class="'+cls+'" data-goto-date="'+dateStr+'"><div class="d">'+(i+1)+'</div><div class="info">'
      + '<div class="focus">'+esc(p.focus)+'</div>'
      + '<div class="meta">'+dateLabel(dateStr)+' · <span class="walk">步行：'+esc(p.walk)+'</span>'
      + (p.weigh?' · ⚖️称重／腰围':'') + (p.review?' · 📋复盘':'')
      + '</div>'
      + '<div class="plan-state"><span class="chip-state s-'+stateCls(state)+'">'+state+'</span>'
      + (isSubmitted(rec)&&rec.submitTime?'<span class="chip-time">保存于 '+esc(rec.submitTime)+'</span>':'')
      + '</div>'
      + '</div></div>';
  }
  el.innerHTML=html;
  $$('[data-goto-date]',el).forEach(function(item){
    item.addEventListener('click',function(){
      viewDate=item.getAttribute('data-goto-date');
      editing=false;
      document.querySelector('.tab[data-tab="today"]').click();
    });
  });
}
function stateCls(s){
  return s==='已打卡'?'done':(s==='已有草稿'?'draft':(s==='未开始'?'future':'todo'));
}

/* ============ 趋势页 ============ */
function renderTrend(){
  var el=$('#page-trend');
  var t=todayStr();
  var dates=Object.keys(DB.days).filter(function(ds){ var i=dayIndex(ds); return i>=1&&i<=TOTAL; }).sort();

  var walkSum=0,walkN=0,sleepSum=0,sleepN=0,waterN=0,waterSum=0;
  var weights=[],waists=[];
  var gSeries={};
  G_TIMINGS.forEach(function(x){ gSeries[x]=[]; });

  dates.forEach(function(ds){
    var d=DB.days[ds];
    if(hasNum(d.walkMin)){ walkSum+=num(d.walkMin); walkN++; }
    if(hasNum(d.sleepH)){ sleepSum+=num(d.sleepH); sleepN++; }
    if(hasNum(d.waterMl)){ waterSum+=num(d.waterMl); waterN++; }
    if(hasNum(d.weight)) weights.push({x:ds,y:num(d.weight)});
    if(hasNum(d.waist)) waists.push({x:ds,y:num(d.waist)});
    (d.glucose||[]).forEach(function(g){
      var v=num(g.value); if(v==null) return;
      var tm = G_TIMINGS.indexOf(g.timing)>=0 ? g.timing : '随机';
      gSeries[tm].push({x:ds,y:v,method:g.method||''});
    });
  });
  /* 血糖：合并事件来源（体检/化验复查，走 events 而非打卡页） */
  DB.events.forEach(function(ev){
    if(!hasNum(ev.value)) return;
    var desc = ev.description||'';
    var u = String(ev.valueUnit||'').replace(/\s/g,'').toLowerCase();
    /* 糖化血红蛋白单独识别：单位 %、描述含"糖化" */
    if(/糖化/i.test(desc) && u==='%'){
      var v2=num(ev.value); if(v2==null) return;
      gSeries['糖化血红蛋白'].push({x:ev.date,y:v2,method:(ev.source==='体检报告'?'体检':'化验')});
      return;
    }
    /* mmol/L 血糖事件：合并进趋势 */
    if(!/血糖/.test(desc)) return;
    if(u!=='mmol/l') return;
    var v=num(ev.value); if(v==null) return;
    var tm;
    if(/空腹/.test(desc)) tm='空腹';
    else if(/餐后2小时|餐后2h|餐后两小时/.test(desc)) tm='餐后2小时';
    else tm='随机';
    gSeries[tm].push({x:ev.date,y:v,method:(ev.source==='体检报告'?'体检':'化验')});
  });

  var lastW = weights.length ? weights[weights.length-1].y : null;
  var bw = num(DB.baseline.weight.value);
  var wDelta = (lastW!=null && bw!=null) ? (lastW - bw) : null;

  var html='';
  html += '<div class="stat-grid">'
    + statCell(weekSubmittedDays(currentWeek()),'本周已打卡 天','第 '+currentWeek()+' 周')
    + statCell(submittedDates().length,'累计已打卡 天','提交记录的唯一天数')
    + statCell(modeFullDays(),'当日模式目标完成天','见下方统计口径')
    + statCell(walkN?Math.round(walkSum/walkN):'记录积累中','日均步行 分钟',walkN?('基于 '+walkN+' 天记录'):'暂无记录')
    + statCell(sleepN?(sleepSum/sleepN).toFixed(1):'记录积累中','日均睡眠 小时',sleepN?('基于 '+sleepN+' 天记录'):'暂无记录')
    + statCell(waterN?Math.round(waterSum/waterN):'记录积累中','日均饮水 毫升',waterN?('基于 '+waterN+' 天记录'):'暂无记录')
    + statCell(streak(),'连续打卡 天','次要指标')
    + statCell(wDelta!=null?((wDelta>0?'+':'')+wDelta.toFixed(1)):'记录积累中','较基线体重 kg',(wDelta!=null&&bw!=null)?('基线 '+bw+' kg'):'待称重')
    + '</div>';

  html += '<div class="notice" style="margin-bottom:12px">统计口径：<b>「已打卡」只表示提交了记录，不等于全部行动完成。</b>'
    + '数字类项目（步行／睡眠／饮水）以实际数值计入，不自动判断达标；未记录的项目不按 0 计算。'
    + '标准版与极简版分别统计，不混用同一个完成率。'
    + '「当日模式目标完成天」= 当天所选模式的各项都达到完成或已记录的天数。</div>';

  /* 体重 */
  html += '<div class="card"><div class="card-title">体重趋势 <span class="sub">只统计每日记录，基线单独列出</span></div>';
  if(weights.length<2){ html += '<div class="empty">记录积累中：至少两次每日称重后显示趋势</div>'; }
  else { html += '<canvas class="chart" id="ch-weight"></canvas>'; }
  html += '<div class="chart-note">基线 '+esc(DB.baseline.weight.value||'—')+' kg · '+esc(baseMeta(DB.baseline.weight))+'（基线不计入趋势样本）</div></div>';

  /* 血糖 */
  html += '<div class="card"><div class="card-title">空腹血糖趋势</div>';
  if((gSeries['空腹']||[]).length<1){ html += '<div class="empty">记录积累中：添加空腹血糖记录后显示趋势（家用血糖仪每天早上测的就是空腹血糖）</div>'; }
  else {
    var fasting=(gSeries['空腹']||[]).slice().sort(function(a,b){ return a.x<b.x?-1:a.x>b.x?1:0; });
    html += '<canvas class="chart" id="ch-glucose"></canvas>';
    html += '<div class="legend"><span><i style="background:'+G_COLORS['空腹']+'"></i>空腹血糖（'+fasting.length+' 次）</span></div>';
    html += '<div class="chart-note">家用血糖仪每天早上测的就是空腹血糖。参考目标（2型糖尿病控制目标，仅供参考，具体遵医嘱）：4.4～7.0 mmol/L。糖化血红蛋白、体检复查等详细数据请在健康档案查看。</div>';
  }
  html += '</div>';

  /* 每周执行情况 */
  var curW = currentWeek();
  html += '<div class="card"><div class="card-title">每周执行情况 <span class="sub">只展开当前第 '+curW+' 周，点击标题展开其他周</span></div>';
  for(var w=1;w<=5;w++){
    html += weekBlock(w, w===curW);
  }
  html += '<div class="chart-note">颜色：深绿=已打卡，浅绿=已有草稿，灰=未记录。</div></div>';

  /* 腰围 */
  if(waists.length>0){
    html += '<div class="card"><div class="card-title">腰围记录</div>';
    waists.forEach(function(r){ html += '<div class="glucose-item"><span class="val">'+r.y+' cm</span><span class="tag">'+dateLabel(r.x)+'</span></div>'; });
    html += '<div class="chart-note">基线 '+esc(DB.baseline.waist.value||'—')+' cm · '+esc(baseMeta(DB.baseline.waist))+'</div></div>';
  }

  html += '<div class="notice">30天看三件事：<b>习惯能否坚持、精神睡眠是否改善、体重血糖趋势如何</b>——不要求每天数字都下降。数据不足时显示「记录积累中」，不自动生成健康结论。</div>';

  el.innerHTML=html;

  if($('#ch-weight',el)) drawLine($('#ch-weight',el),[ {points:weights,color:'#2f7d5b'} ],'kg',
    (bw!=null?[{ y:bw*0.95, color:'#d97706', label:'减重5%目标' }]:[]));
  if($('#ch-glucose',el)){
    var fastingPoints=(gSeries['空腹']||[]).slice().sort(function(a,b){ return a.x<b.x?-1:a.x>b.x?1:0; });
    var series=[{points:fastingPoints, color:G_COLORS['空腹']}];
    drawLine($('#ch-glucose',el),series,'mmol/L');
  }
  bindWeeks(el);
}
function baseMeta(o){
  var src=o.source?o.source:'待补充';
  var dt=o.date?o.date:'测量日期待确认';
  return src+' · '+dt;
}
function statCell(v,k,sub,warn){
  return '<div class="stat-cell"><div class="v'+(warn?' warn':'')+'">'+v+'</div><div class="k">'+esc(k)+'</div>'
    + (sub?'<div class="k2">'+esc(sub)+'</div>':'')+'</div>';
}
function weekBlock(w, open){
  var rg=weekRange(w);
  var days=[];
  for(var i=(w-1)*7;i<Math.min(w*7,TOTAL);i++){
    var ds=addDays(START,i), rec=DB.days[ds];
    days.push({ds:ds,rec:rec,idx:i+1});
  }
  var recorded=days.filter(function(x){ return dayHasContent(x.rec); });
  var submitted=days.filter(function(x){ return isSubmitted(x.rec); });
  var std=recorded.filter(function(x){ return (x.rec.mode||'standard')==='standard'; });
  var busy=recorded.filter(function(x){ return x.rec.mode==='busy'; });
  var walkSum=0,walkN=0,sleepSum=0,sleepN=0;
  recorded.forEach(function(x){
    if(hasNum(x.rec.walkMin)){ walkSum+=num(x.rec.walkMin); walkN++; }
    if(hasNum(x.rec.sleepH)){ sleepSum+=num(x.rec.sleepH); sleepN++; }
  });

  var summary = '<div class="week-head"><b>第 '+w+' 周</b> <span>'+dateLabel(rg[0])+'–'+dateLabel(rg[1])+'</span>'
    + '<span class="week-sub">'+recorded.length+'/'+days.length+' 已记录 · '+submitted.length+' 已打卡</span></div>';
  var html = '<details class="week-block"'+(open?' open':'')+'><summary>'+summary+'</summary>';
  html += '<div class="week-days">';
  days.forEach(function(x){
    var st = isSubmitted(x.rec)?'done':(dayHasContent(x.rec)?'draft':'empty');
    var lb = x.idx + '｜' + dateLabel(x.ds);
    var tip = st==='done'?'已打卡':(st==='draft'?'已有草稿':'未记录');
    html += '<div class="wday '+st+'" title="'+lb+'：'+tip+'"><span>'+(x.idx)+'</span><i>'+dateLabel(x.ds)+'</i></div>';
  });
  html += '</div>';
  html += '<div class="week-metrics">'
    + '<div class="wm"><b>'+recorded.length+'/'+days.length+'</b><span>记录天数</span></div>'
    + '<div class="wm"><b>'+submitted.length+'</b><span>已打卡天数</span></div>'
    + '<div class="wm"><b>'+std.length+' / '+busy.length+'</b><span>标准版 / 极简版</span></div>'
    + '</div>';
  html += '<div class="week-metrics">'
    + '<div class="wm"><b>'+(walkN?(walkSum)+' 分钟':'—')+'</b><span>步行总时长'+(walkN?(' · 基于 '+walkN+' 天'):'')+'</span></div>'
    + '<div class="wm"><b>'+(sleepN?(sleepSum/sleepN).toFixed(1)+' 小时':'—')+'</b><span>已记录日平均睡眠'+(sleepN?(' · 基于 '+sleepN+' 天'):'')+'</span></div>'
    + '</div>';

  html += '<div class="mode-cols">';
  html += modeStatCol('标准版',std,STD_KEYS);
  html += modeStatCol('极简版',busy,BUSY_KEYS);
  html += '</div>';

  html += '<div class="field week-adjust"><label>下周调整（一句话）</label>'
    + '<input type="text" data-week-adjust="'+w+'" value="'+esc((DB.weeks[w]&&DB.weeks[w].adjust)||'')+'" placeholder="例如：把晚饭后的步行固定成 15 分钟">'
    + '</div>';
  html += '</details>';
  return html;
}
function modeStatCol(title,list,keys){
  var html='<div class="mode-col"><div class="mode-col-title">'+title+' <span>'+list.length+' 天</span></div>';
  if(list.length===0){ html += '<div class="mode-empty">该周没有'+title+'记录</div></div>'; return html; }
  keys.forEach(function(k){
    var it=ITEM_MAP[k]||{name:k==='sleepRest'?'按时休息':'—',type:'tri'};
    var counts={yes:0,no:0,unknown:0,skip:0,rec:0};
    var sum=0,n=0;
    list.forEach(function(x){
      var d=x.rec;
      if(d.skipped && d.skipped[k]){ counts.skip++; return; }
      if(it.type==='num'){
        if(hasNum(d[k])){ counts.rec++; n++; sum+=num(d[k]); }
        else counts.unknown++;
      } else {
        var s=triOf(d,k);
        if(s==='yes') counts.yes++; else if(s==='no') counts.no++; else counts.unknown++;
      }
    });
    var label=it.name;
    var detail='';
    if(it.type==='num'){
      detail = '已记录 '+counts.rec+' 天'+(n>1?(' · 平均 '+(sum/n).toFixed(1)+' '+it.unit):(n===1?(' · 共 '+sum+' '+it.unit):''))
        + (counts.unknown?' · 未记录 '+counts.unknown+' 天':'');
      html += '<div class="ms-row"><span class="ms-name">'+esc(label)+'</span><span class="ms-val num">'+detail+'</span></div>';
    } else {
      var parts=[];
      if(counts.yes) parts.push('完成 '+counts.yes);
      if(counts.no) parts.push('未完成 '+counts.no);
      if(counts.unknown) parts.push('未记录 '+counts.unknown);
      if(counts.skip) parts.push('跳过 '+counts.skip);
      html += '<div class="ms-row"><span class="ms-name">'+esc(label)+'</span><span class="ms-val">'+(parts.join(' · ')||'—')+'</span></div>';
    }
  });
  html += '</div>';
  return html;
}
function bindWeeks(el){
  $$('[data-week-adjust]',el).forEach(function(f){
    f.addEventListener('change',function(){
      var w=f.getAttribute('data-week-adjust');
      DB.weeks[w]=DB.weeks[w]||{};
      DB.weeks[w].adjust=f.value;
      save(); toast('已保存下周调整');
    });
  });
}

/* 简易折线图（多序列） */
function drawLine(canvas, series, unit, hLines){
  var dpr=window.devicePixelRatio||1;
  var W=canvas.clientWidth, H=180;
  canvas.width=W*dpr; canvas.height=H*dpr;
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  var padL=40,padR=14,padT=14,padB=26;
  var all=[];
  series.forEach(function(s){ all=all.concat(s.points.map(function(p){return p.y;})); });
  if(!all.length) return;
  var min=Math.min.apply(null,all), max=Math.max.apply(null,all);
  if(Math.abs(max-min)<0.001){ max+=1; min-=1; }
  var span=max-min; min-=span*0.12; max+=span*0.12;
  var xs=[];
  series.forEach(function(s){ s.points.forEach(function(p){ if(xs.indexOf(p.x)<0) xs.push(p.x); }); });
  xs.sort();
  var n=xs.length;
  function X(i){ return n===1 ? padL+(W-padL-padR)/2 : padL+(W-padL-padR)*i/(n-1); }
  function Y(v){ return padT+(H-padT-padB)*(1-(v-min)/(max-min)); }
  ctx.strokeStyle='#eef0f2'; ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.lineWidth=1;
  for(var g=0;g<=3;g++){
    var v=min+(max-min)*g/3, y=Y(v);
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillText(v.toFixed(1),4,y+3);
  }
  /* 目标参考线（虚线，只在范围内绘制） */
  (hLines||[]).forEach(function(hl){
    if(hl==null || hl.y==null || isNaN(hl.y)) return;
    if(hl.y<min || hl.y>max) return;
    var y=Y(hl.y);
    ctx.save();
    ctx.strokeStyle=hl.color||'#d97706'; ctx.setLineDash([5,4]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=hl.color||'#d97706'; ctx.font='9px sans-serif'; ctx.textAlign='right';
    ctx.fillText(hl.label||'', W-padR-2, y-3);
    ctx.restore();
  });
  series.forEach(function(s){
    if(!s.points.length) return;
    /* 兜底：按日期排序，避免 events 合并乱序导致折线跳跃 */
    s.points = s.points.slice().sort(function(a,b){ return a.x<b.x?-1:a.x>b.x?1:0; });
    ctx.strokeStyle=s.color; ctx.lineWidth=2; ctx.beginPath();
    s.points.forEach(function(p,i){
      var xi=X(xs.indexOf(p.x)), yi=Y(p.y);
      if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi);
    });
    ctx.stroke();
    ctx.fillStyle=s.color;
    s.points.forEach(function(p){
      var xi=X(xs.indexOf(p.x)), yi=Y(p.y);
      ctx.beginPath(); ctx.arc(xi,yi,3,0,Math.PI*2); ctx.fill();
    });
    var last=s.points[s.points.length-1];
    ctx.font='10px sans-serif';
    ctx.fillText(last.y, Math.min(X(xs.indexOf(last.x))+6, W-32), Y(last.y)-4);
  });
  ctx.fillStyle='#9ca3af'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  var step=Math.max(1,Math.ceil(n/6));
  for(var i=0;i<n;i+=step){ ctx.fillText(dateLabel(xs[i]), X(i), H-8); }
  ctx.textAlign='left';
}

/* ============ 设置页 ============ */
function renderSetting(){
  var el=$('#page-setting');
  var b=DB.baseline;
  var html='';

  html += '<div class="card"><div class="card-title">基线信息 <span class="sub">与每日记录分开，不重复计入趋势样本</span></div>';
  html += baseBlock('weight','体重','kg','89.5','s-weight');
  html += baseBlock('glucose','空腹血糖','mmol/L','7.0','s-glucose');
  html += baseBlock('waist','腰围','cm','98','s-waist');
  /* 中医体质（v4 新增） */
  html += '<div class="base-block"><div class="base-name">中医体质（测评）</div>'
    + '<div class="field-row">'
    + '<div class="field"><label>体质结论</label><input type="text" id="s-const-val" value="'+esc(b.constitution.value)+'" placeholder="例如：气虚质为主，兼夹气郁质"></div>'
    + '<div class="field"><label>测评日期</label><input type="date" id="s-const-date" value="'+esc(b.constitution.date||'')+'"></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><label>来源</label><input type="text" id="s-const-src" value="'+esc(b.constitution.source)+'" placeholder="如：体检机构中医测评"></div>'
    + '<div class="field"><label>复评间隔（月）</label><input type="number" min="1" max="24" id="s-const-months" value="'+(b.constitution.reviewMonths||3)+'" placeholder="3"></div>'
    + '</div>'
    + '<div class="field"><label>备注（可选）</label><input type="text" id="s-const-note" value="'+esc(b.constitution.note)+'" placeholder="例如：气虚质宜柔缓运动"></div>'
    + '<div class="base-cur">当前：'+esc(b.constitution.value||'—')
    + (b.constitution.value && b.constitution.date?' · 下次复评约 '+constReviewDue(b.constitution):'')+'</div></div>';
  html += '<div class="field-row">'
    + '<div class="field"><label>目标起床时间</label><input type="time" id="s-wake" value="'+esc(b.wakeTime)+'"></div>'
    + '<div class="field"><label>目标上床时间</label><input type="time" id="s-bed" value="'+esc(b.bedTime)+'"></div>'
    + '</div>'
    + '<div class="chart-note" style="text-align:left">目标时间只是参考，不会自动填成某一天的实际起床时间。</div>'
    + '<button class="btn secondary small" id="btn-save-base">保存基线</button></div>';

  html += '<div class="card"><div class="card-title">数据管理 <span class="sub">最近备份：'+esc(DB.settings.lastExportAt||'尚未备份')+'</span></div>'
    + '<div class="setting-row"><div>导出 JSON<div class="desc">完整保存每日记录、基线与设置</div></div><button class="btn ghost small" id="btn-exp-json">导出</button></div>'
    + '<div class="setting-row"><div>导出 CSV<div class="desc">表头标明字段与单位，可用 Excel 打开</div></div><button class="btn ghost small" id="btn-exp-csv">导出</button></div>'
    + '<div class="setting-row"><div>导入备份<div class="desc">导入前会显示备份信息，可选择合并或替换</div></div><button class="btn ghost small" id="btn-import">导入</button></div>'
    + '<input type="file" id="file-import" accept=".json" style="display:none">'
    + '<div class="setting-row"><div>粘贴导入<div class="desc">手机不便选文件时，把补录包文本粘贴进来</div></div><button class="btn ghost small" id="btn-import-paste">粘贴</button></div>'
    + '<div class="setting-row"><div>清空全部数据<div class="desc">不可恢复，需要二次确认，请先导出备份</div></div><button class="btn danger small" id="btn-clear">清空</button></div>'
    + '</div>';

  /* 食谱参考（P2）：来自体检报告营养方案的通用整理，供参考 */
  var RECIPE_ROWS = [
    ['一','燕麦牛奶粥＋鸡蛋','杂粮饭＋清蒸鲈鱼＋西兰花','小米南瓜粥＋凉拌菠菜＋少量牛肉','人参红枣茶'],
    ['二','全麦面包＋鸡蛋＋黄瓜','糙米饭＋白灼虾＋炒油菜','山药粥＋清炒莴笋＋豆腐','黄芪太子参茶'],
    ['三','无糖豆浆＋蒸蛋羹＋全麦馒头','二米饭＋香菇蒸鸡＋冬瓜汤','燕麦粥＋清蒸鳕鱼＋拌木耳','红枣茶（血糖高者慎加桂圆）'],
    ['四','燕麦牛奶＋水煮蛋','荞麦面＋瘦肉＋青菜','小米粥＋少量卤牛肉＋清炒时蔬','党参黄芪茶'],
    ['五','全麦三明治＋牛奶','糙米饭＋清蒸鱼＋芦笋','无糖八宝粥＋白灼菜心＋鸡蛋','枸杞黄芪茶'],
    ['六','燕麦粥＋鸡蛋＋黄瓜','杂粮饭＋白切鸡（去皮）＋菠菜','山药瘦肉汤＋青菜','人参红枣茶'],
    ['日','无糖酸奶＋全麦面包＋鸡蛋','糙米饭＋清蒸虾＋西兰花','小米粥＋豆腐＋拌莴笋','黄芪红枣茶']
  ];
  html += '<details class="fold card"><summary>食谱参考 <span class="fold-sub">气虚质 · 示例，不替代营养科方案</span></summary>'
    + '<div class="chart-note" style="text-align:left;margin:2px 0 8px">整理自体检报告营养调理部分，供参考。茶饮含药食同源成分，<b>肝功能异常期间请先咨询医生</b>再决定是否饮用。含糖食材已尽量避开或标注，血糖管理期间控糖优先。</div>'
    + '<table class="recipe-table"><thead><tr><th></th><th>早餐</th><th>午餐</th><th>晚餐</th><th>当日茶饮</th></tr></thead><tbody>'
    + RECIPE_ROWS.map(function(r){
        return '<tr><td>'+r[0]+'</td>'
          + '<td data-label="早餐">'+r[1]+'</td>'
          + '<td data-label="午餐">'+r[2]+'</td>'
          + '<td data-label="晚餐">'+r[3]+'</td>'
          + '<td data-label="当日茶饮">'+r[4]+'</td></tr>';
      }).join('')
    + '</tbody></table>'
    + '<div class="chart-note" style="text-align:left;margin-top:8px">气虚质宜食（补气为主）：粮食类如粳米、小米、糯米、燕麦；蔬菜如山药、南瓜、胡萝卜、香菇；肉禽如牛肉、鸡肉、鲫鱼；豆类如豆腐、黄豆。不宜生冷苦寒、辛辣刺激。份量按每日约1300～1400千卡把握，具体以营养科方案为准。</div>'
    + '</details>';

  html += '<div class="card"><div class="card-title">说明</div>'
    + '<div class="tip-body" style="font-size:.82rem;color:var(--text-2);line-height:1.8">'
    + '· 计划周期：'+CYCLE+'<br>'
    + '· 数据仅保存在本机浏览器，换设备前请先导出备份<br>'
    + '· 空值代表「未记录」，不会被当成 0 或未完成<br>'
    + '· 「已打卡」只表示提交了记录，不等于全部行动完成<br>'
    + '· 饮水量服从医生对心肾功能及限水的要求<br>'
    + '· 血糖检测频次按医生要求，不因一次读数自行调药<br>'
    + '· 土豆、玉米、山药算主食；正常吃奶制品豆制品，不自行戒钙<br>'
    + '· 穴位按揉仅作辅助放松，不作为治疗手段<br>'
    + '· 漏掉的任务不用补做；当天已经做过但忘记记录的，可以补记'
    + '</div></div>';

  html += '<div class="notice red">如出现黄疸、持续腹痛、腰痛伴发热或尿量显著减少，请及时就医。用药和复查安排以医嘱为准。</div>';

  el.innerHTML=html;

  $('#btn-save-base',el).addEventListener('click',function(){
    ['weight','glucose','waist'].forEach(function(k){
      var o=b[k];
      var v=$('#s-'+k+'-val',el).value; if(v!==null) o.value=v;
      var dt=$('#s-'+k+'-date',el).value; o.date= dt||null;
      o.source=$('#s-'+k+'-src',el).value;
      o.note=$('#s-'+k+'-note',el).value;
    });
    b.wakeTime=$('#s-wake',el).value;
    b.bedTime=$('#s-bed',el).value;
    b.constitution={ value:$('#s-const-val',el).value, date:$('#s-const-date',el).value||null,
      source:$('#s-const-src',el).value, note:$('#s-const-note',el).value,
      reviewMonths: Math.max(1, +$('#s-const-months',el).value || 3) };
    save(); renderTrend(); renderToday(); toast('基线已保存');
  });

  $('#btn-exp-json',el).addEventListener('click',function(){
    DB.settings.lastExportAt=new Date().toLocaleString('zh-CN');
    save();
    var payload=JSON.parse(JSON.stringify(DB));
    payload.exportedAt=new Date().toISOString();
    payload.app='health30';
    download('health30-backup-'+todayStr()+'.json', JSON.stringify(payload,null,2),'application/json');
    renderSetting(); toast('已导出备份');
  });
  $('#btn-exp-csv',el).addEventListener('click',function(){
    DB.settings.lastExportAt=new Date().toLocaleString('zh-CN');
    save();
    download('health30-'+todayStr()+'.csv', toCSV(), 'text/csv;charset=utf-8');
    renderSetting(); toast('已导出 CSV');
  });
  $('#btn-import',el).addEventListener('click',function(){ $('#file-import',el).click(); });
  $('#file-import',el).addEventListener('change',function(e){
    var f=e.target.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){
      var obj=null;
      try{ obj=JSON.parse(rd.result); }catch(err){ obj=null; }
      if(!obj || typeof obj!=='object' || !obj.days || !obj.baseline){
        toast('文件格式不正确，原有数据已保留'); e.target.value=''; return;
      }
      openImportDialog(obj);
      e.target.value='';
    };
    rd.onerror=function(){ toast('读取失败，原有数据已保留'); };
    rd.readAsText(f);
  });
  $('#btn-import-paste',el).addEventListener('click',function(){
    showModal({
      title:'粘贴导入',
      body:'<div class="modal-note">把复制的补录包文本粘贴到下面（以 { 开头）。只补充本机没有的条目，不覆盖已有记录。</div>'
        + '<textarea id="paste-json" rows="8" style="width:100%;box-sizing:border-box;font-size:.72rem;font-family:ui-monospace,Menlo,monospace;line-height:1.4;border:1px solid var(--border);border-radius:8px;padding:8px"></textarea>',
      buttons:[
        {label:'取消',cls:'ghost',onClick:closeModal},
        {label:'解析',cls:'',onClick:function(){
          var t=($('#paste-json').value||'').trim();
          var obj=null;
          try{ obj=JSON.parse(t); }catch(err){ obj=null; }
          if(!obj || typeof obj!=='object' || !obj.days || !obj.baseline){
            toast('内容不是有效的补录包'); return;
          }
          closeModal();
          openImportDialog(obj);
        }}
      ]
    });
  });
  $('#btn-clear',el).addEventListener('click',function(){
    openClearDialog();
  });
}
function baseBlock(key,name,unit,ph,id){
  var o=DB.baseline[key];
  return '<div class="base-block"><div class="base-name">'+esc(name)+'</div>'
    + '<div class="field-row">'
    + '<div class="field input-suffix"><label>数值</label><input type="number" step="0.1" id="'+id+'-val" value="'+esc(o.value)+'" placeholder="'+esc(ph)+'"><span class="suffix">'+esc(unit)+'</span></div>'
    + '<div class="field"><label>实际测量日期</label><input type="date" id="'+id+'-date" value="'+esc(o.date||'')+'"></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><label>来源／测量方式</label><input type="text" id="'+id+'-src" value="'+esc(o.source)+'" placeholder="如：体检报告 / 家用血糖仪"></div>'
    + '<div class="field"><label>备注（可选）</label><input type="text" id="'+id+'-note" value="'+esc(o.note)+'" placeholder="可留空"></div>'
    + '</div>'
    + '<div class="base-cur">当前：'+esc(o.value||'—')+' '+esc(unit)+' · '+esc(baseMeta(o))+'</div>'
    + '</div>';
}

/* 导入对话框 */
/* ===== 健康档案合并 =====
 * 用于体检报告补录包、他人档案备份的合并：
 * - 按内容去重，重复导入不会产生重复条目
 * - 外部 ID 与本地冲突时重新编号，并同步 issueIds / monitorIds 引用
 */
function maxId(arr){ var m=0; (arr||[]).forEach(function(o){ if(o && +o.id>m) m=+o.id; }); return m; }
/* 同一份化验单可能被重复导入，日期相差 1 天以内视为同一次检查 */
function nearDate(a,b){
  if(!a || !b) return false;
  var da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00');
  if(isNaN(da)||isNaN(db)) return a===b;
  return Math.abs(da-db) <= 86400000;
}
function mergeArchive(incoming){
  var stat = { issues:0, monitors:0, events:0, reviews:0 };
  var issueMap = {}, monMap = {};

  (incoming.issues||[]).forEach(function(src){
    if(!src || !src.name) return;
    /* 问题按名称识别（同一问题多次体检仍是同一条）；已有条目只补空字段，不覆盖手工修改 */
    var dup = DB.issues.find(function(x){ return x.name===src.name; });
    if(dup){
      issueMap[src.id]=dup.id;
      ['occurDate','currentStatus','source','seekCare','cycleGoal','nextReviewDate'].forEach(function(k){
        if(!dup[k] && src[k]) dup[k]=src[k];
      });
      (src.keywords||[]).forEach(function(k){
        dup.keywords = dup.keywords||[];
        if(dup.keywords.indexOf(k)<0) dup.keywords.push(k);
      });
      return;
    }
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = maxId(DB.issues)+1;
    copy.monitorIds = [];
    copy.createdAt = copy.createdAt || new Date().toISOString();
    copy.updatedAt = copy.updatedAt || copy.createdAt;
    issueMap[src.id] = copy.id;
    DB.issues.push(copy); stat.issues++;
  });

  (incoming.monitorItems||[]).forEach(function(src){
    if(!src || !src.name) return;
    var iid = issueMap[src.issueId];
    if(iid==null && src.issueId!=null){
      var local = DB.issues.find(function(x){ return x.id===src.issueId; });
      iid = local ? local.id : null;
    }
    var dup = DB.monitorItems.find(function(x){
      return x.name===src.name && (x.issueId||null)===(iid||null);
    });
    if(dup){
      monMap[src.id]=dup.id;
      if(!dup.refRange && src.refRange) dup.refRange=src.refRange;
      if(!dup.unit && src.unit) dup.unit=src.unit;
    }
    else{
      var copy = JSON.parse(JSON.stringify(src));
      copy.id = maxId(DB.monitorItems)+1;
      copy.issueId = iid||null;
      monMap[src.id] = copy.id;
      DB.monitorItems.push(copy); stat.monitors++;
    }
    var issue = DB.issues.find(function(x){ return x.id===iid; });
    if(issue && monMap[src.id]!=null){
      issue.monitorIds = issue.monitorIds||[];
      if(issue.monitorIds.indexOf(monMap[src.id])<0) issue.monitorIds.push(monMap[src.id]);
    }
  });

  (incoming.events||[]).forEach(function(src){
    if(!src) return;
    var dup = DB.events.find(function(x){
      return nearDate(x.date, src.date) && x.type===src.type
        && (x.description||'')===(src.description||'')
        && String(x.value==null?'':x.value)===String(src.value==null?'':src.value)
        && (x.valueUnit||'')===(src.valueUnit||'');
    });
    if(dup){
      if(!dup.refRange && src.refRange) dup.refRange=src.refRange;
      /* 合并 issueIds：同一事件可能被多个问题关注（如血糖既属"空腹血糖升高"也属本期"血糖管理"），
         去重命中时不能丢弃新的关联 id。 */
      dup.issueIds = dup.issueIds || [];
      (src.issueIds||[]).forEach(function(id){
        var mapped = issueMap[id];
        if(mapped!=null && dup.issueIds.indexOf(mapped)<0) dup.issueIds.push(mapped);
      });
      return;
    }
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = maxId(DB.events)+1;
    copy.issueIds = (src.issueIds||[]).map(function(id){ return issueMap[id]; })
      .filter(function(id){ return id!=null; });
    DB.events.push(copy); stat.events++;
  });

  (incoming.reviews||[]).forEach(function(src){
    if(!src) return;
    var dup = DB.reviews.find(function(x){
      return (x.reviewDate||'')===(src.reviewDate||'') && (x.cycleId||null)===(src.cycleId||null);
    });
    if(dup) return;
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = maxId(DB.reviews)+1;
    copy.evaluations = (src.evaluations||[]).map(function(e){
      var mapped = issueMap[e.issueId];
      return Object.assign({}, e, { issueId: mapped!=null ? mapped : e.issueId });
    });
    DB.reviews.push(copy); stat.reviews++;
  });

  (incoming.cycles||[]).forEach(function(src){
    if(!src || !src.start) return;
    var exists = DB.cycles.some(function(x){
      return x.id===src.id || (x.start===src.start && x.end===src.end);
    });
    if(!exists) DB.cycles.push(JSON.parse(JSON.stringify(src)));
  });

  (incoming.trash||[]).forEach(function(t){ if(t && t.obj) DB.trash.push(t); });

  return stat;
}

function openImportDialog(obj){
  var archiveOnly = obj.archiveOnly === true;
  var dates=Object.keys(obj.days||{}).filter(function(ds){ return dayIndex(ds)>=1 && dayIndex(ds)<=TOTAL; });
  var conflicts=dates.filter(function(ds){ return dayHasContent(DB.days[ds]); });
  var backupAt = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('zh-CN') : '未标注';
  var body='<div class="modal-line"><b>备份生成时间：</b>'+esc(backupAt)+'</div>';
  if(archiveOnly){
    body += '<div class="modal-line"><b>档案补录包：</b>问题 '+((obj.issues||[]).length)+' 项 · 事件 '
      + ((obj.events||[]).length)+' 条 · 监测项 '+((obj.monitorItems||[]).length)+' 项</div>'
      + '<div class="modal-note">合并导入只补充本机没有的条目，不覆盖、不删除已有记录；重复导入同一份补录包也不会产生重复条目。</div>';
  }else{
    body += '<div class="modal-line"><b>备份内计划内记录：</b>'+dates.length+' 天</div>'
      + '<div class="modal-line"><b>与本机冲突的记录：</b>'+conflicts.length+' 天</div>'
      + '<div class="modal-note">冲突不会静默覆盖，请选择处理方式。</div>'
      + (conflicts.length? '<div class="modal-line"><label class="radio"><input type="radio" name="conflict" value="keep" checked> 冲突保留本机记录</label>'
          + '<label class="radio"><input type="radio" name="conflict" value="use"> 冲突使用备份记录</label></div>' : '');
  }
  body += '<div class="modal-note">导入失败时本地数据不会被改动。</div>';
  var btns = [{label:'取消',cls:'ghost',onClick:closeModal}];
  btns.push({label:'合并导入',cls:'secondary',onClick:function(){
    var useBackup=false;
    var r=document.querySelector('input[name="conflict"]:checked');
    if(r && r.value==='use') useBackup=true;
    doImport(obj,'merge',useBackup);
  }});
  if(!archiveOnly) btns.push({label:'替换全部',cls:'',onClick:function(){ doImport(obj,'replace',true); }});
  showModal({ title:'导入备份', body:body, buttons:btns });
}
function doImport(obj,mode,useBackup){
  try{
    var incoming=migrate(JSON.parse(JSON.stringify(obj)));
    var stat=null;
    if(mode==='replace'){
      DB=incoming;
    } else {
      Object.keys(incoming.days).forEach(function(ds){
        if(!dayHasContent(DB.days[ds]) || useBackup) DB.days[ds]=incoming.days[ds];
      });
      /* 基线：无冲突时保留本机；用户选择使用备份时同步 */
      if(useBackup) DB.baseline=incoming.baseline;
      else{
        /* 本机未记录时，用导入包补齐基线（如体检报告里的体重与中医体质），不覆盖已有记录 */
        ['weight','waist','constitution'].forEach(function(k){
          var inc=incoming.baseline && incoming.baseline[k];
          var cur=DB.baseline[k]||{};
          /* 没有任何日期，且本机没有值或值相同（如默认的 89.5）时，才采用导入包的日期与来源 */
          if(inc && inc.date && !cur.date && (!cur.value || String(cur.value)===String(inc.value))) DB.baseline[k]=inc;
        });
      }
      Object.keys(incoming.weeks||{}).forEach(function(w){ DB.weeks[w]=incoming.weeks[w]; });
      stat=mergeArchive(incoming);
    }
    DB.settings.lastImportAt=new Date().toLocaleString('zh-CN');
    if(!save()) throw new Error('save failed');
    closeModal(); renderAll();
    var extra = stat && (stat.issues||stat.events)
      ? '（新增问题 '+stat.issues+' 项、事件 '+stat.events+' 条）' : '';
    toast((mode==='replace'?'已替换导入':'已合并导入')+extra);
  }catch(e){
    closeModal(); toast('导入失败，原有数据已保留');
  }
}
function openClearDialog(){
  showModal({
    title:'清空全部数据',
    body:'<div class="modal-line">此操作不可恢复。建议先导出备份。</div>'
      + '<div class="modal-note">确认后还需要再点一次「确认清空」。</div>',
    buttons:[
      {label:'取消',cls:'ghost',onClick:closeModal},
      {label:'继续',cls:'danger',onClick:function(){
        closeModal();
        showModal({
          title:'再次确认',
          body:'<div class="modal-line">确定要清空<b>全部</b>打卡数据吗？</div>',
          buttons:[
            {label:'取消',cls:'ghost',onClick:closeModal},
            {label:'确认清空',cls:'danger',onClick:function(){
              try{ localStorage.removeItem(LS_KEY); }catch(e){}
              DB=blankDB();
              closeModal(); viewDate=todayStr(); renderAll(); toast('已清空');
            }}
          ]
        });
      }}
    ]
  });
}
function showModal(opts){
  closeModal();
  var mask=document.createElement('div');
  mask.className='modal-mask'; mask.id='modal';
  var html='<div class="modal"><div class="modal-title">'+esc(opts.title)+'</div>'
    + '<div class="modal-body">'+(opts.body||'')+'</div>'
    + '<div class="modal-btns">'+opts.buttons.map(function(b,i){
        return '<button class="btn '+b.cls+'" data-mbtn="'+i+'">'+esc(b.label)+'</button>';
      }).join('')+'</div></div>';
  mask.innerHTML=html;
  document.body.appendChild(mask);
  $$('[data-mbtn]',mask).forEach(function(btn){
    btn.addEventListener('click',function(){ opts.buttons[+btn.getAttribute('data-mbtn')].onClick(); });
  });
}
function closeModal(){ var m=$('#modal'); if(m) m.parentNode.removeChild(m); }

function download(name,content,mime){
  var blob=new Blob([content],{type:mime});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); },1000);
}
function toCSV(){
  var rows=[['日期','第几天','显示模式','是否已打卡','提交时间',
    '饮食(完成/未完成/未记录)','无酒无甜饮(完成/未完成/未记录)','不吸烟(完成/未完成/未记录)',
    '步行(分钟)','步行状态','睡眠_昨晚(小时)','睡眠状态','饮水(毫升)','饮水状态',
    '久坐中断(完成/未完成/未记录)','放松(完成/未完成/未记录)','放松是否跳过','尽量按时休息(完成/未完成/未记录)',
    '起床时间(当天实际)','体重(kg)','腰围(cm)',
    '血糖_数值(mmol/L)','血糖_时机','血糖_测量方式','血糖_用药',
    '压力(0-10)','情绪状态','一句话记录','今天我做到了','明天最重要的一件事','备注']];
  Object.keys(DB.days).sort().forEach(function(ds){
    var d=DB.days[ds];
    var gl=(d.glucose||[]);
    rows.push([ds, dayIndex(ds), (d.mode||'standard')==='busy'?'极简版':'标准版',
      isSubmitted(d)?'是':'否', d.submitTime||'',
      triText(d,'dietOk'), triText(d,'noAlcoholSweet'), triText(d,'noSmoke'),
      hasNum(d.walkMin)?num(d.walkMin):'', hasNum(d.walkMin)?'已记录':'未记录',
      hasNum(d.sleepH)?num(d.sleepH):'', hasNum(d.sleepH)?'已记录':'未记录',
      hasNum(d.waterMl)?num(d.waterMl):'', hasNum(d.waterMl)?'已记录':'未记录',
      triText(d,'sedentaryBreaks'), triText(d,'relax'), (d.skipped&&d.skipped.relax)?'是':'',
      triText(d,'sleepRest'),
      d.wakeTime||'', hasNum(d.weight)?num(d.weight):'', hasNum(d.waist)?num(d.waist):'',
      gl.map(function(g){return g.value;}).join('；'),
      gl.map(function(g){return g.timing;}).join('；'),
      gl.map(function(g){return g.method||'';}).join('；'),
      gl.map(function(g){return g.meds||'';}).join('；'),
      hasNum(d.stress)?num(d.stress):'', d.mood?(MOOD_TEXT[d.mood]||''):'', d.oneLine||'', d.did||'', d.tomorrow||'', d.note||'']);
  });
  return '\ufeff'+rows.map(function(r){ return r.map(csvCell).join(','); }).join('\n');
}
function triText(d,k){
  if(d.skipped&&d.skipped[k]) return '跳过';
  var s=triOf(d,k);
  return s==='yes'?'完成':(s==='no'?'未完成':'未记录');
}
function csvCell(v){
  v=String(v==null?'':v);
  if(/[",\n]/.test(v)) v='"'+v.replace(/"/g,'""')+'"';
  return v;
}

/* ========== 导航 ========== */
$$('.tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    currentTab=btn.getAttribute('data-tab');
    $$('.tab').forEach(function(b){ b.classList.toggle('active',b===btn); });
    $$('.page').forEach(function(p){ p.classList.remove('active'); });
    $('#page-'+currentTab).classList.add('active');
    if(currentTab==='trend') renderTrend();
    if(currentTab==='setting') renderSetting();
    if(currentTab==='plan') renderPlan();
    if(currentTab==='archive' && typeof window.__h30_renderArchive==='function') window.__h30_renderArchive();
    window.scrollTo(0,0);
  });
});

renderAll();

/* 共享 API：health-archive.js 通过此对象读写共享状态（始终暴露，不依赖 selftest 参数） */
window.__h30_api = {
  DB: DB,
  get DB(){ return DB; },
  set DB(x){ DB=x; },
  save: save,
  renderAll: renderAll,
  toast: toast,
  $: $, $$: $$,
  esc: esc,
  hasNum: hasNum, num: num,
  parseD: parseD, fmt: fmt, pad: pad, hhmm: hhmm,
  todayStr: todayStr, addDays: addDays, dayIndex: dayIndex, dateLabel: dateLabel,
  addMonths: addMonths, constReviewDue: constReviewDue,
  triOf: triOf, isSubmitted: isSubmitted, dayHasContent: dayHasContent,
  blankDB: blankDB, blankDay: blankDay, blankBase: blankBase, migrate: migrate,
  cycleStart: cycleStart, cycleEnd: cycleEnd, cycleTotal: cycleTotal, cycleLabel: cycleLabel, currentCycle: currentCycle,
  weekOfIdx: weekOfIdx, weekRange: weekRange, currentWeek: currentWeek,
  showModal: showModal, closeModal: closeModal, download: download,
  mergeArchive: mergeArchive,
  /* 档案页状态钩子 */
  setArchiveRender: function(fn){ window.__h30_renderArchive = fn; }
};

/* 自动版本检测：解决微信内置浏览器强缓存旧 JS 的问题。
 * 打开后后台拉取最新页面，若服务器版本高于本机，自动带时间戳刷新一次。
 * 每次发版需同步修改 APP_VERSION 与 index.html 的 ver-tag / ?v=N。
 */
var APP_VERSION = 30;
(function versionCheck(){
  if(/[?&]selftest=1/.test(location.search)) return;
  if(!window.fetch) return;
  try{
    fetch('index.html?nocache='+Date.now(), { cache:'no-store' })
      .then(function(r){ return r.text(); })
      .then(function(t){
        var m = t.match(/ver-tag">v(\d+)</);
        if(m && +m[1] > APP_VERSION){
          location.replace(location.pathname + '?t=' + Date.now());
        }
      })
      .catch(function(){});
  }catch(e){}
})();

/* 仅用于本地自测：带 ?selftest=1 时暴露额外函数 */
if(/[?&]selftest=1/.test(location.search)){
  window.__h30 = {
    getDB:function(){ return DB; },
    setDB:function(x){ DB=x; migrate(DB); renderAll(); },
    blankDB:blankDB, migrate:migrate, dayIndex:dayIndex, weekOfIdx:weekOfIdx,
    weekRange:weekRange, isSubmitted:isSubmitted, dayHasContent:dayHasContent,
    dayTargetFull:dayTargetFull, triOf:triOf, hasNum:hasNum, toCSV:toCSV,
    addDays:addDays, todayStr:todayStr, START:START, END:END, TOTAL:TOTAL,
    load:load, save:save, blankDay:blankDay, renderAll:renderAll,
    setViewDate:function(d){ viewDate=d; editing=false; renderToday(); },
    openImportDialog:openImportDialog, doImport:doImport, weekSubmittedDays:weekSubmittedDays,
    modeFullDays:modeFullDays, streak:streak, currentCycle:currentCycle, cycleTotal:cycleTotal
  };
}
})();
