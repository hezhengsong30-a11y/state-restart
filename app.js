/* 30天生活调理打卡 - 纯前端本机存储 v2 */
(function(){
'use strict';

/* ========== 常量 ========== */
var START = '2026-10-20';
var END   = '2026-11-18';
var TOTAL = 30;
var CYCLE = '2026年10月20日至11月18日';
var LS_KEY = 'health30_v1';   // 沿用原 key，保证已有数据不丢

var PLAN = [
  {focus:'开始打卡，记录血糖 7.0，选定起床和睡觉时间', walk:'饭后10分钟'},
  {focus:'晨起如厕后称体重、量腰围，记录基线', walk:'饭后10分钟', weigh:true},
  {focus:'准备两套方便执行的早餐', walk:'饭后10～15分钟'},
  {focus:'午餐练习餐盘比例：半盘蔬菜、四分之一蛋白质、四分之一主食', walk:'两次各10分钟'},
  {focus:'把水杯放在手边，观察饮水是否集中在晚上', walk:'两次各10分钟'},
  {focus:'练习一顿外卖：少油、少酱、无甜饮', walk:'两次各10分钟'},
  {focus:'第一周复盘：保留有效做法，简化最难的一项', walk:'轻松走15～20分钟', review:true},
  {focus:'同条件称重；查看一周睡眠和血糖记录', walk:'累计20分钟', weigh:true},
  {focus:'上午、下午都安排久坐中断（每坐1小时起身3分钟）', walk:'累计20分钟'},
  {focus:'晚饭后不再边工作边吃零食', walk:'累计20～25分钟'},
  {focus:'工作结束前写好明天最重要的一件事', walk:'累计20～25分钟'},
  {focus:'周末也尽量保持起床时间', walk:'累计20～25分钟'},
  {focus:'为下周准备蔬菜、蛋白质和早餐食材', walk:'累计20～25分钟'},
  {focus:'第二周复盘：关注精神、饥饿感和执行难度', walk:'轻松走20分钟', review:true},
  {focus:'同条件称重、量腰围；不因单次波动加码', walk:'耐受时累计30分钟', weigh:true},
  {focus:'检查早餐是否只有主食，补上蛋白质', walk:'累计25～30分钟'},
  {focus:'留意会议、加班时是否忘记吃饭和喝水', walk:'累计25～30分钟'},
  {focus:'聚餐仍正常进食，避免靠饿一顿“补偿”', walk:'累计25～30分钟'},
  {focus:'选择一次喜欢的户外散步，重在放松', walk:'累计25～30分钟'},
  {focus:'提前结束工作，给睡前留出完整30分钟', walk:'累计25～30分钟'},
  {focus:'第三周复盘：选出最容易长期保留的三个习惯', walk:'轻松走20分钟', review:true},
  {focus:'同条件称重；看整体趋势，不比较每天数字', walk:'累计约30分钟', weigh:true},
  {focus:'把最常点的外卖固定成两三种合适组合', walk:'累计约30分钟'},
  {focus:'练习忙碌日的简化版：正常吃饭、无酒无甜饮、走10分钟', walk:'允许减至10～15分钟'},
  {focus:'回顾压力大的时候是否容易晚睡、吃零食', walk:'累计约30分钟'},
  {focus:'给自己安排一项喜欢、轻松的活动', walk:'舒适步行'},
  {focus:'准备下一周食材，保持原有节奏', walk:'累计约30分钟'},
  {focus:'第四周复盘，整理医生要求的监测记录', walk:'轻松走20分钟', review:true},
  {focus:'同条件称重，选定下个月继续保留的习惯', walk:'累计约30分钟', weigh:true},
  {focus:'量腰围，完成月度复盘，核对医嘱复查时间', walk:'舒适步行，不额外加量', weigh:true}
];

/* 七项统一口径 */
var ITEMS = [
  {key:'dietOk',          name:'饮食',      type:'tri'},
  {key:'noAlcoholSweet',  name:'无酒无甜饮', type:'tri'},
  {key:'walkMin',         name:'步行',      type:'num', unit:'分钟'},
  {key:'sleepH',          name:'睡眠',      type:'num', unit:'小时'},
  {key:'waterMl',         name:'饮水',      type:'num', unit:'毫升'},
  {key:'sedentaryBreaks', name:'久坐中断',   type:'tri'},
  {key:'relax',           name:'放松',      type:'tri', optional:true}
];
var ITEM_MAP = {};
ITEMS.forEach(function(it){ ITEM_MAP[it.key]=it; });
var STD_KEYS  = ['dietOk','noAlcoholSweet','walkMin','sleepH','waterMl','sedentaryBreaks','relax'];
var BUSY_KEYS = ['dietOk','noAlcoholSweet','walkMin','sleepRest'];

var TIPS = {
  diet: '三餐规律，不跳餐、不吃撑。午晚餐尽量半盘非淀粉类蔬菜、四分之一鱼肉蛋豆、四分之一主食。<b>土豆、玉米、山药算主食。</b>',
  breakfast: '原味燕麦＋无糖牛奶＋鸡蛋；或适量全麦面包＋鸡蛋＋黄瓜。份量按食量和医生建议调整。',
  takeout: '优先清蒸、白灼、少油炒；酱汁少放，不搭配含糖饮料。',
  walkTail: '可以拆分完成，以能正常说完整句子、不明显气喘为宜；疲劳或不适时减量。',
  water: '分次饮水，避免晚上集中补喝。没有限水要求时参考原计划，具体服从医嘱。',
  sleep: '固定起床时间，预留7～9小时睡眠；睡前30分钟结束工作。晚睡时逐步调整，不必一次提前很多。',
  sedentary: '每坐约1小时，起身活动3分钟。',
  relax: '按摩或缓慢呼吸任选一种，3～5分钟即可。'
};
var RELAX_TIPS = '印堂按揉：两眉之间的中点，干净指腹轻柔画圈2～3分钟，力度舒适、不疼；皮肤破损或红肿时跳过。仅作辅助放松。<br>'
  + '缓慢呼吸：坐稳、肩膀放松，自然吸气、缓慢呼气，不憋气；头晕时停止。';

var G_TIMINGS = ['空腹','餐后2小时','餐前','睡前','随机'];
var G_COLORS  = {'空腹':'#2f7d5b','餐后2小时':'#d97706','餐前':'#2563eb','睡前':'#7c3aed','随机':'#9ca3af'};

/* ========== 工具 ========== */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseD(s){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function todayStr(){ return fmt(new Date()); }
function addDays(s, n){ var d=parseD(s); d.setDate(d.getDate()+n); return fmt(d); }
function dayIndex(dateStr){ return Math.round((parseD(dateStr) - parseD(START)) / 86400000) + 1; }
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
    dietOk: undefined, noAlcoholSweet: undefined, sedentaryBreaks: undefined, relax: undefined,
    sleepRest: undefined,
    skipped: {},
    waterMl:'', walkMin:'', sleepH:'',
    wakeTime:'', weight:'', waist:'',
    stress:'', oneLine:'', did:'', tomorrow:'', note:'',
    glucose:[],
    done: undefined, submitTime:'', draftSavedAt:''
  };
}
function blankBase(){
  return {
    weight : { value:'89.5', date:null,   source:'体检报告', note:'' },
    glucose: { value:'7.0',  date:START,  source:'',        note:'' },
    waist  : { value:'',     date:null,   source:'',        note:'' },
    wakeTime:'07:00', bedTime:'23:00'
  };
}
function blankDB(){
  return { version:2, baseline:blankBase(), days:{}, weeks:{}, settings:{}, inited:false };
}
function load(){
  var db = null;
  try{ var raw = localStorage.getItem(LS_KEY); if(raw) db = JSON.parse(raw); }catch(e){ db=null; }
  if(!db) return blankDB();
  return migrate(db);
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
      ['dietOk','noAlcoholSweet','sedentaryBreaks','relax','sleepRest'].forEach(function(k){
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
  db.version = 2;
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
  db.weeks = db.weeks || {};
  db.settings = db.settings || {};
  if(!Array.isArray(db.settings.dismissedBackup)) db.settings.dismissedBackup=[];
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
  var has = ['dietOk','noAlcoholSweet','sedentaryBreaks','relax','sleepRest'].some(function(k){ return d[k]!==undefined; });
  has = has || ['waterMl','walkMin','sleepH','wakeTime','weight','waist','stress','oneLine','did','tomorrow','note']
    .some(function(k){ return d[k]!==undefined && d[k]!==''; });
  has = has || (Array.isArray(d.glucose) && d.glucose.length>0);
  return has;
}

/* ========== 统计 ========== */
var undoStack = {};   // 内存态：{date:{water:[], walk:[]}}

function weekOfIdx(idx){ return Math.floor((idx-1)/7)+1; }        // 1..5
function weekRange(w){ return [ addDays(START,(w-1)*7), addDays(START, Math.min(w*7,TOTAL)-1) ]; }
function currentWeek(){
  var idx = dayIndex(todayStr());
  if(idx<1) return 1;
  if(idx>TOTAL) return 5;
  return weekOfIdx(idx);
}
/* 已打卡 = 提交了记录（唯一日期计数，重复提交不增加） */
function submittedDates(){ return Object.keys(DB.days).filter(function(ds){ return isSubmitted(DB.days[ds]); }); }
function weekSubmittedDays(w){
  var st = submittedDates().filter(function(ds){ var i=dayIndex(ds); return i>=1 && i<=TOTAL && weekOfIdx(i)===w; });
  return st.length;
}
function streak(){
  var s=0, d=todayStr();
  if(dayIndex(d)<1) return 0;
  if(!isSubmitted(DB.days[d])) d = addDays(d,-1);
  while(DB.days[d] && isSubmitted(DB.days[d])){ s++; d=addDays(d,-1); }
  return s;
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
  return Object.keys(DB.days).filter(function(ds){
    var d=DB.days[ds]; var i=dayIndex(ds);
    if(i<1||i>TOTAL) return false;
    return dayHasContent(d) && dayTargetFull(d);
  }).length;
}

/* ========== 页面状态 ========== */
var currentTab='today';
var viewDate=todayStr();
var editing=false;
var uiState={ glucose:false, mood:false, moodMore:false, extra:false, tips:{} };

function renderAll(){ renderToday(); renderPlan(); renderTrend(); renderSetting(); }

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

  if(plan.review){
    var wk=weekOfIdx(idx);
    var dismissed=(DB.settings.dismissedBackup||[]).indexOf(wk)>=0;
    html += '<div class="notice" style="margin-bottom:12px">📋 <b>今天是周复盘日</b>：在第 '+wk+' 周的「下周调整」里写下一句调整方向。</div>';
    if(!dismissed){
      html += '<div class="banner"><div class="banner-txt">📦 建议本周导出一次备份（换设备或清理浏览器后数据无法找回）</div>'
        + '<button class="banner-x" data-dismiss-backup="'+wk+'">✕</button></div>';
    }
  }
  if(plan.weigh){ html += '<div class="notice" style="margin-bottom:12px">⚖️ 今天建议<b>同条件称重</b>（晨起、如厕后、早餐前），并记录体重／腰围。</div>'; }
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
  var dis = locked ? ' disabled' : '';
  html += '<div class="card"><div class="card-title">今日行动 <span class="sub">'+(busy?'极简版 4 项':'标准版 7 项')+'</span></div>';
  if(!busy){
    html += actionTri(t,'dietOk','饮食规律，餐盘比例基本合理','',locked);
    html += actionTri(t,'noAlcoholSweet','无酒、无含糖饮料','',locked);
    html += actionNum(t,'walkMin','步行','分钟','例如 30',locked,'plan-walk');
    html += actionNum(t,'sleepH','睡眠（昨晚）','小时','例如 7.5',locked);
    html += actionNum(t,'waterMl','饮水','毫升','例如 2500',locked,'quick-water');
    html += actionTri(t,'sedentaryBreaks','久坐中断','每坐约1小时起身3分钟',locked);
    html += actionTri(t,'relax','放松 3～5 分钟','可选，可今日跳过',locked,true);
  } else {
    html += '<div class="chart-note" style="margin:-2px 0 8px">极简版保住这 4 项即可：规律吃饭、无酒无甜饮、步行10分钟、尽量按时休息。</div>';
    html += actionTri(t,'dietOk','规律吃饭','不跳餐、不吃撑',locked);
    html += actionTri(t,'noAlcoholSweet','无酒、无含糖饮料','',locked);
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
  html += '<div class="field"><label>起床时间（当天实际）</label><input type="time"'+dis+' id="f-wake" value="'+esc(d.wakeTime)+'"></div>';
  html += '<div class="chart-note" style="text-align:left">起床时间留空代表未记录，不会用设置里的目标时间代替。</div>';
  if(plan.weigh){
    html += '<div class="weigh-box"><div class="weigh-title">⚖️ 今天是指定测量日</div>'
      + '<div class="field-row">'
      + '<div class="field input-suffix"><label>体重</label><input type="number" step="0.1"'+dis+' id="f-weight" value="'+esc(d.weight)+'" placeholder="例如 88.5"><span class="suffix">kg</span></div>'
      + '<div class="field input-suffix"><label>腰围</label><input type="number" step="0.5"'+dis+' id="f-waist" value="'+esc(d.waist)+'" placeholder="例如 98"><span class="suffix">cm</span></div>'
      + '</div></div>';
  } else {
    html += '<details class="fold" id="fold-measure"><summary>其他测量（体重／腰围）</summary>'
      + '<div class="field-row">'
      + '<div class="field input-suffix"><label>体重</label><input type="number" step="0.1"'+dis+' id="f-weight" value="'+esc(d.weight)+'" placeholder="例如 88.5"><span class="suffix">kg</span></div>'
      + '<div class="field input-suffix"><label>腰围</label><input type="number" step="0.5"'+dis+' id="f-waist" value="'+esc(d.waist)+'" placeholder="例如 98"><span class="suffix">cm</span></div>'
      + '</div></details>';
  }
  html += '</div>';

  /* 5. 血糖记录（默认折叠） */
  html += '<details class="fold card" id="fold-glucose"'+(uiState.glucose?' open':'')+'><summary>血糖记录'
    + '<span class="fold-sub">'+(d.glucose.length?('已记录 '+d.glucose.length+' 条'):'默认折叠')+'</span></summary>';
  html += '<div class="chart-note" style="text-align:left;margin:2px 0 8px">频次按医生要求，不为打卡加测。不因一次读数自行调整药量。</div>';
  if(d.glucose.length===0){ html += '<div class="empty" style="padding:8px 0">还没有记录</div>'; }
  else {
    G_TIMINGS.forEach(function(tm){
      var list = d.glucose.filter(function(g){ return g.timing===tm; });
      if(!list.length) return;
      html += '<div class="g-group">'+esc(tm)+'</div>';
      list.forEach(function(g,i){
        var realIdx=d.glucose.indexOf(g);
        html += '<div class="glucose-item"><span class="val">'+esc(g.value)+'</span><span class="tag">mmol/L</span>'
          + (g.method?'<span class="tag">'+esc(g.method)+'</span>':'<span class="tag warn">测量方式待补充</span>')
          + (g.meds?'<span class="tag">用药：'+esc(g.meds)+'</span>':'')
          + (locked?'':'<button class="del" data-del-glucose="'+realIdx+'">×</button>')+'</div>';
      });
    });
  }
  if(!locked){
    html += '<div class="field-row" style="margin-top:8px">'
      + '<div class="field input-suffix"><input type="number" step="0.1" id="g-value" placeholder="数值"><span class="suffix">mmol/L</span></div>'
      + '<div class="field"><select id="g-timing">'+G_TIMINGS.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></div>'
      + '</div>'
      + '<div class="field-row">'
      + '<div class="field"><input type="text" id="g-method" placeholder="测量方式（如：家用血糖仪）"></div>'
      + '<div class="field"><input type="text" id="g-meds" placeholder="用药情况"></div>'
      + '</div>'
      + '<button class="btn secondary small" id="btn-add-glucose">+ 添加血糖记录</button>';
  }
  html += '</details>';

  /* 6. 心情记录（默认折叠） */
  html += '<details class="fold card" id="fold-mood"'+(uiState.mood?' open':'')+'><summary>心情记录'
    + '<span class="fold-sub">'+(hasNum(d.stress)?('压力 '+esc(d.stress)+'/10'):'默认折叠，可不填')+'</span></summary>';
  html += '<div class="field"><label>今日压力（0-10，可不填）</label><input type="number" min="0" max="10"'+dis+' id="f-stress" value="'+esc(d.stress)+'" placeholder="例如 6"></div>';
  html += '<div class="field"><label>一句话记录（可不填）</label><textarea'+dis+' id="f-oneLine" placeholder="例如：今天有点累，但把午饭吃踏实了">'+esc(d.oneLine)+'</textarea></div>';
  html += '<details class="fold" id="fold-moodmore"'+(uiState.moodMore?' open':'')+'><summary>更多记录</summary>'
    + '<div class="field"><label>今天我做到了</label><textarea'+dis+' id="f-did" placeholder="一两句话">'+esc(d.did)+'</textarea></div>'
    + '<div class="field"><label>明天最重要的一件事</label><textarea'+dis+' id="f-tomorrow" placeholder="一句话">'+esc(d.tomorrow)+'</textarea></div>'
    + '<div class="field"><label>备注／复盘</label><textarea'+dis+' id="f-note" placeholder="复盘日写在这里">'+esc(d.note)+'</textarea></div>'
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
  else if(key==='relax'){ body='<div class="tip-body">'+TIPS.relax+'<div class="tip-sub">两种做法</div>'+RELAX_TIPS+'</div>'; }
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
    ensureDay(t).glucose.push({
      value:v, timing:$('#g-timing',el).value,
      method:$('#g-method',el).value.trim(), meds:$('#g-meds',el).value.trim()
    });
    save(); renderToday(); toast('已添加');
  });
  $$('[data-del-glucose]',el).forEach(function(b){
    b.addEventListener('click',function(){
      collectFields(el,d);
      var dd=ensureDay(t);
      dd.glucose.splice(+b.getAttribute('data-del-glucose'),1);
      save(); renderToday();
    });
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
  var gTotal=0; G_TIMINGS.forEach(function(x){ gTotal+=gSeries[x].length; });
  html += '<div class="card"><div class="card-title">血糖趋势 <span class="sub">按测量时机分类，不混连</span></div>';
  if(gTotal<1){ html += '<div class="empty">记录积累中：添加血糖记录后显示趋势</div>'; }
  else {
    var used=G_TIMINGS.filter(function(x){ return gSeries[x].length>0; });
    html += '<canvas class="chart" id="ch-glucose"></canvas>';
    html += '<div class="legend">'+used.map(function(x){
      return '<span><i style="background:'+G_COLORS[x]+'"></i>'+esc(x)+'（'+gSeries[x].length+'）</span>';
    }).join('')+'</div>';
    html += '<div class="g-list">';
    used.forEach(function(x){
      gSeries[x].forEach(function(p){
        html += '<div class="glucose-item"><span class="val">'+p.y+'</span><span class="tag">mmol/L</span>'
          + '<span class="tag">'+esc(x)+'</span><span class="tag">'+dateLabel(p.x)+'</span>'
          + (p.method?'<span class="tag">'+esc(p.method)+'</span>':'<span class="tag warn">测量方式未记录</span>')+'</div>';
      });
    });
    html += '</div>';
    html += '<div class="chart-note">仅按数值与时机呈现，不判断改善或恶化；不同来源的读数不直接互相换算。</div>';
  }
  html += '</div>';

  /* 每周执行情况 */
  html += '<div class="card"><div class="card-title">每周执行情况 <span class="sub">第 1～5 周全覆盖（含第 5 周最后两天）</span></div>';
  for(var w=1;w<=5;w++){
    html += weekBlock(w);
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

  if($('#ch-weight',el)) drawLine($('#ch-weight',el),[ {points:weights,color:'#2f7d5b'} ],'kg');
  if($('#ch-glucose',el)){
    var series=G_TIMINGS.filter(function(x){ return gSeries[x].length>0; })
      .map(function(x){ return {points:gSeries[x],color:G_COLORS[x]}; });
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
function weekBlock(w){
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

  var html='<div class="week-block"><div class="week-head"><b>第 '+w+' 周</b> <span>'+dateLabel(rg[0])+'–'+dateLabel(rg[1])+'</span></div>';
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
  html += '</div>';
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
  ctx.strokeStyle='#eef0f2'; ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.lineWidth=1;
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
    + '<div class="setting-row"><div>清空全部数据<div class="desc">不可恢复，需要二次确认，请先导出备份</div></div><button class="btn danger small" id="btn-clear">清空</button></div>'
    + '</div>';

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
function openImportDialog(obj){
  var dates=Object.keys(obj.days||{}).filter(function(ds){ return dayIndex(ds)>=1 && dayIndex(ds)<=TOTAL; });
  var conflicts=dates.filter(function(ds){ return dayHasContent(DB.days[ds]); });
  var backupAt = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('zh-CN') : '未标注';
  var body='<div class="modal-line"><b>备份生成时间：</b>'+esc(backupAt)+'</div>'
    + '<div class="modal-line"><b>备份内计划内记录：</b>'+dates.length+' 天</div>'
    + '<div class="modal-line"><b>与本机冲突的记录：</b>'+conflicts.length+' 天</div>'
    + '<div class="modal-note">冲突不会静默覆盖，请选择处理方式。</div>'
    + (conflicts.length? '<div class="modal-line"><label class="radio"><input type="radio" name="conflict" value="keep" checked> 冲突保留本机记录</label>'
        + '<label class="radio"><input type="radio" name="conflict" value="use"> 冲突使用备份记录</label></div>' : '')
    + '<div class="modal-note">导入失败时本地数据不会被改动。</div>';
  showModal({
    title:'导入备份',
    body:body,
    buttons:[
      {label:'取消',cls:'ghost',onClick:closeModal},
      {label:'合并导入',cls:'secondary',onClick:function(){
        var useBackup=false;
        var r=document.querySelector('input[name="conflict"]:checked');
        if(r && r.value==='use') useBackup=true;
        doImport(obj,'merge',useBackup);
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
      /* 基线：无冲突时保留本机；用户选择使用备份时同步 */
      if(useBackup) DB.baseline=incoming.baseline;
      Object.keys(incoming.weeks||{}).forEach(function(w){ DB.weeks[w]=incoming.weeks[w]; });
    }
    DB.settings.lastImportAt=new Date().toLocaleString('zh-CN');
    if(!save()) throw new Error('save failed');
    closeModal(); renderAll(); toast(mode==='replace'?'已替换导入':'已合并导入');
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
    '饮食(完成/未完成/未记录)','无酒无甜饮(完成/未完成/未记录)',
    '步行(分钟)','步行状态','睡眠_昨晚(小时)','睡眠状态','饮水(毫升)','饮水状态',
    '久坐中断(完成/未完成/未记录)','放松(完成/未完成/未记录)','放松是否跳过','尽量按时休息(完成/未完成/未记录)',
    '起床时间(当天实际)','体重(kg)','腰围(cm)',
    '血糖_数值(mmol/L)','血糖_时机','血糖_测量方式','血糖_用药',
    '压力(0-10)','一句话记录','今天我做到了','明天最重要的一件事','备注']];
  Object.keys(DB.days).sort().forEach(function(ds){
    var d=DB.days[ds];
    var gl=(d.glucose||[]);
    rows.push([ds, dayIndex(ds), (d.mode||'standard')==='busy'?'极简版':'标准版',
      isSubmitted(d)?'是':'否', d.submitTime||'',
      triText(d,'dietOk'), triText(d,'noAlcoholSweet'),
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
      hasNum(d.stress)?num(d.stress):'', d.oneLine||'', d.did||'', d.tomorrow||'', d.note||'']);
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
    window.scrollTo(0,0);
  });
});

renderAll();

/* 仅用于本地自测：带 ?selftest=1 时暴露内部函数，不影响正常使用 */
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
    modeFullDays:modeFullDays, streak:streak
  };
}
})();
