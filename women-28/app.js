/* 女性养生 28 天周期打卡 - 纯前端本机存储 */
(function(){
'use strict';

/* ========== 常量 ========== */
var LS_KEY = 'women28_v1';
var DEFAULT_LEN = 28;

/* 6 种体质类型 */
var TYPES = [
  {key:'cold', emoji:'❄️', name:'寒冷冻结型', color:'#3b82f6',
   desc:'绞痛、小腹凉、热敷缓解、血块多色暗',
   point:'地机（急痛）；灸关元＋神阙',
   tea:'姜枣肉桂茶；艾叶泡脚；粗盐艾叶热敷包',
   sport:'快走、慢跑、开合跳',
   red:'一切冰的生的：冰饮、西瓜、苦瓜、螃蟹'},
  {key:'pressure', emoji:'😤', name:'压力堵车型', color:'#8b5cf6',
   desc:'疼痛与经前胀感、情绪压力同步',
   point:'气滞→太冲；睡前捋两胁 30 次',
   tea:'玫瑰花茶',
   sport:'跳舞、拳击操（安排在精力周）',
   red:'熬夜、持续紧张'},
  {key:'warm', emoji:'🔥', name:'暖气不足型', color:'#f97316',
   desc:'长期怕冷，恢复慢',
   point:'灸关元',
   tea:'晒背＋艾叶蛋',
   sport:'快走、晒太阳',
   red:'冰饮、生冷'},
  {key:'battery', emoji:'🔋', name:'电量不足型', color:'#f59e0b',
   desc:'经期疲乏明显、恢复慢',
   point:'—',
   tea:'当归蛋每周 3–4 次',
   sport:'温和运动，避免过量',
   red:'熬夜、过度消耗'},
  {key:'reserve', emoji:'🫙', name:'深层储备不足型', color:'#6366f1',
   desc:'长期低储备、恢复很慢',
   point:'早晚熨腰',
   tea:'黑芝麻核桃粉每天 1 勺',
   sport:'温和、规律',
   red:'熬夜、节食'},
  {key:'damp', emoji:'💦', name:'闷热潮湿型', color:'#14b8a6',
   desc:'经期闷胀、潮湿黏腻',
   point:'不灸（减少温热刺激）',
   tea:'赤小豆薏米水每天喝',
   sport:'温和运动',
   red:'温热刺激、甜腻饮食'}
];
var TYPE_MAP = {}; TYPES.forEach(function(t){ TYPE_MAP[t.key]=t; });

/* 6 个阶段 */
var PHASES = [
  {key:'fire', emoji:'🔥', name:'救火日',
   focus:'按三阴交或合谷，热敷小腹，热饮，做舒缓体式。<strong>止痛药要吃就早吃</strong>。艾灸最多到今明天收尾，量大的话今天就停。别的都放下——这两天唯一的任务，是<strong>怎么舒服怎么来</strong>。',
   scenarios:[
     {time:'晨起', timeRange:'6:00–7:00 AM', scene:'🌅', text:'热敷小腹 15–20 分钟，空腹温水'},
     {time:'午休', timeRange:'12:00–14:00 PM', scene:'💻', text:'按三阴交/合谷 30 秒–2 分钟止痛'},
     {time:'随餐', timeRange:'无固定时间', scene:'🍚', text:'热饮（姜茶/红糖水），忌生冷，一天 3 杯'},
     {time:'睡前', timeRange:'23:00 PM', scene:'🌙', text:'20 分钟舒缓体式（婴儿式/蝴蝶式）+ 热敷'}
   ],
   note:'💡 艾灸最多用到 Day 2–3，量大即停'},
  {key:'wrap', emoji:'🌿', name:'收尾日',
   focus:'疼痛和流量都在回落。<strong>不需要热敷了就停</strong>，让身体自己收尾。从今天开始有意识地吃含铁食物——月经正在失血，<strong>从现在到经后一周都是补铁窗口</strong>。',
   scenarios:[
     {time:'随餐', timeRange:'无固定时间', scene:'🍚', text:'有意识地吃含铁食物：红肉、动物肝脏、菠菜'},
     {time:'运动', timeRange:'无固定时间', scene:'🚶', text:'恢复正常活动量，不必强求运动'},
     {time:'随餐', timeRange:'无固定时间', scene:'☕', text:'茶和咖啡可以恢复，但少量'}
   ],
   note:'💡 补铁窗口开启，为回血周做准备'},
  {key:'blood', emoji:'🥩', name:'回血周',
   focus:'整个周期里<strong>补铁效率最高的一周</strong>。回血早餐：燕麦/小米粥 + 红枣葡萄干 + 维C水果。茶和咖啡少喝——它们拦着铁吸收。运动恢复成温和规律：散步、温和瑜伽。<strong>这周尤其值得早睡</strong>。',
   scenarios:[
     {time:'随餐', timeRange:'无固定时间', scene:'🌅', text:'回血早餐：燕麦/小米粥+红枣葡萄干+橙子'},
     {time:'午休', timeRange:'12:00–14:00 PM', scene:'💻', text:'茶和咖啡少喝，换成红枣枸杞水'},
     {time:'运动', timeRange:'无固定时间', scene:'🚶', text:'温和运动：散步、温和瑜伽'},
     {time:'睡前', timeRange:'23:00 PM', scene:'🌙', text:'尤其值得早睡，23:00 前上床'}
   ],
   note:'💡 电量不足型：当归蛋每周 3–4 次；深层储备不足型：黑芝麻核桃粉每天 1 勺 + 早晚熨腰'},
  {key:'energy', emoji:'⚡', name:'精力周',
   focus:'多数女性这几天是周期里的<strong>精力峰值</strong>，好好用它：把每周 3–5 次的体质运动跑满。压力堵车型把跳舞、拳击操安排在这几天，把积攒的张力泄掉；寒冷冻结型继续让身体产热。也是<strong>观察期</strong>：分泌物清亮有弹性 ≈ 排卵 → 往后数约 14 天 = 下次月经预计日。',
   scenarios:[
     {time:'上午', timeRange:'8:00–11:00 AM', scene:'🏃', text:'体质运动跑满：快走、跳舞、拳击操'},
     {time:'随餐', timeRange:'无固定时间', scene:'🍚', text:'正常饮食，蛋白充足支持运动量'}
   ],
   note:'💡 从排卵日往后数约 14 天 = 下次月经预计日，防火周随之确定'},
  {key:'prep', emoji:'🛡️', name:'防火准备周',
   focus:'倒计时开始，但还不用紧张，做三件事：<strong>体质茶</strong>开始每天一杯；<strong>运动保持规律</strong>——经前规律运动的改善效果有证据支持；<strong>红灯清单逐条关</strong>：冰饮先戒，咖啡减到每天最多一小杯，熬夜开始收敛。',
   scenarios:[
     {time:'上午', timeRange:'8:00–11:00 AM', scene:'🍵', text:'体质茶每天一杯（按体质选）'},
     {time:'运动', timeRange:'无固定时间', scene:'🚶', text:'运动保持规律，每周 3–5 次'},
     {time:'随餐', timeRange:'无固定时间', scene:'☕', text:'冰饮先戒，咖啡减到每天最多一小杯'},
     {time:'睡前', timeRange:'23:00 PM', scene:'🌙', text:'熬夜开始收敛，23:00 前放下手机'}
   ],
   note:'💡 红灯清单逐条关，为防火周做准备'},
  {key:'guard', emoji:'🚒', name:'防火周',
   focus:'<strong>全套预防开动</strong>。艾灸关元每天 15 分钟，上午更好，晚上做要趁早；按体质配穴。寒冷冻结型：艾叶泡脚每周 3–4 次；压力堵车型：睡前捋两胁 30 次；暖气不足型：晒背 + 艾叶蛋；闷热潮湿型：不灸，赤小豆薏米水每天喝。',
   scenarios:[
     {time:'晨起', timeRange:'6:00–7:00 AM', scene:'🌅', text:'艾灸关元 15 分钟（上午更好，晚上趁早）'},
     {time:'午休', timeRange:'12:00–14:00 PM', scene:'💻', text:'按体质配穴：寒性 → 地机，气滞 → 太冲'},
     {time:'随餐', timeRange:'无固定时间', scene:'🍚', text:'闷热型：饮食做减法，赤小豆薏米水每天喝'},
     {time:'睡前', timeRange:'23:00 PM', scene:'🌙', text:'泡脚/按穴/捋两胁 30 次；穴位贴、热水袋放床头'}
   ],
   note:'💡 情绪提醒：经前几天烦躁易怒是激素坐过山车，不是你的错，也快过去了。Day 1 再来时，你不是被突袭的，你是备好战的。'}
];
var PHASE_MAP = {}; PHASES.forEach(function(p){ PHASE_MAP[p.key]=p; });

/* 每日小任务（Day 1–28） */
var DAILY = [
 '记录月经第一天：流量、颜色、腹痛程度（0–10）',
 '今天唯一的任务——怎么舒服怎么来：热敷、热饮，止痛药要吃就早吃',
 '观察流量和疼痛有没有回落，把按过的穴位记一笔',
 '今天开始有意识补铁：红肉 / 动物肝脏 / 菠菜',
 '咖啡和茶可以恢复，但今天只一小杯',
 '开始回血早餐：燕麦/小米粥＋红枣葡萄干＋橙子',
 '第一周复盘：这两天哪个做法最管用？写进备注',
 '茶和咖啡换成红枣枸杞水；记录今天的精神状态',
 '温和运动：散步或温和瑜伽 20 分钟',
 '今天尤其值得早睡——23:00 前上床',
 '回血周收尾：把有效的补铁做法固定成 2–3 个',
 '体质运动跑满：快走 / 跳舞 / 拳击操（按体质选）',
 '观察期：留意分泌物是否清亮有弹性（≈排卵）',
 '精力峰值：把本周第 3 次运动安排掉，记下今天的精力值',
 '倒计时开始：体质茶每天一杯，今天选定你的茶',
 '红灯清单第 1 条：冰饮先戒',
 '咖啡减到每天最多一小杯',
 '运动保持规律，今天第 1 次',
 '熬夜开始收敛：23:00 前放下手机',
 '第二周复盘：红灯清单关掉几条了？',
 '备好防火周要用的东西：穴位贴 / 热水袋 / 艾叶',
 '全套预防开动：艾灸关元 15 分钟（上午更好）',
 '按体质配穴：寒性→地机，气滞→太冲',
 '寒冷冻结型：艾叶泡脚；压力堵车型：睡前捋两胁 30 次',
 '闷热潮湿型：饮食做减法＋赤小豆薏米水',
 '情绪记录：经前烦躁是激素波动，不是你的错',
 '防火周收尾：把最有效的 2 个做法写下来',
 '月度复盘：整周期感受对比，选好下月调理重点'
];

/* 打卡动作（8 项） */
var ITEMS = [
  {key:'warmBelly',  name:'暖腹 / 暖腰',      type:'tri'},
  {key:'noCold',     name:'不碰冷饮生冷',      type:'tri'},
  {key:'earlySleep', name:'早睡（23:00 前）',   type:'tri'},
  {key:'bodyFood',   name:'体质饮食',          type:'tri'},
  {key:'soothing',   name:'舒缓体式 / 放松',    type:'tri', optional:true},
  {key:'moxaMin',    name:'艾灸时长',          type:'num', unit:'分钟'},
  {key:'footMin',    name:'泡脚时长',          type:'num', unit:'分钟'},
  {key:'waterMl',    name:'饮水',             type:'num', unit:'毫升'}
];
var ITEM_MAP = {}; ITEMS.forEach(function(it){ ITEM_MAP[it.key]=it; });
var STD_KEYS  = ['warmBelly','noCold','earlySleep','bodyFood','soothing','moxaMin','footMin','waterMl'];
var BUSY_KEYS = ['warmBelly','noCold','earlySleep','waterMl'];

/* 备选池 */
var POOL = [
  {cat:'🍵 吃喝', items:['补充剂（鱼油 1000mg 早餐后＋镁 300mg 晚饭后）','经后三天回血早餐（高铁＋维C）','上午姜茶','玫瑰花茶']},
  {cat:'🏃 动',   items:['凯格尔每天 ×10 组（等电梯/刷手机时）','周末集中运动 20–30 分钟','周末户外晒太阳 15 分钟','靠墙站防驼背']},
  {cat:'🛁 睡 / 泡', items:['睡前泡脚 15–20 分钟','腿靠墙 5 分钟助眠','周日提前收心防周一综合征']},
  {cat:'🔧 工具', items:['穴位贴（替代手按）','艾灸杯（经前灸关元用）','TENS 止痛仪（每月剧痛者）','经期 App 记录周期']}
];

/* 查看方法文案 */
var TIPS = {
  warmBelly:'热敷小腹 15–20 分钟。寒冷冻结型可用粗盐艾叶热敷包；闷热潮湿型改为温敷、时间短一些。经期出血量大时不要长时间高温热敷。',
  noCold:'忌一切冰的生的：冰饮、西瓜、苦瓜、螃蟹。压力堵车型还要收敛熬夜和持续紧张。',
  earlySleep:'23:00 前上床，睡前 30 分钟放下手机。经前熬夜会让烦躁和胀感更明显。',
  bodyFood:'按体质选：寒冷冻结型→姜枣肉桂茶；压力堵车型→玫瑰花茶；暖气不足型→晒背＋艾叶蛋；电量不足型→当归蛋每周 3–4 次；深层储备不足型→黑芝麻核桃粉每天 1 勺；闷热潮湿型→赤小豆薏米水，饮食做减法。',
  soothing:'婴儿式、蝴蝶式各 1–2 分钟；或缓慢呼吸 3–5 分钟，不憋气，头晕时停止。',
  moxaMin:'艾灸关元 15 分钟，上午更好，晚上做要趁早。Day 1–2 出血量大时停灸；闷热潮湿型不灸。',
  footMin:'艾叶泡脚 15–20 分钟，水温 40℃ 左右、不烫为宜。寒冷冻结型每周 3–4 次。',
  waterMl:'分次饮水，避免晚上集中补喝。没有限水要求时参考 1500–2000 毫升。',
  tempC:'晨起未起床、未说话、未进食前测，固定同一时间同一位置，记到小数点后 1 位。基线单独存，不计入趋势样本。'
};
var SAFETY = '如出现剧烈腹痛、出血量异常（明显过多或过少）、经期超过 7 天、发热等明显异常，请及时就医。本工具不替代医嘱。';

var FEEL_BODY = ['😖','😕','😐','🙂','😄'];
var FEEL_MIND = ['😞','😔','😐','🙂','😄'];
var FEEL_BODY_TXT = ['很难受','有点难受','一般','还不错','很舒服'];
var FEEL_MIND_TXT = ['低落','有点闷','平静','轻松','愉快'];

/* ========== 工具 ========== */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseD(s){ var p=String(s).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function todayStr(){ return fmt(new Date()); }
function addDays(s, n){ var d=parseD(s); d.setDate(d.getDate()+n); return fmt(d); }
function dateLabel(s){ var p=String(s).split('-'); return (+p[1])+'月'+(+p[2])+'日'; }
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
  var t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm=setTimeout(function(){ t.classList.remove('show'); },1800);
}

/* ========== 数据层 ========== */
function blankDay(){
  return {
    mode:undefined,
    warmBelly:undefined, noCold:undefined, earlySleep:undefined, bodyFood:undefined, soothing:undefined,
    skipped:{},
    moxaMin:'', footMin:'', waterMl:'', tempC:'',
    body:null, mind:null, feelSubmitted:false,
    did:'', tomorrow:'', note:'',
    done:undefined, submitTime:'', draftSavedAt:''
  };
}
function blankBase(){
  return {
    tempBase:{ value:'', date:null, source:'', note:'' },
    assessment:null,   /* 身体状态测评结果基线（parseAssessCode 导入） */
    wakeTime:'07:00', bedTime:'23:00'
  };
}
function blankDB(){
  return {
    version:1,
    settings:{
      cycleStart: todayStr(),
      cycleLen: DEFAULT_LEN,
      type:'',
      pool:{}, poolLog:{}, dismissedBackup:[], dismissedCareAt:null
    },
    baseline: blankBase(),
    days:{}, weeks:{},
    reviews:[]
  };
}
function load(){
  var db=null;
  try{ var raw=localStorage.getItem(LS_KEY); if(raw) db=JSON.parse(raw); }catch(e){ db=null; }
  if(!db||typeof db!=='object') return blankDB();
  return migrate(db);
}
/* 字段缺失一律视为未记录，不补成 0 / false */
function migrate(db){
  var b=blankDB();
  db.settings = db.settings || {};
  var s=db.settings;
  if(!s.cycleStart || !/^\d{4}-\d{2}-\d{2}$/.test(s.cycleStart)) s.cycleStart=b.settings.cycleStart;
  var len=parseInt(s.cycleLen,10);
  s.cycleLen = (len>=21 && len<=35) ? len : DEFAULT_LEN;
  if(TYPE_MAP[s.type]===undefined) s.type='';
  if(!s.pool || typeof s.pool!=='object') s.pool={};
  if(!s.poolLog || typeof s.poolLog!=='object') s.poolLog={};
  if(!Array.isArray(s.dismissedBackup)) s.dismissedBackup=[];
  db.baseline = db.baseline || blankBase();
  var bl=db.baseline;
  if(!bl.tempBase || typeof bl.tempBase!=='object') bl.tempBase={ value:'', date:null, source:'', note:'' };
  ['value','date','source','note'].forEach(function(k){ if(bl.tempBase[k]===undefined) bl.tempBase[k]=(k==='value'||k==='source'||k==='note')?'':null; });
  if(!bl.wakeTime) bl.wakeTime='07:00';
  if(!bl.bedTime)  bl.bedTime='23:00';
  if(bl.assessment===undefined) bl.assessment=null;
  if(bl.assessment){
    if(!bl.assessment.signals) bl.assessment.signals=[];
    bl.assessment.signals = bl.assessment.signals.map(function(s){
      if(typeof s==='string') return {text:s, seekCare:false};
      if(typeof s==='object' && s!=null) return {text:s.text||'', seekCare:!!s.seekCare};
      return {text:'', seekCare:false};
    });
  }
  db.days = db.days || {};
  Object.keys(db.days).forEach(function(ds){
    var d=db.days[ds]; if(!d||typeof d!=='object'){ delete db.days[ds]; return; }
    ['warmBelly','noCold','earlySleep','bodyFood','soothing'].forEach(function(k){
      if(d[k]===undefined) delete d[k];
      else d[k] = (d[k]===true) ? true : (d[k]===false ? false : undefined);
    });
    if(!d.skipped || typeof d.skipped!=='object') d.skipped={};
    ['moxaMin','footMin','waterMl','tempC','did','tomorrow','note','submitTime','draftSavedAt'].forEach(function(k){
      if(d[k]===undefined || d[k]===null) d[k]='';
    });
    if(d.body===undefined) d.body=null;
    if(d.mind===undefined) d.mind=null;
    if(d.feelSubmitted===undefined) d.feelSubmitted=false;
    d.done = d.done===true ? true : undefined;
    d.mode = d.mode||undefined;
  });
  if(!db.weeks || typeof db.weeks!=='object') db.weeks={};
  if(!db.reviews || !Array.isArray(db.reviews)) db.reviews=[];
  if(!db.baseline) db.baseline=blankBase();
  return db;
}
var DB = load();

var saveState={ status:'idle', time:'' };
function save(){
  saveState.status='saving';
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); saveState.status='saved'; saveState.time=hhmm(new Date()); return true; }
  catch(e){ saveState.status='failed'; return false; }
}
function getDay(ds){ return DB.days[ds] || blankDay(); }
function ensureDay(ds){ if(!DB.days[ds]) DB.days[ds]=blankDay(); return DB.days[ds]; }
function isRecorded(d){ return !!d && typeof d==='object'; }
function dayHasContent(d){
  if(!isRecorded(d)) return false;
  if(isSubmitted(d) || d.feelSubmitted) return true;
  var t=['warmBelly','noCold','earlySleep','bodyFood','soothing'].some(function(k){ return d[k]!==undefined; });
  t = t || ['moxaMin','footMin','waterMl','tempC','did','tomorrow','note'].some(function(k){ return d[k]!==undefined && d[k]!==''; });
  t = t || hasNum(d.body) || hasNum(d.mind);
  return t;
}

/* ========== 周期 ========== */
function cycleLen(){ return DB.settings.cycleLen || DEFAULT_LEN; }
function cycleStart(){ return DB.settings.cycleStart || todayStr(); }
function cycleTotal(){ return cycleLen(); }
function dayIndex(ds){ return Math.round((parseD(ds)-parseD(cycleStart()))/86400000)+1; }
function dateOfIdx(idx){ return addDays(cycleStart(), idx-1); }
function cycleLabel(){
  var s=parseD(cycleStart()), e=parseD(dateOfIdx(cycleTotal()));
  return s.getFullYear()+'年'+(s.getMonth()+1)+'月'+s.getDate()+'日至'+(e.getMonth()+1)+'月'+e.getDate()+'日';
}
function phaseOf(idx){
  var len=cycleTotal();
  if(idx<1 || idx>len) return null;
  if(idx<=2) return PHASE_MAP.fire;
  if(idx<=5) return PHASE_MAP.wrap;
  if(idx<=10) return PHASE_MAP.blood;
  if(idx<=14) return PHASE_MAP.energy;
  if(idx < len-6) return PHASE_MAP.prep;
  return PHASE_MAP.guard;
}
function dailyOfIdx(idx){ return (idx>=1 && idx<=DAILY.length) ? DAILY[idx-1] : '继续保持已经养成的习惯'; }

/* 复盘日：Day 5 经期收尾 / Day 14 精力周结束 / 周期最后一天 */
function reviewOf(idx){
  var tot=cycleTotal();
  if(idx===5) return '这次经期的疼痛、流量、血块情况如何？哪个做法最管用？';
  if(idx===14) return '精力峰值有没有出现？体质饮食和运动执行得怎么样？';
  if(idx===tot) return '整周期的身体和心情变化对比一下，选一个下个月最想改善的重点。';
  return '';
}

/* ===== 身体状态测评结果基线 ===== */
/* 测评类型 key → 打卡工具体质 key */
var ASSESS_KEY_MAP={
  cold_freeze:'cold', pressure_block:'pressure', heater_insufficient:'warm',
  battery_low:'battery', deep_reserve:'reserve', stuffy_damp:'damp'
};
/* 解析测评页「复制结果码」的文本（W28-ASSESS-V1） */
function parseAssessCode(text){
  var t=String(text||'').replace(/\r/g,'');
  if(t.indexOf('W28-ASSESS-V1')<0) return null;
  function pick(re){ var m=t.match(re); return m?m[1].trim():''; }
  var assessTime=pick(/测评时间：(.*)/);
  var nameLine=pick(/经期反应类型：(.*)/);
  if(!nameLine) return null;
  var primaryKey=(nameLine.match(/（([a-z_]+)）/)||[])[1]||'';
  var primaryName=nameLine.replace(/（[a-z_]+）/,'').trim();
  var similarity=pick(/匹配度：(.*)/);
  var secondary=pick(/次要倾向：(.*)/);
  var safetyLevel=pick(/安全级别：(.*)/);
  var sigBlock=(t.split('识别到的信号：')[1]||'');
  var signals=sigBlock.split('\n').map(function(s){ return s.replace(/^[-•]\s*/,'').trim(); }).filter(Boolean);
  return {
    assessTime:assessTime||'', primaryKey:primaryKey, primaryName:primaryName,
    similarity:similarity, secondary:secondary, safetyLevel:safetyLevel,
    signals:signals, importedAt:new Date().toLocaleString('zh-CN',{hour12:false})
  };
}
/* 生成测评基线文档文本 */
function buildAssessDoc(){
  var as=DB.baseline.assessment; if(!as) return '';
  var L=[];
  L.push('女性养生 28 天 · 身体状态测评基线');
  L.push('================================');
  L.push('测评时间：'+(as.assessTime||'—'));
  L.push('导入时间：'+(as.importedAt||'—'));
  L.push('经期反应类型：'+(as.primaryName||'—')+(as.similarity?('（'+as.similarity+'）'):''));
  if(as.secondary) L.push('次要倾向：'+as.secondary);
  if(as.safetyLevel) L.push('安全级别：'+as.safetyLevel);
  if(as.signals&&as.signals.length){
    L.push('');
    L.push('测评中识别到的问题（基线参考）：');
    as.signals.forEach(function(s,i){ L.push((i+1)+'. '+s); });
  }
  L.push('');
  L.push('说明：以上内容来自《身体状态测评》结果，仅作为打卡期间的基线参考，不替代专业医疗医嘱。');
  return L.join('\n');
}
function downloadText(filename, text){
  var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); },0);
}

/* ========== 统计 ========== */
var undoStack = {};

function weekOfIdx(idx){ return Math.floor((idx-1)/7)+1; }
function weekRange(w){ return [ dateOfIdx((w-1)*7+1), dateOfIdx(Math.min(w*7, cycleTotal())) ]; }
function currentWeek(){
  var idx=dayIndex(todayStr()), tot=cycleTotal();
  if(idx<1) return 1;
  if(idx>tot) return Math.ceil(tot/7);
  return weekOfIdx(idx);
}
/* 已打卡 = 提交了记录（唯一日期计数，重复提交不增加） */
function submittedDates(){ return Object.keys(DB.days).filter(function(ds){ return isSubmitted(DB.days[ds]); }); }
function weekSubmittedDays(w){
  var tot=cycleTotal();
  return submittedDates().filter(function(ds){ var i=dayIndex(ds); return i>=1 && i<=tot && weekOfIdx(i)===w; }).length;
}
function streak(){
  var s=0, d=todayStr();
  if(dayIndex(d)<1) return 0;
  if(!isSubmitted(DB.days[d])) d=addDays(d,-1);
  while(DB.days[d] && isSubmitted(DB.days[d])){ s++; d=addDays(d,-1); }
  return s;
}
function dayModeKeys(d){ return (d.mode==='busy') ? BUSY_KEYS : STD_KEYS; }
/* 当日模式目标完成：该模式全部项目都达到完成 / 已记录 */
function dayTargetFull(d){
  var keys=dayModeKeys(d);
  return keys.every(function(k){
    var it=ITEM_MAP[k];
    if(!it) return true;
    if(it.type==='num') return hasNum(d[k]);
    return d[k]===true;
  });
}
function modeFullDays(){
  var tot=cycleTotal();
  return Object.keys(DB.days).filter(function(ds){
    var d=DB.days[ds], i=dayIndex(ds);
    if(i<1||i>tot) return false;
    return dayHasContent(d) && dayTargetFull(d);
  }).length;
}

/* ========== 页面状态 ========== */
var currentTab='today';
var viewDate=todayStr();
var editing=false;
var uiState={ feelEdit:false, extra:false };

function renderAll(){ renderToday(); renderPlan(); renderTrend(); renderSetting(); }

/* ============ 今日打卡页 ============ */
function renderToday(){
  var el=$('#page-today');
  var t=viewDate, today=todayStr();
  var isToday=(t===today), future=(t>today);
  var idx=dayIndex(t), tot=cycleTotal(), inRange=(idx>=1 && idx<=tot);
  var phase=phaseOf(idx);
  var d=getDay(t);
  var submitted=isSubmitted(d);
  var locked = future || (isToday && submitted && !editing);
  var busy = (d.mode==='busy');
  var html='';

  /* 1. 日期导航 */
  var canPrev=(t>cycleStart()), canNext=(t<today);
  html += '<div class="date-nav">'
    + '<button class="nav-arrow" id="nav-prev" '+(canPrev?'':'disabled')+'>‹</button>'
    + '<div class="nav-label"><div>'+dateLabel(t)
    + (isToday?' <span class="today-badge">今天</span>':'')
    + (future?' <span class="draft-badge future">未开始</span>':'')
    + (submitted?' <span class="draft-badge ok">已打卡</span>':(dayHasContent(d)?' <span class="draft-badge">草稿</span>':''))
    + '</div>'
    + (isToday?'<div class="nav-hint">点两侧箭头可查看、修改本周期其他日期</div>'
              :'<a href="javascript:void 0" id="nav-back-today" class="back-today">✕ 回到今天</a>')
    + '</div>'
    + '<button class="nav-arrow" id="nav-next" '+(canNext?'':'disabled')+'>›</button>'
    + '</div>';

  /* 2. 周期头部 + 打卡统计 */
  var phaseTag = phase ? ('<span class="phase-tag">'+phase.emoji+' '+phase.name+'</span>') : '';
  html += '<div class="day-hero">'
    + '<div class="day-num">'+(inRange?('第 '+idx+' 天 / 共 '+tot+' 天'):(idx<1?'本周期尚未开始':'本周期已结束'))
    + ' · '+dateLabel(t)+phaseTag+'</div>'
    + '<div class="day-focus">'+esc(inRange?(dailyOfIdx(idx)):'等下一次 Day 1 开始新的周期')+'</div>'
    + '<div class="hero-stats hero-stats-2">'
    +   '<div class="hero-stat"><div class="v">'+weekSubmittedDays(currentWeek())+'</div><div class="k">本周已打卡 天</div></div>'
    +   '<div class="hero-stat"><div class="v">'+submittedDates().length+'</div><div class="k">累计已打卡 天</div></div>'
    + '</div>'
    + '<div class="hero-sub">连续打卡 '+streak()+' 天 · 周期 '+cycleLabel()
    + (DB.settings.type&&TYPE_MAP[DB.settings.type]?(' · '+TYPE_MAP[DB.settings.type].name):' · 体质未设置')
    + '</div>'
    + '</div>';

  /* 3. 桌面双栏区：今日感受 + 每日小任务（手机端 display:contents，不影响原布局） */
  html += '<div class="dg">';

  /* 3a. 今日感受横幅 */
  var feelLocked = locked || (d.feelSubmitted && !uiState.feelEdit);
  html += '<div class="feel-banner">'
    + '<div class="feel-head"><div class="feel-title">今日感受</div><div class="feel-date">'+dateLabel(t)+(isToday?' · 今天':'')+'</div></div>'
    + feelRow('body','身体感受',FEEL_BODY,FEEL_BODY_TXT,d.body,feelLocked)
    + feelRow('mind','心情感受',FEEL_MIND,FEEL_MIND_TXT,d.mind,feelLocked)
    + '<div class="feel-actions">'
    +   (future ? '<span class="feel-note">该日期尚未到来</span>'
        : (locked ? (d.feelSubmitted?'<span class="feel-note">已提交 · 点底部「修改」可更正</span>':'')
        : (d.feelSubmitted && !uiState.feelEdit ? '<button class="feel-btn ghost" id="btn-feel-edit">修改感受</button>'
           : '<button class="feel-btn" id="btn-feel-submit">提交感受</button>')))
    + '</div>'
    + (feelLocked?'':'<div class="feel-note">身体、心情都选一项，点「提交感受」保存；两项都选才能提交</div>')
    + '</div>';

  /* 4. 每日小任务 + 阶段做法 */
  if(inRange && phase){
    html += '<div class="task-card">'
      + '<div class="task-head">'+phase.emoji+' '+phase.name+' · Day '+idx+' 小任务</div>'
      + '<div class="task-body">'+esc(dailyOfIdx(idx))+'</div>'
      + '<div class="task-note">'+phase.focus+'</div>'
      + '<details class="tips"><summary>这个阶段的场景做法</summary><div class="tip-body">'
      +   '<div class="cycle-scenarios">'
      +   phase.scenarios.map(function(s){
            return '<div class="cycle-scenario-row">'
              + '<span class="csr-time">'+esc(s.time)+'<br><span class="csr-time-range">'+esc(s.timeRange||'')+'</span></span>'
              + '<span class="csr-scene">'+esc(s.scene||'')+'</span>'
              + '<span class="csr-text">'+esc(s.text)+'</span></div>';
          }).join('')
      +   '</div>'
      +   '<div class="cycle-stage-note">💡 '+esc(phase.note||'')+'</div>'
      + '</div></details>'
      + '</div>';
  }
  html += '</div>';
  if(future){ html += '<div class="notice" style="margin-bottom:12px">🔒 该日期尚未到来，仅可查看计划，不能填写或提交。</div>'; }
  if(isToday && submitted && !editing){ html += '<div class="notice" style="margin-bottom:12px">✅ 今日已打卡 · '+esc(d.submitTime||'')+'。如需更正，点底部「修改」。</div>'; }

  /* 就诊提醒：设置页里勾选了 seekCare 的 signal，每天弹一次（可按天关闭） */
  if(inRange && isToday){
    var b=DB.baseline, seekList=[];
    if(b.assessment && b.assessment.signals){
      b.assessment.signals.forEach(function(s){
        if(s && s.seekCare) seekList.push(typeof s==='object'?(s.text||''):String(s));
      });
    }
    if(seekList.length && DB.settings.dismissedCareAt!==todayStr()){
      html += '<div class="banner care" style="margin-bottom:12px"><div class="banner-txt">🏥 就诊提醒：'+esc(seekList.join('、'))
        + '。打卡不能替代就医，请按医嘱及时就诊。</div>'
        + '<button class="banner-x" id="btn-dismiss-care">✕</button></div>';
    }
  }

  /* 复盘日提示：Day 5 / Day 14 轻量，Day 28 结构化 */
  if(inRange && isToday){
    var rv=reviewOf(idx);
    if(rv){
      if(idx===tot){
        /* Day 28：结构化复盘（基于测评 signals） */
        var b=DB.baseline, signals=[];
        if(b.assessment && b.assessment.signals){
          signals=b.assessment.signals.map(function(s){ return (typeof s==='object')?(s.text||''):String(s); }).filter(Boolean);
        }
        var existing=null;
        DB.reviews.forEach(function(r){ if(r.idx===idx && r.cycleStart===cycleStart()) existing=r; });
        var revHtml='', entries=[];
        if(signals.length){
          revHtml += '<div class="review-block"><div class="review-title">📋 周期末复盘（Day '+idx+'）</div>';
          revHtml += '<div class="review-desc">请逐条评价测评时识别到的问题，这会存为历次复盘对比。</div>';
          signals.forEach(function(s,si){
            var ee = existing ? (existing.entries[si] || {rating:'',note:''}) : {rating:'',note:''};
            entries.push({signalText:s});
            revHtml += '<div class="review-item"><div class="review-sig">'+esc(s)+'</div>'
              + '<div class="review-rating">'
              +   '<label><input type="radio" name="rr_'+si+'" value="better"'+(ee.rating==='better'?' checked':'')+'><span>有改善</span></label>'
              +   '<label><input type="radio" name="rr_'+si+'" value="same"'+(ee.rating==='same'?' checked':'')+'><span>没变化</span></label>'
              +   '<label><input type="radio" name="rr_'+si+'" value="worse"'+(ee.rating==='worse'?' checked':'')+'><span>加重了</span></label>'
              +   '<label><input type="radio" name="rr_'+si+'" value="na"'+(ee.rating==='na'?' checked':'')+'><span>没测</span></label>'
              + '</div>'
              + '<input type="text" class="review-note-input" placeholder="备注（可选）" value="'+esc(ee.note||'')+'">'
              + '</div>';
          });
          revHtml += '<div class="review-next"><label>下周期计划：</label><textarea id="review-next-plan" rows="2" placeholder="选一个最想改善的重点...">'+esc((existing&&existing.nextPlan)||'')+'</textarea></div>';
          revHtml += '<button class="btn secondary small" id="btn-save-review" style="margin-top:6px">保存复盘</button>';
          revHtml += '</div>';
          html += revHtml;
        } else {
          /* 没有测评基线，保持轻量 */
          html += '<div class="notice review-note" style="margin-bottom:12px">📋 <b>今天是复盘日（Day '+idx+'）</b>：'+esc(rv)
            + '<a href="javascript:void 0" class="link-inline" id="go-review">去写一句 →</a></div>';
        }
      } else {
        /* Day5/Day14：轻量复盘 */
        html += '<div class="notice review-note" style="margin-bottom:12px">📋 <b>今天是复盘日（Day '+idx+'）</b>：'+esc(rv)
          + '<a href="javascript:void 0" class="link-inline" id="go-review">去写一句 →</a></div>';
      }
    }
  }
  /* 备份提醒：Day 14 与周期最后一天各弹一次，可关闭 */
  if(inRange && isToday && (idx===14 || idx===tot)){
    var bkey='d'+idx;
    var bDismissed=(DB.settings.dismissedBackup||[]).indexOf(bkey)>=0;
    if(!bDismissed){
      html += '<div class="banner" style="margin-bottom:12px"><div class="banner-txt">📦 建议导出一次备份（换设备或清理浏览器后数据无法找回）</div>'
        + '<button class="banner-x" data-dismiss-backup="'+bkey+'">✕</button></div>';
    }
  }
  if(idx>tot){ html += '<div class="notice" style="margin-bottom:12px">本周期 '+tot+' 天已走完。<b>下一次月经第一天</b>到来时，到「计划设置」把周期起始日改成那一天，就会开始新的 Day 1。</div>'; }

  /* 5. 标准版 / 极简版切换 */
  html += '<div class="mode-switch">'
    + '<div class="mode-label">显示模式</div>'
    + '<div class="seg-switch">'
    +   '<button class="seg-btn'+(busy?'':' on')+'" data-mode="standard" '+(locked?'disabled':'')+'>标准版</button>'
    +   '<button class="seg-btn'+(busy?' on':'')+'" data-mode="busy" '+(locked?'disabled':'')+'>极简版</button>'
    + '</div></div>';
  html += '<div class="chart-note" style="margin:-4px 0 12px">极简版只简化显示，不影响其他记录，也不会自动打勾。</div>';

  /* 6. 桌面双栏区：今日行动 + 今日数值 */
  html += '<div class="dg">';

  /* 6a. 今日行动 */
  html += '<div class="card"><div class="card-title">今日行动 <span class="sub">'+(busy?'极简版 4 项':'标准版 8 项')+'</span></div>';
  if(!busy){
    html += actionTri(t,'warmBelly','暖腹 / 暖腰','热敷小腹 15–20 分钟',locked);
    html += actionTri(t,'noCold','不碰冷饮生冷','冰饮、西瓜、苦瓜、螃蟹先放下',locked);
    html += actionTri(t,'earlySleep','早睡（23:00 前）','睡前 30 分钟放下手机',locked);
    html += actionTri(t,'bodyFood','体质饮食','按体质选茶饮 / 食疗',locked);
    html += actionTri(t,'soothing','舒缓体式 / 放松','可选，可今日跳过',locked,true);
    html += actionNum(t,'moxaMin','艾灸时长','分钟','例如 15',locked,'quick-moxa');
    html += actionNum(t,'footMin','泡脚时长','分钟','例如 15',locked,'quick-foot');
    html += actionNum(t,'waterMl','饮水','毫升','例如 1800',locked,'quick-water');
  } else {
    html += '<div class="chart-note" style="margin:-2px 0 8px">极简版保住这 4 项即可：暖腹、不碰冷饮、23:00 前睡、喝够水。</div>';
    html += actionTri(t,'warmBelly','暖腹 / 暖腰','热敷小腹 15–20 分钟',locked);
    html += actionTri(t,'noCold','不碰冷饮生冷','冰饮、西瓜、苦瓜、螃蟹先放下',locked);
    html += actionTri(t,'earlySleep','早睡（23:00 前）','睡前 30 分钟放下手机',locked);
    html += actionNum(t,'waterMl','饮水','毫升','例如 1500',locked,'quick-water');
    html += '<details class="fold" id="fold-extra"'+(uiState.extra?' open':'')+'><summary>其他记录（体质饮食 / 舒缓 / 艾灸 / 泡脚）</summary>'
      + actionTri(t,'bodyFood','体质饮食','按体质选茶饮 / 食疗',locked)
      + actionTri(t,'soothing','舒缓体式 / 放松','可选，可今日跳过',locked,true)
      + actionNum(t,'moxaMin','艾灸时长','分钟','例如 15',locked,'quick-moxa')
      + actionNum(t,'footMin','泡脚时长','分钟','例如 15',locked,'quick-foot')
      + '</details>';
  }
  html += '</div>';

  /* 7. 今日数值 + 基础体温 */
  html += '<div class="card"><div class="card-title">今日数值 <span class="sub">空着代表未记录，不算 0</span></div>';
  html += '<div class="num-summary" id="num-summary">'+numSummary(d)+'</div>';
  html += '<div class="chart-note" style="text-align:left">艾灸 / 泡脚时长在「今日行动」里填写，可用快捷按钮累加。</div>';
  html += '<div class="temp-box"><div class="temp-title">🌡️ 基础体温（晨起，可留空）</div>'
    + '<div class="field input-suffix" style="margin-bottom:6px"><input type="number" step="0.1"'+(locked?' disabled':'')+' id="q-tempC" value="'+esc(d.tempC)+'" placeholder="例如 36.5"><span class="suffix">℃</span></div>'
    + '<div class="chart-note" style="text-align:left">'+esc(TIPS.tempC)+'</div>'
    + (DB.baseline.tempBase.value?('<div class="base-cur">体温基线 '+esc(DB.baseline.tempBase.value)+' ℃ · '+esc(baseMeta(DB.baseline.tempBase))+'（基线不计入趋势样本）</div>'):'')
    + '</div>';
  html += '</div>';
  html += '</div>';

  /* 8. 反思记录（折叠） */
  html += '<details class="fold card" id="fold-extra2"'+(uiState.more?' open':'')+'><summary>反思记录 <span class="fold-sub">可不填</span></summary>'
    + '<div class="field"><label>今天我做到了</label><textarea'+(locked?' disabled':'')+' id="f-did" placeholder="一两句话">'+esc(d.did)+'</textarea></div>'
    + '<div class="field"><label>明天最重要的一件事</label><textarea'+(locked?' disabled':'')+' id="f-tomorrow" placeholder="一句话">'+esc(d.tomorrow)+'</textarea></div>'
    + '<div class="field"><label>备注 / 复盘</label><textarea'+(locked?' disabled':'')+' id="f-note" placeholder="复盘日写在这里">'+esc(d.note)+'</textarea></div>'
    + '</details>';

  /* 9. 保存与提交 */
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
  html += '<div class="notice">数据保存在当前浏览器，换设备或清理浏览器前请导出备份。「已打卡」只表示提交了记录，不等于全部完成。</div>';
  html += '<div class="notice red">⚠️ '+esc(SAFETY)+'</div>';

  el.innerHTML=html;
  bindToday(el,d,t);
  bindFolds(el);
}

function feelRow(kind,label,emojis,txts,cur,locked){
  return '<div class="feel-row"><div class="feel-label">'+esc(label)+'</div><div class="feel-opts">'
    + emojis.map(function(e,i){
        var on = (hasNum(cur) && parseInt(cur,10)===(i+1)) ? ' on':'';
        return '<div class="feel-emoji'+on+(locked?' locked':'')+'"'+(locked?'':' data-feel="'+kind+'" data-val="'+(i+1)+'"')+' title="'+esc(txts[i])+'">'+e+'</div>';
      }).join('')
    + '</div></div>';
}

/* 三态行动行 */
function actionTri(dateStr,key,label,hint,locked,optional){
  var d=getDay(dateStr), s=triOf(d,key);
  var skipped = d.skipped && d.skipped[key];
  var boxCls='box'+(s==='yes'?' on':(s==='no'?' off':(skipped?' skip':'')));
  var boxTxt=s==='yes'?'✓':(s==='no'?'✕':(skipped?'—':''));
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
  var d=getDay(dateStr), v=d[key];
  var s='<div class="num-state'+(hasNum(v)?' ok':'')+'">'+(hasNum(v)?('已记录 '+esc(v)+' '+unit):'未记录')+'</div>';
  return '<div class="num-row'+(locked?' locked':'')+'">'
    + '<div class="num-head"><div class="num-label">'+esc(label)+'</div><div class="num-input">'
    + '<input type="number"'+(locked?' disabled':'')+' id="q-'+key+'" value="'+esc(v)+'" placeholder="'+esc(ph)+'"><span class="unit">'+esc(unit)+'</span>'
    + '</div></div>'
    + s + quickRowExtra(key,extra,locked) + tipBlock(key,dateStr,locked) + '</div>';
}
function quickRowExtra(key,extra,locked){
  if(locked) return '';
  var map={ 'quick-moxa':['moxa',[['5','＋5分钟'],['10','＋10分钟']]],
            'quick-foot':['foot',[['5','＋5分钟'],['10','＋10分钟']]],
            'quick-water':['water',[['200','＋200毫升'],['300','＋300毫升']]] };
  var cfg=map[extra]; if(!cfg) return '';
  var kind=cfg[0];
  var stack=(undoStack[viewDate]&&undoStack[viewDate][kind])||[];
  return '<div class="chip-row">'
    + cfg[1].map(function(p){ return '<button class="chip" data-add="'+kind+'" data-val="'+p[0]+'">'+p[1]+'</button>'; }).join('')
    + '<button class="chip undo" id="undo-'+kind+'" '+(stack.length?'':'disabled')+'>撤销</button></div>';
}
function tipBlock(key,dateStr,locked){
  var body = TIPS[key] ? '<div class="tip-body">'+esc(TIPS[key])+'</div>' : '';
  if(key==='bodyFood' && DB.settings.type && TYPE_MAP[DB.settings.type]){
    var ty=TYPE_MAP[DB.settings.type];
    body += '<div class="tip-body"><b>你选的体质：'+esc(ty.name)+'</b><br>茶饮 / 食疗：'+esc(ty.tea)+'<br>穴位 / 艾灸：'+esc(ty.point)
      + '<br>红灯：<span style="color:#b91c1c">'+esc(ty.red)+'</span></div>';
  }
  if(!body) return '';
  return '<details class="tips"><summary>查看方法</summary>'+body+'</details>';
}
function numSummary(d){
  var parts=[];
  parts.push('<div class="ns-item'+(hasNum(d.footMin)?' ok':'')+'">泡脚 <b>'+(hasNum(d.footMin)?esc(d.footMin)+' 分钟':'未记录')+'</b></div>');
  parts.push('<div class="ns-item'+(hasNum(d.moxaMin)?' ok':'')+'">艾灸 <b>'+(hasNum(d.moxaMin)?esc(d.moxaMin)+' 分钟':'未记录')+'</b></div>');
  parts.push('<div class="ns-item'+(hasNum(d.waterMl)?' ok':'')+'">饮水 <b>'+(hasNum(d.waterMl)?esc(d.waterMl)+' 毫升':'未记录')+'</b></div>');
  parts.push('<div class="ns-item'+(hasNum(d.tempC)?' ok':'')+'">体温 <b>'+(hasNum(d.tempC)?esc(d.tempC)+' ℃':'未记录')+'</b></div>');
  return parts.join('');
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
  if(submitted) return (isToday?'今日已打卡':'该日已打卡')+(d.submitTime?' · '+d.submitTime:'');
  if(d.draftSavedAt) return '草稿已保存 · '+d.draftSavedAt;
  return '尚未记录';
}

/* 把表单内容写入记录（不含提交标记） */
function collectFields(el,d){
  ['q-moxaMin:moxaMin','q-footMin:footMin','q-waterMl:waterMl','q-tempC:tempC',
   'f-did:did','f-tomorrow:tomorrow','f-note:note'].forEach(function(pair){
    var p=pair.split(':'), f=$('#'+p[0],el);
    if(f) d[p[1]]=f.value;
  });
}
function bindFolds(el){
  $$('details.fold',el).forEach(function(dt){
    dt.addEventListener('toggle', function(){
      if(dt.id==='fold-extra') uiState.extra=dt.open;
      else if(dt.id==='fold-extra2') uiState.more=dt.open;
    });
  });
}
function bindToday(el,d,t){
  var today=todayStr(), future=(t>today);
  function flushDraft(){
    collectFields(el,d);
    d.draftSavedAt=hhmm(new Date());
    var ok=save(); updateSaveLine(el,t); return ok;
  }
  function updateSaveLine(el,t){
    var node=$('#save-status',el); if(!node) return;
    var dd=getDay(t), sub=isSubmitted(dd);
    node.textContent=saveStatusText(dd,sub,t,t===todayStr());
    node.className='save-status '+saveStateClass(dd,sub,t,t===todayStr());
  }
  /* 日期切换 */
  var prev=$('#nav-prev',el), next=$('#nav-next',el), back=$('#nav-back-today',el);
  if(prev) prev.addEventListener('click',function(){ viewDate=addDays(viewDate,-1); editing=false; uiState.feelEdit=false; renderToday(); window.scrollTo(0,0); });
  if(next) next.addEventListener('click',function(){ viewDate=addDays(viewDate,1); editing=false; uiState.feelEdit=false; renderToday(); window.scrollTo(0,0); });
  if(back) back.addEventListener('click',function(){ viewDate=todayStr(); editing=false; uiState.feelEdit=false; renderToday(); window.scrollTo(0,0); });

  if(future) return;

  d = ensureDay(t);

  /* 感受选择 */
  $$('[data-feel]',el).forEach(function(emo){
    emo.addEventListener('click',function(){
      var kind=emo.getAttribute('data-feel'), val=parseInt(emo.getAttribute('data-val'),10);
      d[kind]=val;
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });
  var bs=$('#btn-feel-submit',el);
  if(bs) bs.addEventListener('click',function(){
    if(!(hasNum(d.body)&&hasNum(d.mind))){ toast('身体感受和心情感受都要选一项'); return; }
    d.feelSubmitted=true; uiState.feelEdit=false;
    d.draftSavedAt=hhmm(new Date());
    save(); renderToday(); toast('今日感受已提交 ✓');
  });
  var be=$('#btn-feel-edit',el);
  if(be) be.addEventListener('click',function(){ uiState.feelEdit=true; renderToday(); });

  /* 模式切换 */
  $$('[data-mode]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var m=b.getAttribute('data-mode');
      if(m==='standard') delete d.mode; else d.mode=m;
      save(); renderToday();
    });
  });
  /* 三态勾选 */
  $$('[data-tri]',el).forEach(function(box){
    box.addEventListener('click',function(){
      collectFields(el,d);
      var k=box.getAttribute('data-tri'), cur=triOf(d,k);
      if(d.skipped && d.skipped[k]) delete d.skipped[k];
      if(cur==='unknown') d[k]=true; else if(cur==='yes') d[k]=false; else delete d[k];
      if(d[k]===undefined) delete d[k];
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
      undoStack[t]=undoStack[t]||{water:[],moxa:[],foot:[]};
      var field = kind==='water'?'waterMl':(kind==='moxa'?'moxaMin':'footMin');
      d[field]=String((num(d[field])||0)+val);
      undoStack[t][kind]=(undoStack[t][kind]||[]).concat([val]);
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });
  ['water','moxa','foot'].forEach(function(kind){
    var u=$('#undo-'+kind,el); if(!u) return;
    u.addEventListener('click',function(){
      collectFields(el,d);
      var stack=(undoStack[t]&&undoStack[t][kind])||[];
      if(!stack.length) return;
      var val=stack.pop();
      var field = kind==='water'?'waterMl':(kind==='moxa'?'moxaMin':'footMin');
      var nv=Math.max(0,(num(d[field])||0)-val);
      d[field] = (nv===0 && stack.length===0) ? '' : String(nv);
      undoStack[t][kind]=stack;
      d.draftSavedAt=hhmm(new Date());
      save(); renderToday();
    });
  });
  /* 数值输入自动存草稿 */
  var timer=null;
  $$('#q-moxaMin,#q-footMin,#q-waterMl,#q-tempC,#f-did,#f-tomorrow,#f-note',el).forEach(function(f){
    f.addEventListener('input',function(){
      var node=$('#save-status',el); if(node){ node.textContent='正在保存……'; node.className='save-status'; }
      clearTimeout(timer);
      timer=setTimeout(function(){ if(flushDraft()) syncNumStates(el,d); },600);
    });
  });

  var btnDraft=$('#btn-draft',el);
  if(btnDraft) btnDraft.addEventListener('click',function(){
    if(flushDraft()) toast('草稿已保存 · '+d.draftSavedAt); else toast('保存失败，请重试');
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
    toast(t===today?'已提交打卡数据 ✓':'已保存 ✓');
    window.scrollTo({top:0,behavior:'smooth'});
  });
  var btnEdit=$('#btn-edit',el);
  if(btnEdit) btnEdit.addEventListener('click',function(){
    editing=true; renderToday();
    var c=el.querySelector('.mode-switch'); if(c) c.scrollIntoView({behavior:'smooth',block:'start'});
  });
  /* 就诊提醒：按天关闭（明天会重新弹） */
  var btnCare=$('#btn-dismiss-care',el);
  if(btnCare) btnCare.addEventListener('click',function(){
    DB.settings.dismissedCareAt=todayStr(); save(); renderToday();
  });
  $$('[data-dismiss-backup]',el).forEach(function(b){
    b.addEventListener('click',function(){
      var w=b.getAttribute('data-dismiss-backup');
      DB.settings.dismissedBackup=DB.settings.dismissedBackup||[];
      if(DB.settings.dismissedBackup.indexOf(w)<0) DB.settings.dismissedBackup.push(w);
      save(); renderToday();
    });
  });
  var goReview=$('#go-review',el);
  if(goReview) goReview.addEventListener('click',function(){
    var fd=$('#fold-extra2',el);
    if(fd){
      fd.open=true; uiState.more=true;
      if(typeof fd.scrollIntoView==='function') fd.scrollIntoView({behavior:'smooth',block:'center'});
      var ta=$('#f-note',el);
      if(ta && typeof ta.focus==='function') ta.focus();
    }
  });
  /* Day 28 结构化复盘保存 */
  var btnReview=$('#btn-save-review',el);
  if(btnReview) btnReview.addEventListener('click',function(){
    var signals=[];
    if(DB.baseline.assessment && DB.baseline.assessment.signals){
      signals=DB.baseline.assessment.signals.map(function(s){ return (typeof s==='object')?(s.text||''):String(s); }).filter(Boolean);
    }
    var entries=signals.map(function(s,si){
      var r=el.querySelector('input[name="rr_'+si+'"]:checked');
      var note=el.querySelector('.review-item:nth-of-type('+(si+1)+') .review-note-input');
      return { signalText:s, rating:r?r.value:'', note:note?note.value.trim():'' };
    });
    var nextPlan=($('#review-next-plan',el).value||'').trim();
    var rid='r_'+cycleStart()+'_'+todayStr();
    var idx=dayIndex(todayStr());
    var existingIdx=-1;
    DB.reviews.forEach(function(r,i){ if(r.cycleStart===cycleStart() && r.idx===idx) existingIdx=i; });
    var rev={ id:rid, cycleStart:cycleStart(), reviewDate:todayStr(), idx:idx, entries:entries, nextPlan:nextPlan, completedAt:new Date().toISOString() };
    if(existingIdx>=0) DB.reviews[existingIdx]=rev; else DB.reviews.push(rev);
    save(); renderToday(); toast('复盘已保存');
  });
}
/* 轻量同步数值状态与汇总，避免重绘打断输入 */
function syncNumStates(el,d){
  $$('.num-row',el).forEach(function(row){
    var inp=$('input',row), node=$('.num-state',row);
    if(!inp || !node) return;
    var v=inp.value, unit=(row.querySelector('.unit')||{}).textContent||'';
    node.textContent = hasNum(v) ? ('已记录 '+v+' '+unit) : '未记录';
    node.className = 'num-state'+(hasNum(v)?' ok':'');
  });
  var sum=$('#num-summary',el); if(sum) sum.innerHTML=numSummary(d);
}

/* ============ 趋势报告页 ============ */
function renderTrend(){
  var el=$('#page-trend');
  var tot=cycleTotal();
  var dates=Object.keys(DB.days).filter(function(ds){ var i=dayIndex(ds); return i>=1&&i<=tot; }).sort();

  var footSum=0,footN=0,waterSum=0,waterN=0;
  var temps=[], bodies=[], minds=[];
  dates.forEach(function(ds){
    var d=DB.days[ds];
    if(hasNum(d.footMin)){ footSum+=num(d.footMin); footN++; }
    if(hasNum(d.waterMl)){ waterSum+=num(d.waterMl); waterN++; }
    if(hasNum(d.tempC)) temps.push({x:ds,y:num(d.tempC)});
    if(hasNum(d.body)) bodies.push({x:ds,y:num(d.body)});
    if(hasNum(d.mind)) minds.push({x:ds,y:num(d.mind)});
  });
  var avgTemp = temps.length ? (temps.reduce(function(a,p){return a+p.y;},0)/temps.length) : null;
  var bt = num(DB.baseline.tempBase.value);
  var tDelta = (temps.length && bt!=null) ? (avgTemp-bt) : null;

  var html='';
  html += '<div class="stat-grid">'
    + statCell(weekSubmittedDays(currentWeek()),'本周已打卡 天','第 '+currentWeek()+' 周')
    + statCell(submittedDates().length,'累计已打卡 天','提交记录的唯一天数')
    + statCell(streak(),'连续打卡 天','次要指标')
    + statCell(modeFullDays(),'当日模式目标完成天','见下方统计口径')
    + statCell(waterN?Math.round(waterSum/waterN):'记录积累中','日均饮水 毫升',waterN?('基于 '+waterN+' 天'):'暂无记录')
    + statCell(temps.length?avgTemp.toFixed(2):'记录积累中','平均基础体温 ℃',temps.length?('基于 '+temps.length+' 天'):'暂无记录')
    + statCell(footN?(footSum/footN).toFixed(0):'记录积累中','平均泡脚 分钟',footN?('基于 '+footN+' 天'):'暂无记录')
    + statCell(tDelta!=null?((tDelta>0?'+':'')+tDelta.toFixed(2)):'记录积累中','较基线体温 ℃',(bt!=null&&tDelta!=null)?('基线 '+bt+' ℃'):'待填基线')
    + '</div>';

  html += '<div class="notice" style="margin-bottom:12px">统计口径：<b>「已打卡」只表示提交了记录，不等于全部行动完成。</b>'
    + '数字类项目（艾灸／泡脚／饮水／体温）以实际数值计入，不自动判断达标；未记录的项目不按 0 计算。'
    + '标准版与极简版分别统计，不混用同一个完成率。'
    + '「当日模式目标完成天」＝当天所选模式的各项都达到完成或已记录的天数。</div>';

  html += '<div class="dg">';

  /* 基础体温趋势 */
  html += '<div class="card"><div class="card-title">基础体温趋势 <span class="sub">只统计每日记录，基线单独列出</span></div>';
  if(temps.length<2){ html += '<div class="empty">记录积累中：至少两次晨起体温后显示趋势</div>'; }
  else { html += '<canvas class="chart" id="ch-temp"></canvas>'; }
  html += '<div class="chart-note">基线 '+(DB.baseline.tempBase.value?esc(DB.baseline.tempBase.value)+' ℃':'—')+' · '+esc(baseMeta(DB.baseline.tempBase))+'（基线不计入趋势样本）</div>'
    + '<div class="chart-note">仅按数值呈现，不判断排卵或黄体功能；体温受睡眠、测量时间影响，单点波动不必紧张。</div></div>';

  /* 感受趋势 */
  html += '<div class="card"><div class="card-title">感受趋势 <span class="sub">身体 / 心情分开画，1–5 分</span></div>';
  if(bodies.length<2 && minds.length<2){ html += '<div class="empty">记录积累中：至少两次感受记录后显示趋势</div>'; }
  else {
    html += '<canvas class="chart" id="ch-feel"></canvas>';
    html += '<div class="legend">'
      + '<span><i style="background:#ff6b35"></i>身体感受（'+bodies.length+'）</span>'
      + '<span><i style="background:#3b82f6"></i>心情感受（'+minds.length+'）</span></div>';
  }
  html += '<div class="chart-note">1 = 很难受 / 低落，5 = 很舒服 / 愉快；按天数记录呈现，不做医学判断。</div></div>';
  html += '</div>';

  html += '<div class="dg">';

  /* 阶段执行情况 */
  html += '<div class="card"><div class="card-title">阶段执行情况 <span class="sub">6 个阶段分别统计</span></div>';
  PHASES.forEach(function(ph){
    var days=[], i;
    for(i=1;i<=tot;i++){ var q=phaseOf(i); if(q && q.key===ph.key) days.push(i); }
    if(!days.length) return;
    var done=days.filter(function(i2){ return isSubmitted(DB.days[dateOfIdx(i2)]); }).length;
    var rec=days.filter(function(i2){ return dayHasContent(DB.days[dateOfIdx(i2)]); }).length;
    html += '<div class="ms-row"><span class="ms-name">'+ph.emoji+' '+esc(ph.name)+' · Day '+days[0]+'–'+days[days.length-1]+'</span>'
      + '<span class="ms-val num">已打卡 '+done+' / 记录 '+rec+' / 共 '+days.length+' 天</span></div>';
  });
  html += '<div class="chart-note">按下限统计，未记录的日期不补成 0。</div></div>';

  /* 每周执行情况 */
  var weeks=Math.ceil(tot/7);
  html += '<div class="card"><div class="card-title">每周执行情况 <span class="sub">第 1～'+weeks+' 周全覆盖</span></div>';
  for(var w=1;w<=weeks;w++){ html += weekBlock(w); }
  html += '<div class="chart-note">颜色：深色=已打卡，浅色=已有草稿，虚线=未记录。</div></div>';
  html += '</div>';

  /* 历次复盘对比（折叠） */
  var sortedReviews = DB.reviews.slice().sort(function(a,b){ return (b.reviewDate||'').localeCompare(a.reviewDate||''); });
  if(sortedReviews.length){
    html += '<details class="fold card"><summary>历次复盘对比 <span class="fold-sub">'+sortedReviews.length+' 次</span></summary><div class="fold-body">';
    sortedReviews.forEach(function(r){
      html += '<div class="rv-entry"><div class="rv-head">Day '+r.idx+' · '+esc(r.reviewDate)+' · 周期起点 '+esc(r.cycleStart)+'</div>';
      if(r.entries && r.entries.length){
        html += '<table class="rv-table"><tr><th>测评信号</th><th>评价</th><th>备注</th></tr>';
        r.entries.forEach(function(e){
          var rmap={better:'🟢 有改善',same:'⚪ 没变化',worse:'🔴 加重了',na:'❓ 没测'};
          html += '<tr><td>'+esc(e.signalText)+'</td><td>'+esc(rmap[e.rating]||'—')+'</td><td>'+esc(e.note||'—')+'</td></tr>';
        });
        html += '</table>';
      }
      if(r.nextPlan) html += '<div class="rv-plan"><b>下周期计划：</b>'+esc(r.nextPlan)+'</div>';
      html += '</div>';
    });
    html += '</div></details>';
  }

  html += '<div class="notice">28 天看三件事：<b>习惯能不能坚持、身体和心情感受有没有改善、体温与非经期状态如何</b>——不要求每天数字都变好。数据不足时显示「记录积累中」，不自动生成健康结论。</div>';

  el.innerHTML=html;

  if($('#ch-temp',el)) drawLine($('#ch-temp',el),[ {points:temps,color:'#ff6b35'} ],'℃');
  if($('#ch-feel',el)){
    var series=[];
    if(bodies.length) series.push({points:bodies,color:'#ff6b35'});
    if(minds.length)  series.push({points:minds,color:'#3b82f6'});
    drawLine($('#ch-feel',el),series,'分');
  }
  bindWeeks(el);
}
function baseMeta(o){
  o=o||{};
  var src=o.source?o.source:'待补充';
  var dt=o.date?o.date:'测量日期待确认';
  return src+' · '+dt;
}
function statCell(v,k,sub,warn){
  return '<div class="stat-cell"><div class="v'+(warn?' warn':'')+'">'+v+'</div><div class="k">'+esc(k)+'</div>'
    + (sub?'<div class="k2">'+esc(sub)+'</div>':'')+'</div>';
}
function weekBlock(w){
  var rg=weekRange(w), tot=cycleTotal();
  var days=[];
  for(var i=(w-1)*7;i<Math.min(w*7,tot);i++){
    var ds=dateOfIdx(i+1);
    days.push({ds:ds, rec:DB.days[ds], idx:i+1});
  }
  var recorded=days.filter(function(x){ return dayHasContent(x.rec); });
  var submitted=days.filter(function(x){ return isSubmitted(x.rec); });
  var std=recorded.filter(function(x){ return (x.rec.mode||'standard')==='standard'; });
  var busy=recorded.filter(function(x){ return x.rec.mode==='busy'; });
  var waterSum=0,waterN=0,tempSum=0,tempN=0;
  recorded.forEach(function(x){
    if(hasNum(x.rec.waterMl)){ waterSum+=num(x.rec.waterMl); waterN++; }
    if(hasNum(x.rec.tempC)){ tempSum+=num(x.rec.tempC); tempN++; }
  });
  var html='<div class="week-block"><div class="week-head"><b>第 '+w+' 周</b> <span>'+dateLabel(rg[0])+'–'+dateLabel(rg[1])+'</span></div>';
  html += '<div class="week-days">';
  days.forEach(function(x){
    var st = isSubmitted(x.rec)?'done':(dayHasContent(x.rec)?'draft':'empty');
    var tip = st==='done'?'已打卡':(st==='draft'?'已有草稿':'未记录');
    html += '<div class="wday '+st+'" title="Day '+x.idx+'｜'+dateLabel(x.ds)+'：'+tip+'"><span>'+x.idx+'</span><i>'+dateLabel(x.ds)+'</i></div>';
  });
  html += '</div>';
  html += '<div class="week-metrics">'
    + '<div class="wm"><b>'+recorded.length+'/'+days.length+'</b><span>记录天数</span></div>'
    + '<div class="wm"><b>'+submitted.length+'</b><span>已打卡天数</span></div>'
    + '<div class="wm"><b>'+std.length+' / '+busy.length+'</b><span>标准版 / 极简版</span></div>'
    + '</div>';
  html += '<div class="week-metrics">'
    + '<div class="wm"><b>'+(waterN?Math.round(waterSum/waterN)+' 毫升':'—')+'</b><span>已记录日平均饮水'+(waterN?(' · 基于 '+waterN+' 天'):'')+'</span></div>'
    + '<div class="wm"><b>'+(tempN?(tempSum/tempN).toFixed(2)+' ℃':'—')+'</b><span>已记录日平均体温'+(tempN?(' · 基于 '+tempN+' 天'):'')+'</span></div>'
    + '</div>';
  html += '<div class="mode-cols">'+modeStatCol('标准版',std,STD_KEYS)+modeStatCol('极简版',busy,BUSY_KEYS)+'</div>';
  html += '<div class="field week-adjust"><label>下周调整（一句话）</label>'
    + '<input type="text" data-week-adjust="'+w+'" value="'+esc((DB.weeks[w]&&DB.weeks[w].adjust)||'')+'" placeholder="例如：把晚饭后的泡脚固定成 15 分钟">'
    + '</div></div>';
  return html;
}
function modeStatCol(title,list,keys){
  var html='<div class="mode-col"><div class="mode-col-title">'+title+' <span>'+list.length+' 天</span></div>';
  if(list.length===0){ html += '<div class="mode-empty">该周没有'+title+'记录</div></div>'; return html; }
  keys.forEach(function(k){
    var it=ITEM_MAP[k]; if(!it) return;
    var counts={yes:0,no:0,unknown:0,skip:0,rec:0}, sum=0, n=0;
    list.forEach(function(x){
      var d=x.rec;
      if(d.skipped && d.skipped[k]){ counts.skip++; return; }
      if(it.type==='num'){ if(hasNum(d[k])){ counts.rec++; n++; sum+=num(d[k]); } else counts.unknown++; }
      else { var s=triOf(d,k); if(s==='yes') counts.yes++; else if(s==='no') counts.no++; else counts.unknown++; }
    });
    if(it.type==='num'){
      var detail='已记录 '+counts.rec+' 天'+(n>1?(' · 平均 '+(sum/n).toFixed(1)+' '+it.unit):(n===1?(' · 共 '+sum+' '+it.unit):''))
        + (counts.unknown?' · 未记录 '+counts.unknown+' 天':'');
      html += '<div class="ms-row"><span class="ms-name">'+esc(it.name)+'</span><span class="ms-val num">'+detail+'</span></div>';
    } else {
      var parts=[];
      if(counts.yes) parts.push('完成 '+counts.yes);
      if(counts.no) parts.push('未完成 '+counts.no);
      if(counts.unknown) parts.push('未记录 '+counts.unknown);
      if(counts.skip) parts.push('跳过 '+counts.skip);
      html += '<div class="ms-row"><span class="ms-name">'+esc(it.name)+'</span><span class="ms-val">'+(parts.join(' · ')||'—')+'</span></div>';
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
function drawLine(canvas, series, unit){
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
  ctx.strokeStyle='#eee7e3'; ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.lineWidth=1;
  for(var g=0;g<=3;g++){
    var v=min+(max-min)*g/3, y=Y(v);
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillText(v.toFixed(1),4,y+3);
  }
  series.forEach(function(s){
    if(!s.points.length) return;
    ctx.strokeStyle=s.color; ctx.lineWidth=2; ctx.beginPath();
    s.points.forEach(function(p,i){
      var xi=X(xs.indexOf(p.x)), yi=Y(p.y);
      if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi);
    });
    ctx.stroke();
    ctx.fillStyle=s.color;
    s.points.forEach(function(p){ ctx.beginPath(); ctx.arc(X(xs.indexOf(p.x)),Y(p.y),3,0,Math.PI*2); ctx.fill(); });
    var last=s.points[s.points.length-1];
    ctx.font='10px sans-serif';
    ctx.fillText(last.y, Math.min(X(xs.indexOf(last.x))+6, W-32), Y(last.y)-4);
  });
  ctx.fillStyle='#9ca3af'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  var step=Math.max(1,Math.ceil(n/6));
  for(var i=0;i<n;i+=step){ ctx.fillText(dateLabel(xs[i]), X(i), H-8); }
  ctx.textAlign='left';
}

/* ============ 28 天计划页 ============ */
function renderPlan(){
  var el=$('#page-plan'); if(!el) return;
  var tot=cycleTotal(), todayIdx=dayIndex(todayStr()), html='';
  html += '<div class="card"><div class="card-title">本周期概览 <span class="sub">周期长度 '+tot+' 天 · 今天 Day '+todayIdx+'</span></div>'
    + '<div class="chart-note" style="text-align:left">今天 Day '+todayIdx+' · 当前阶段：'+(phaseOf(todayIdx)?phaseOf(todayIdx).name:'—')+'</div>'
    + '<div class="chart-note" style="text-align:left">调整周期起点或长度 → 「计划设置」Tab</div></div>';

  html += '<div class="dg">';

  /* 28 天阶段时间线（完整可视化） */
  html += '<div class="card">'
    + '<div class="card-title">28 天阶段时间线 <span class="sub">共 '+tot+' 天 · 6 个阶段</span></div>'
    + '<div class="cycle-timeline-wrap"><div class="cycle-timeline">';
  var lastKey=null;
  for(var i=1;i<=tot;i++){
    var ph=phaseOf(i); if(!ph) continue;
    if(ph.key!==lastKey){
      var ds=[], k;
      for(k=1;k<=tot;k++){ var q=phaseOf(k); if(q&&q.key===ph.key) ds.push(k); }
      var rg=[dateLabel(dateOfIdx(ds[0])), dateLabel(dateOfIdx(ds[ds.length-1]))];
      var isCur=(todayIdx>=ds[0]&&todayIdx<=ds[ds.length-1]);
      html += '<div class="cycle-stage'+(isCur?' cur':'')+'">'
        + '<div class="cycle-stage-node">'
          + '<div class="cycle-node-dot '+ph.key+'">'+ph.emoji+'</div>'
          + '<div class="cycle-node-label">Day '+ds[0]+'–'+ds[ds.length-1]+'</div>'
          + '<div class="cycle-node-date">'+rg[0]+' – '+rg[1]+'</div>'
        + '</div>'
        + '<div class="cycle-stage-card">'
          + '<div class="cycle-stage-header">'
            + '<span class="cycle-stage-days">Day '+ds[0]+'–'+ds[ds.length-1]+'</span>'
            + '<span class="cycle-stage-title">'+esc(ph.name)+(isCur?' <span class="cycle-stage-cur">（当前）</span>':'')+'</span>'
          + '</div>'
          + '<div class="cycle-stage-desc">'+ph.focus+'</div>'
          + '<div class="cycle-scenarios">'
          +   (ph.scenarios||[]).map(function(s){
                return '<div class="cycle-scenario-row">'
                  + '<span class="csr-time">'+esc(s.time)+'<br><span class="csr-time-range">'+esc(s.timeRange||'')+'</span></span>'
                  + '<span class="csr-scene">'+esc(s.scene||'')+'</span>'
                  + '<span class="csr-text">'+esc(s.text)+'</span></div>';
              }).join('')
          + '</div>'
          + (ph.note?'<div class="cycle-stage-note">💡 '+esc(ph.note)+'</div>':'')
        + '</div></div>';
      lastKey=ph.key;
    }
  }
  html += '</div></div></div>';

  /* 28 天逐日清单：每天一行，点击可跳到该日查看／补记 */
  html += '<div class="card">'
    + '<div class="card-title">28 天逐日清单 <span class="sub">共 '+tot+' 天 · 点击任意一天可查看或补记</span></div>'
    + '<div class="drawer-note">状态说明：已打卡＝提交了记录；草稿＝填过但未提交；待记录＝还没填；未开始＝日期未到。</div>'
    + '<div class="day-list">';
  for(var di=1;di<=tot;di++){
    var dph=phaseOf(di), dds=dateOfIdx(di), drec=DB.days[dds];
    var dstate = dds>todayStr() ? 'future' : (isSubmitted(drec)?'done':(dayHasContent(drec)?'draft':'todo'));
    var dstateTxt = {done:'已打卡',draft:'草稿',todo:'待记录',future:'未开始'}[dstate];
    var isTd = (di===todayIdx);
    html += '<div class="day-item '+(isTd?'today ':'')+dstate+'" data-goto-date="'+dds+'">'
      + '<div class="di-top">'
        + '<span class="di-idx">Day '+di+'</span>'
        + '<span class="di-phase">'+dph.emoji+' '+esc(dph.name)+'</span>'
        + '<span class="di-date">'+dateLabel(dds)+'</span>'
        + '<span class="chip-state s-'+dstate+'">'+dstateTxt+'</span>'
      + '</div>'
      + '<div class="di-task">'+esc(dailyOfIdx(di))+'</div>'
    + '</div>';
  }
  html += '</div></div>';
  html += '</div>';

  el.innerHTML=html;
  /* 逐日清单：点击跳到该日 */
  $$('[data-goto-date]',el).forEach(function(item){
    item.addEventListener('click',function(){
      viewDate=item.getAttribute('data-goto-date');
      editing=false;
      var tb=document.querySelector('.tab[data-tab="today"]');
      if(tb) tb.click();
      renderToday();
    });
  });
}

/* ============ 计划设置页 ============ */
function renderSetting(){
  var el=$('#page-setting');
  var s=DB.settings, b=DB.baseline, html='';
  var tot=cycleTotal();

  html += '<div class="dg">';

  /* 周期配置 */
  html += '<div class="card"><div class="card-title">周期配置 <span class="sub">Day 1 ＝ 月经第一天</span></div>'
    + '<div class="field-row">'
    + '<div class="field"><label>本次月经第一天（Day 1）</label><input type="date" id="s-cycle-start" value="'+esc(s.cycleStart)+'"></div>'
    + '<div class="field"><label>周期长度（天）</label><input type="number" min="21" max="35" id="s-cycle-len" value="'+esc(s.cycleLen)+'"></div>'
    + '</div>'
    + '<div class="chart-note" style="text-align:left">周期长短会变（21–35 天都正常）。两条锚点不变：以月经第一天为 Day 1 往后数；「防火周」永远从预计下次月经日往前倒推 7 天。</div>'
    + '<div class="base-cur">当前周期：'+cycleLabel()+'（共 '+cycleTotal()+' 天）· '+(function(){ var i=dayIndex(todayStr()), p=phaseOf(i); return p?('今天 Day '+i+' · '+p.name):(i<1?'今天在本周期之前':'本周期已结束'); })()+'</div>'
    + '<button class="btn secondary small" id="btn-save-cycle" style="margin-top:10px">保存周期</button></div>';

  /* 体质选择 */
  var cur = s.type ? TYPE_MAP[s.type] : null;
  html += '<div class="card"><div class="card-title">我的体质类型 <span class="sub">6 选 1，用于个性化提示</span></div>';
  html += '<div class="type-grid">'+TYPES.map(function(t){
    return '<div class="type-card'+(s.type===t.key?' on':'')+'" data-type="'+t.key+'">'
      + '<div class="t-emoji">'+t.emoji+'</div><div class="t-name">'+esc(t.name)+'</div>'
      + '<div class="t-desc">'+esc(t.desc)+'</div></div>';
  }).join('')+'</div>';
  if(cur){
    html += '<div class="type-detail">'
      + '<div class="td-row"><b>穴位 / 艾灸：</b>'+esc(cur.point)+'</div>'
      + '<div class="td-row"><b>茶饮 / 食疗：</b>'+esc(cur.tea)+'</div>'
      + '<div class="td-row"><b>运动建议：</b>'+esc(cur.sport)+'</div>'
      + '<div class="td-row td-red"><b>红灯禁忌：</b>'+esc(cur.red)+'</div>'
      + '</div>';
  } else {
    html += '<div class="chart-note" style="text-align:left;margin-top:10px">还没选体质。可以先用「身体状态测评」的结果，选最接近的一项。</div>';
  }
  html += '<div class="chart-note" style="text-align:left;margin-top:10px">它反映当前身体反应，不代表疾病原因或永久体质。闷热潮湿型必须注意「减少温热刺激」。</div></div>';
  html += '</div>';

  /* 基线信息 */
  html += '<div class="card"><div class="card-title">基线信息 <span class="sub">与每日记录分开，不重复计入趋势样本</span></div>';
  html += '<div class="base-block"><div class="base-name">基础体温基线</div>'
    + '<div class="field-row">'
    + '<div class="field input-suffix"><label>数值</label><input type="number" step="0.1" id="s-temp-val" value="'+esc(b.tempBase.value)+'" placeholder="例如 36.5"><span class="suffix">℃</span></div>'
    + '<div class="field"><label>测量日期</label><input type="date" id="s-temp-date" value="'+esc(b.tempBase.date||'')+'"></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><label>来源 / 测量方式</label><input type="text" id="s-temp-src" value="'+esc(b.tempBase.source)+'" placeholder="如：晨起口腔体温计"></div>'
    + '<div class="field"><label>备注（可选）</label><input type="text" id="s-temp-note" value="'+esc(b.tempBase.note)+'" placeholder="可留空"></div>'
    + '</div></div>';

  /* 身体状态测评基线（从前一个测评结果导入） */
  var as=b.assessment;
  html += '<div class="base-block assess-block"><div class="base-name">身体状态测评基线 <span class="base-sub">来自《身体状态测评》结果</span></div>';
  if(as){
    html += '<div class="assess-meta">测评时间：'+esc(as.assessTime||'—')+(as.importedAt?(' · 导入于 '+esc(as.importedAt)):'')+'</div>'
      + '<div class="assess-type"><span class="assess-badge">'+esc(as.primaryName||'—')+'</span>'
      + (as.similarity?('<span class="assess-sim">'+esc(as.similarity)+'</span>'):'')+'</div>'
      + (as.secondary?('<div class="assess-meta">次要倾向：'+esc(as.secondary)+'</div>'):'')
      + (as.safetyLevel?('<div class="assess-meta">安全级别：'+esc(as.safetyLevel)+'</div>'):'')
      + (as.signals&&as.signals.length
          ? ('<div class="assess-sig-title">测评中识别到的问题（供后续调养参考）</div>'
             + '<div class="assess-sig-list">'
             + as.signals.map(function(s,idx){
                 var txt=(typeof s==='string')?s:(s.text||'');
                 var sc=(typeof s==='object')?(!!s.seekCare):false;
                 return '<label class="assess-sig-row"><input type="checkbox" data-sig-seek="'+idx+'"'+(sc?' checked':'')+'><span>'+esc(txt)+'</span><span class="sig-seek-lbl">建议就医关注</span></label>';
               }).join('')
             + '</div>')
          : '')
      + '<div class="btn-row" style="margin-top:10px">'
      + '<button class="btn secondary small" data-act="assess-download">下载基线文档</button>'
      + '<button class="btn ghost small" data-act="assess-clear">清除</button>'
      + '</div>';
  } else {
    html += '<div class="assess-empty">还没有导入测评结果。完成《身体状态测评》后，在结果页点「复制结果码」，粘贴到下面，测评时间和识别到的问题会保存为你的基线参考。</div>'
      + '<details class="fold" id="fold-assess"><summary>从测评结果导入</summary><div class="fold-body">'
      + '<div class="field"><textarea id="s-assess-paste" rows="7" placeholder="粘贴测评结果码（W28-ASSESS-V1 开头）"></textarea></div>'
      + '<button class="btn secondary small" id="btn-assess-import">导入测评基线</button>'
      + '<div class="chart-note" style="text-align:left">导入后：测评类型会自动同步到上面的「我的体质类型」，识别到的问题会存为基线参考，可随时下载或清除。</div>'
      + '</div></details>';
  }
  html += '</div>';
  html += '<div class="field-row">'
    + '<div class="field"><label>目标起床时间</label><input type="time" id="s-wake" value="'+esc(b.wakeTime)+'"></div>'
    + '<div class="field"><label>目标上床时间</label><input type="time" id="s-bed" value="'+esc(b.bedTime)+'"></div>'
    + '</div>'
    + '<div class="chart-note" style="text-align:left">目标时间只是参考，不会自动填成某一天的实际记录。</div>'
    + '<button class="btn secondary small" id="btn-save-base">保存基线</button></div>';

  html += '<div class="dg">';

  /* 备选池（折叠） */
  html += '<details class="fold card"><summary>备选池 <span class="fold-sub">自选增减 · 默认全关</span></summary>';
  html += '<div class="chart-note" style="text-align:left;margin-top:0">自选增减，默认全关。<b>每周最多新增 1 项</b>，养成本能再换。</div>';
  POOL.forEach(function(cat, ci){
    html += '<div class="pool-cat">'+cat.cat+'</div>';
    cat.items.forEach(function(txt, ii){
      var key=ci+'-'+ii, on=!!DB.settings.pool[key];
      html += '<div class="pool-item'+(on?' on':'')+'" data-pool="'+key+'"><div class="p-box">'+(on?'✓':'')+'</div><span>'+esc(txt)+'</span></div>';
    });
  });
  var poolCount=Object.keys(DB.settings.pool).length;
  html += '<div class="pool-hint">已勾选 '+poolCount+' 项 · 每周最多新增 1 项，本周期节奏不受影响</div></details>';

  /* 数据管理 */
  html += '<div class="card"><div class="card-title">数据管理 <span class="sub">最近备份：'+esc(s.lastExportAt||'尚未备份')+'</span></div>'
    + '<div class="setting-row"><div>导出 JSON<div class="desc">完整保存每日记录、体质与设置</div></div><button class="btn ghost small" id="btn-exp-json">导出</button></div>'
    + '<div class="setting-row"><div>导出 CSV<div class="desc">表头标明字段与单位，可用 Excel 打开</div></div><button class="btn ghost small" id="btn-exp-csv">导出</button></div>'
    + '<div class="setting-row"><div>导入备份<div class="desc">导入前会显示备份信息，可选择合并或替换</div></div><button class="btn ghost small" id="btn-import">导入</button></div>'
    + '<input type="file" id="file-import" accept=".json" style="display:none">'
    + '<div class="setting-row"><div>清空全部数据<div class="desc">不可恢复，需要二次确认，请先导出备份</div></div><button class="btn danger small" id="btn-clear">清空</button></div>'
    + '</div>';
  html += '</div>';

  /* 说明 */
  html += '<div class="card"><div class="card-title">说明</div>'
    + '<div class="tip-body" style="font-size:.82rem;color:var(--text-2);line-height:1.8">'
    + '· 本周期：'+esc(cycleLabel())+'（共 '+tot+' 天）<br>'
    + '· 数据仅保存在本机浏览器，换设备前请先导出备份<br>'
    + '· 空值代表「未记录」，不会被当成 0 或未完成<br>'
    + '· 「已打卡」只表示提交了记录，不等于全部行动完成<br>'
    + '· 基础体温基线单独存，不计入趋势样本<br>'
    + '· 穴位按揉、艾灸、泡脚仅作辅助放松，不作为治疗手段<br>'
    + '· 闷热潮湿型以「减少温热刺激」为原则，不灸<br>'
    + '· 漏掉的不用补做；当天已经做过但忘记记录的，可以补记'
    + '</div></div>';
  html += '<div class="notice red">⚠️ '+esc(SAFETY)+'</div>';

  el.innerHTML=html;

  /* 逐日清单：点击跳到该日 */
  $$('[data-goto-date]',el).forEach(function(item){
    item.addEventListener('click',function(){
      viewDate=item.getAttribute('data-goto-date');
      editing=false;
      var tb=document.querySelector('.tab[data-tab="today"]');
      if(tb) tb.click();
      renderToday();
    });
  });

  $('#btn-save-cycle',el).addEventListener('click',function(){
    var ds=$('#s-cycle-start',el).value, ln=parseInt($('#s-cycle-len',el).value,10);
    if(!ds){ toast('请选择月经第一天'); return; }
    if(!(ln>=21&&ln<=35)){ toast('周期长度请填 21–35 之间'); return; }
    s.cycleStart=ds; s.cycleLen=ln;
    save(); renderAll(); toast('周期已保存');
  });
  $$('[data-type]',el).forEach(function(c){
    c.addEventListener('click',function(){
      var k=c.getAttribute('data-type');
      s.type = (s.type===k) ? '' : k;
      save(); renderSetting(); renderToday();
      toast(s.type?('已选：'+TYPE_MAP[s.type].name):'已取消体质选择');
    });
  });
  /* 身体状态测评基线：导入 / 下载 / 清除 */
  var bi=$('#btn-assess-import',el);
  if(bi) bi.addEventListener('click',function(){
    var raw=($('#s-assess-paste',el).value||'').trim();
    if(!raw){ toast('请先粘贴测评结果码'); return; }
    var parsed=parseAssessCode(raw);
    if(!parsed){ toast('未能识别结果码，请回测评页点「复制结果码」后重新粘贴'); return; }
    b.assessment=parsed;
    var mapped=ASSESS_KEY_MAP[parsed.primaryKey];
    var tObj=null;
    if(mapped){ s.type=mapped; TYPES.forEach(function(x){ if(x.key===mapped) tObj=x; }); }
    save(); renderAll();
    toast(mapped?('已导入，体质类型已同步为「'+tObj.name+'」'):'已导入测评基线，请手动选择最接近的体质类型');
  });
  /* 测评基线：每个 signal 的「建议就医」checkbox */
  $$('[data-sig-seek]',el).forEach(function(cb){
    cb.addEventListener('change',function(){
      var idx=parseInt(cb.getAttribute('data-sig-seek'),10);
      if(b.assessment && b.assessment.signals[idx]){
        b.assessment.signals[idx].seekCare=cb.checked;
        save();
      }
    });
  });
  $$('[data-act="assess-clear"]',el).forEach(function(btn){
    btn.addEventListener('click',function(){
      if(!confirm('确定清除已导入的测评基线？')) return;
      b.assessment=null; save(); renderSetting(); toast('已清除');
    });
  });
  $$('[data-act="assess-download"]',el).forEach(function(btn){
    btn.addEventListener('click',function(){
      var txt=buildAssessDoc(); if(!txt) return;
      downloadText('测评基线_'+todayStr()+'.txt', txt);
    });
  });

  $('#btn-save-base',el).addEventListener('click',function(){
    b.tempBase.value=$('#s-temp-val',el).value;
    b.tempBase.date=$('#s-temp-date',el).value||null;
    b.tempBase.source=$('#s-temp-src',el).value;
    b.tempBase.note=$('#s-temp-note',el).value;
    b.wakeTime=$('#s-wake',el).value;
    b.bedTime=$('#s-bed',el).value;
    save(); renderAll(); toast('基线已保存');
  });
  $$('[data-pool]',el).forEach(function(row){
    row.addEventListener('click',function(){
      var key=row.getAttribute('data-pool');
      if(DB.settings.pool[key]){ delete DB.settings.pool[key]; }
      else {
        var wk=curWeekKey();
        var added=Object.keys(DB.settings.pool).filter(function(k2){ return DB.settings.pool[k2]===wk; }).length;
        if(added>=1){ toast('每周最多新增 1 项，本周已经新增过了'); return; }
        DB.settings.pool[key]=wk;
      }
      save(); renderSetting(); toast('已更新备选池');
    });
  });
  $('#btn-exp-json',el).addEventListener('click',function(){
    s.lastExportAt=new Date().toLocaleString('zh-CN'); save();
    var payload=JSON.parse(JSON.stringify(DB));
    payload.exportedAt=new Date().toISOString(); payload.app='women28';
    download('women28-backup-'+todayStr()+'.json', JSON.stringify(payload,null,2),'application/json');
    renderSetting(); toast('已导出备份');
  });
  $('#btn-exp-csv',el).addEventListener('click',function(){
    s.lastExportAt=new Date().toLocaleString('zh-CN'); save();
    download('women28-'+todayStr()+'.csv', toCSV(), 'text/csv;charset=utf-8');
    renderSetting(); toast('已导出 CSV');
  });
  $('#btn-import',el).addEventListener('click',function(){ $('#file-import',el).click(); });
  $('#file-import',el).addEventListener('change',function(e){
    var f=e.target.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){
      var obj=null;
      try{ obj=JSON.parse(rd.result); }catch(err){ obj=null; }
      if(!obj || typeof obj!=='object' || !obj.days || !obj.baseline){ toast('文件格式不正确，原有数据已保留'); e.target.value=''; return; }
      openImportDialog(obj); e.target.value='';
    };
    rd.onerror=function(){ toast('读取失败，原有数据已保留'); };
    rd.readAsText(f);
  });
  $('#btn-clear',el).addEventListener('click',function(){ openClearDialog(); });
}
/* 本年度周序号（用于备选池「每周最多新增 1 项」） */
function curWeekKey(){
  var d=new Date(); d.setHours(0,0,0,0);
  var y=d.getFullYear(), start=new Date(y,0,1);
  var n=Math.floor((d-start)/86400000/7)+1;
  return y+'-W'+n;
}

/* ============ 导入 / 清空 / 弹窗 ============ */
function openImportDialog(obj){
  var tot=cycleTotal();
  var dates=Object.keys(obj.days||{}).filter(function(ds){ var i=dayIndex(ds); return i>=1 && i<=tot; });
  var conflicts=dates.filter(function(ds){ return dayHasContent(DB.days[ds]); });
  var backupAt = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('zh-CN') : '未标注';
  var body='<div class="modal-line"><b>备份生成时间：</b>'+esc(backupAt)+'</div>'
    + '<div class="modal-line"><b>备份内周期记录：</b>'+dates.length+' 天</div>'
    + '<div class="modal-line"><b>与本机冲突的记录：</b>'+conflicts.length+' 天</div>'
    + '<div class="modal-note">冲突不会静默覆盖，请选择处理方式。</div>'
    + (conflicts.length? '<div class="modal-line"><label class="radio"><input type="radio" name="conflict" value="keep" checked> 冲突保留本机记录</label>'
        + '<label class="radio"><input type="radio" name="conflict" value="use"> 冲突使用备份记录</label></div>' : '')
    + '<div class="modal-note">导入失败时本地数据不会被改动。</div>';
  showModal({
    title:'导入备份', body:body,
    buttons:[
      {label:'取消',cls:'ghost',onClick:closeModal},
      {label:'合并导入',cls:'secondary',onClick:function(){
        var r=document.querySelector('input[name="conflict"]:checked');
        doImport(obj,'merge', !!(r && r.value==='use'));
      }},
      {label:'替换全部',cls:'',onClick:function(){ doImport(obj,'replace',true); }}
    ]
  });
}
function doImport(obj,mode,useBackup){
  try{
    var incoming=migrate(JSON.parse(JSON.stringify(obj)));
    if(mode==='replace'){
      DB=incoming;
    } else {
      Object.keys(incoming.days).forEach(function(ds){
        if(!dayHasContent(DB.days[ds]) || useBackup) DB.days[ds]=incoming.days[ds];
      });
      if(useBackup){ DB.baseline=incoming.baseline; DB.settings.type=incoming.settings.type; }
      Object.keys(incoming.weeks||{}).forEach(function(w){ DB.weeks[w]=incoming.weeks[w]; });
    }
    DB.settings.lastImportAt=new Date().toLocaleString('zh-CN');
    if(!save()) throw new Error('save failed');
    closeModal(); renderAll(); toast(mode==='replace'?'已替换导入':'已合并导入');
  }catch(e){ closeModal(); toast('导入失败，原有数据已保留'); }
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
        showModal({ title:'再次确认', body:'<div class="modal-line">确定要清空<b>全部</b>打卡数据吗？</div>',
          buttons:[
            {label:'取消',cls:'ghost',onClick:closeModal},
            {label:'确认清空',cls:'danger',onClick:function(){
              try{ localStorage.removeItem(LS_KEY); }catch(e){}
              DB=blankDB(); closeModal(); viewDate=todayStr(); renderAll(); toast('已清空');
            }}
          ]});
      }}
    ]
  });
}
function showModal(opts){
  closeModal();
  var mask=document.createElement('div');
  mask.className='modal-mask'; mask.id='modal';
  mask.innerHTML='<div class="modal"><div class="modal-title">'+esc(opts.title)+'</div>'
    + '<div class="modal-body">'+(opts.body||'')+'</div>'
    + '<div class="modal-btns">'+opts.buttons.map(function(b,i){
        return '<button class="btn '+b.cls+'" data-mbtn="'+i+'">'+esc(b.label)+'</button>';
      }).join('')+'</div></div>';
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
  var rows=[['日期','第几天','阶段','显示模式','是否已打卡','提交时间',
    '暖腹/暖腰(完成/未完成/未记录)','不碰冷饮生冷(完成/未完成/未记录)','早睡23:00前(完成/未完成/未记录)',
    '体质饮食(完成/未完成/未记录)','舒缓体式(完成/未完成/未记录)','舒缓是否跳过',
    '艾灸(分钟)','泡脚(分钟)','饮水(毫升)','基础体温(℃)',
    '身体感受(1-5)','心情感受(1-5)','今天我做到了','明天最重要的一件事','备注']];
  Object.keys(DB.days).sort().forEach(function(ds){
    var d=DB.days[ds], i=dayIndex(ds), ph=phaseOf(i);
    rows.push([ds, i, ph?ph.name:'', (d.mode||'standard')==='busy'?'极简版':'标准版',
      isSubmitted(d)?'是':'否', d.submitTime||'',
      triText(d,'warmBelly'), triText(d,'noCold'), triText(d,'earlySleep'), triText(d,'bodyFood'),
      triText(d,'soothing'), (d.skipped&&d.skipped.soothing)?'是':'',
      hasNum(d.moxaMin)?num(d.moxaMin):'', hasNum(d.footMin)?num(d.footMin):'',
      hasNum(d.waterMl)?num(d.waterMl):'', hasNum(d.tempC)?num(d.tempC):'',
      hasNum(d.body)?num(d.body):'', hasNum(d.mind)?num(d.mind):'',
      d.did||'', d.tomorrow||'', d.note||'']);
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
    if(currentTab==='plan') renderPlan();
    if(currentTab==='trend') renderTrend();
    if(currentTab==='setting') renderSetting();
    window.scrollTo(0,0);
  });
});

renderAll();

})();
