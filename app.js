/* 30天生活调理打卡 - 纯前端本机存储 */
(function(){
'use strict';

/* ========== 常量 ========== */
var START = '2026-10-20';
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
var LS_KEY = 'health30_v1';

/* ========== 工具 ========== */
function pad(n){ return n<10 ? '0'+n : ''+n; }
function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseD(s){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function todayStr(){ return fmt(new Date()); }
function addDays(s, n){ var d=parseD(s); d.setDate(d.getDate()+n); return fmt(d); }
function dayIndex(dateStr){
  var diff = Math.round((parseD(dateStr) - parseD(START)) / 86400000);
  return diff + 1; // 1-based
}
function dateLabel(dateStr){
  var p = dateStr.split('-');
  return (+p[1]) + '月' + (+p[2]) + '日';
}
function $(sel, el){ return (el||document).querySelector(sel); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

function toast(msg){
  var t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(function(){ t.classList.remove('show'); }, 1800);
}

/* ========== 数据 ========== */
function blankDay(){
  return {
    dietOk:false, noAlcoholSweet:false, waterMl:'', walkMin:'', sleepH:'',
    relax:false, sedentaryBreaks:false,
    stress:'', did:'', tomorrow:'',
    glucose:[], // {value, timing, method, meds}
    weight:'', waist:'',
    note:'',
    done:false
  };
}
function load(){
  try{
    var raw = localStorage.getItem(LS_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {
    baseline:{ weight:89.5, glucose:7.0, waist:'', wakeTime:'07:00', bedTime:'23:00' },
    days:{},
    inited:false
  };
}
var DB = load();
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function getDay(dateStr){
  if(!DB.days[dateStr]) DB.days[dateStr] = blankDay();
  return DB.days[dateStr];
}

/* 核心习惯完成度（用于坚持度统计） */
function coreScore(d){
  var items = [d.dietOk, d.noAlcoholSweet, d.walkMin!==''&&+d.walkMin>0, d.sleepH!==''&&+d.sleepH>0, d.relax];
  var n=0; items.forEach(function(v){ if(v) n++; });
  return {done:n, total:items.length, full: n===items.length};
}
function isChecked(d){
  return d.done || coreScore(d).done >= 3;
}

/* 连续打卡天数 */
function streak(){
  var s=0, d=todayStr();
  if(dayIndex(d) < 1) return 0;
  if(!isChecked(DB.days[d]||blankDay())) d = addDays(d,-1);
  while(DB.days[d] && isChecked(DB.days[d])){ s++; d = addDays(d,-1); }
  return s;
}

/* ========== 页面渲染 ========== */
var currentTab = 'today';
var viewDate = todayStr(); // 今日页当前查看/编辑的日期

function renderAll(){
  renderToday();
  renderPlan();
  renderTrend();
  renderSetting();
}

/* ---- 今日 ---- */
function renderToday(){
  var el = $('#page-today');
  var t = viewDate;
  var today = todayStr();
  var isToday = (t === today);
  var idx = dayIndex(t);
  var inRange = idx>=1 && idx<=30;
  var plan = inRange ? PLAN[idx-1] : (idx<1 ? {focus:'计划尚未开始（10月20日开始）', walk:''} : {focus:'30天计划已结束，继续保持已养成的习惯', walk:'舒适步行'});
  var d = getDay(t);
  var st = streak();

  var checkedCount = 0;
  Object.keys(DB.days).forEach(function(k){ if(isChecked(DB.days[k])) checkedCount++; });

  var html = '';

  /* 日期切换条：可回到任意过去日期查看/修改 */
  var canPrev = t > START;
  var canNext = t < today;
  html += '<div class="date-nav">'
    + '<button class="nav-arrow" id="nav-prev" '+(canPrev?'':'disabled')+'>‹</button>'
    + '<div class="nav-label">' + dateLabel(t)
    + (isToday ? ' <span class="today-badge">今天</span>' : ' <span class="draft-badge">'+(isChecked(d)?'已打卡':'草稿')+'</span>')
    + (isToday ? '' : '<a href="javascript:void 0" id="nav-back-today" class="back-today">回到今天</a>')
    + '</div>'
    + '<button class="nav-arrow" id="nav-next" '+(canNext?'':'disabled')+'>›</button>'
    + '</div>';

  html += '<div class="day-hero">'
    + '<div class="day-num">' + (inRange ? ('第 '+idx+' 天 / 共 30 天') : (idx<1?'准备阶段':'计划已完成')) + '</div>'
    + '<div class="day-focus">' + esc(plan.focus) + '</div>'
    + (plan.walk ? '<div class="day-walk">🚶 步行安排：' + esc(plan.walk) + '</div>' : '')
    + '<div class="day-date">' + (isToday ? '今天是 ' : '正在编辑 ') + dateLabel(t) + (isToday?'':' 的记录') + '</div>'
    + '<div class="hero-stats">'
    +   '<div class="hero-stat"><div class="v">'+st+'</div><div class="k">连续打卡</div></div>'
    +   '<div class="hero-stat"><div class="v">'+checkedCount+'</div><div class="k">累计打卡</div></div>'
    +   '<div class="hero-stat"><div class="v">'+(DB.baseline.weight||'—')+'</div><div class="k">起始体重 kg</div></div>'
    + '</div></div>';

  if(plan.review){
    html += '<div class="notice" style="margin-bottom:12px">📋 今天是<b>周复盘日</b>：在底部「备注」里写下这一周哪些做法有效、哪项最难、下周怎么简化。</div>';
  }
  if(plan.weigh){
    html += '<div class="notice" style="margin-bottom:12px">⚖️ 今天建议<b>同条件称重</b>（晨起、如厕后、早餐前），并在下方记录体重/腰围。</div>';
  }

  /* 每日固定习惯 */
  html += '<div class="card"><div class="card-title">每日固定习惯 <span class="sub">忙碌日保住前4项即可</span></div>';
  html += checkRow('dietOk', d.dietOk, '三餐规律，餐盘比例基本合理', '不跳餐、不吃撑');
  html += checkRow('noAlcoholSweet', d.noAlcoholSweet, '无酒、无含糖饮料', '');
  html += checkRow('relax', d.relax, '放松 3～5 分钟', '揉印堂穴或缓慢呼吸');
  html += checkRow('sedentaryBreaks', d.sedentaryBreaks, '久坐中断', '每坐约1小时起身3分钟');
  html += '</div>';

  /* 数值记录 */
  html += '<div class="card"><div class="card-title">今日数值</div>'
    + '<div class="field-row">'
    +   '<div class="field input-suffix"><label>饮水量</label><input type="number" id="f-water" value="'+esc(d.waterMl)+'" placeholder="2500"><span class="suffix">毫升</span></div>'
    +   '<div class="field input-suffix"><label>步行</label><input type="number" id="f-walk" value="'+esc(d.walkMin)+'" placeholder="'+esc(plan.walk.replace(/[^0-9~～]/g,''))+'"><span class="suffix">分钟</span></div>'
    + '</div>'
    + '<div class="field-row">'
    +   '<div class="field input-suffix"><label>睡眠</label><input type="number" step="0.5" id="f-sleep" value="'+esc(d.sleepH)+'" placeholder="7.5"><span class="suffix">小时</span></div>'
    +   '<div class="field input-suffix"><label>起床时间</label><input type="time" id="f-wake" value="'+esc(d.wakeTime||DB.baseline.wakeTime||'')+'"></div>'
    + '</div>'
    + '<div class="field-row">'
    +   '<div class="field input-suffix"><label>体重（称重日填）</label><input type="number" step="0.1" id="f-weight" value="'+esc(d.weight)+'" placeholder="'+esc(DB.baseline.weight)+'"><span class="suffix">kg</span></div>'
    +   '<div class="field input-suffix"><label>腰围（称重日填）</label><input type="number" step="0.5" id="f-waist" value="'+esc(d.waist)+'"><span class="suffix">cm</span></div>'
    + '</div></div>';

  /* 血糖 */
  html += '<div class="card"><div class="card-title">血糖记录 <span class="sub">频次按医生要求，不为打卡加测</span></div>';
  if(d.glucose.length===0){
    html += '<div class="empty" style="padding:10px 0">今天还没有记录</div>';
  } else {
    d.glucose.forEach(function(g, i){
      html += '<div class="glucose-item"><span class="val">'+esc(g.value)+'</span>'
        + '<span class="tag">'+esc(g.timing)+'</span>'
        + (g.method ? '<span class="tag">'+esc(g.method)+'</span>' : '')
        + (g.meds ? '<span class="tag">'+esc(g.meds)+'</span>' : '')
        + '<button class="del" data-del-glucose="'+i+'">×</button></div>';
    });
  }
  html += '<div class="field-row" style="margin-top:8px">'
    + '<div class="field input-suffix"><input type="number" step="0.1" id="g-value" placeholder="数值"><span class="suffix">mmol/L</span></div>'
    + '<div class="field"><select id="g-timing"><option>空腹</option><option>餐后2小时</option><option>餐前</option><option>睡前</option><option>随机</option></select></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><input type="text" id="g-method" placeholder="测量方式（如：家用血糖仪）"></div>'
    + '<div class="field"><input type="text" id="g-meds" placeholder="用药情况"></div>'
    + '</div>'
    + '<button class="btn secondary small" id="btn-add-glucose">+ 添加血糖记录</button>'
    + '<div class="chart-note">不因一次读数自行调整药量；家用血糖仪主要用于观察趋势</div>'
    + '</div>';

  /* 心情 */
  html += '<div class="card"><div class="card-title">睡前三行 <span class="sub">一两句话即可</span></div>'
    + '<div class="mood-quote">今天我的压力：＿＿/10<br>今天我做到了：＿＿<br>明天最重要的一件事：＿＿</div>'
    + '<div class="field"><label>压力（0-10）</label><input type="number" min="0" max="10" id="f-stress" value="'+esc(d.stress)+'"></div>'
    + '<div class="field"><label>今天我做到了</label><textarea id="f-did" placeholder="一两句话">'+esc(d.did)+'</textarea></div>'
    + '<div class="field"><label>明天最重要的一件事</label><textarea id="f-tomorrow" placeholder="一句话">'+esc(d.tomorrow)+'</textarea></div>'
    + '<div class="field"><label>备注 / 复盘</label><textarea id="f-note" placeholder="复盘日写在这里">'+esc(d.note)+'</textarea></div>'
    + '</div>';

  html += '<button class="btn" id="btn-save">' + (isToday ? '完成今日打卡' : '保存修改') + '</button>';
  html += '<div class="chart-note" style="margin-top:6px">填写内容会自动保存为草稿，中途退出不会丢失</div>';
  html += '<div style="height:10px"></div>';
  html += '<div class="notice red">⚠️ 如出现黄疸、持续腹痛、腰痛伴发热或尿量显著减少等明显新症状，请及时就医。本工具不替代医嘱，用药和复查按医生要求执行。</div>';

  el.innerHTML = html;
  bindToday(el, d);
}

function checkRow(key, on, label, hint){
  return '<div class="check-row"><div class="box '+(on?'on':'')+'" data-check="'+key+'">'+(on?'✓':'')+'</div>'
    + '<div class="label">'+esc(label)+(hint?'<div class="hint">'+esc(hint)+'</div>':'')+'</div></div>';
}

/* 把当前表单内容写入记录（不置 done，作为草稿） */
function collectFields(el, d){
  d.waterMl = $('#f-water', el).value;
  d.walkMin = $('#f-walk', el).value;
  d.sleepH  = $('#f-sleep', el).value;
  d.wakeTime= $('#f-wake', el).value;
  d.weight  = $('#f-weight', el).value;
  d.waist   = $('#f-waist', el).value;
  d.stress  = $('#f-stress', el).value;
  d.did     = $('#f-did', el).value;
  d.tomorrow= $('#f-tomorrow', el).value;
  d.note    = $('#f-note', el).value;
}

function bindToday(el, d){
  /* 日期切换 */
  var prev = $('#nav-prev', el), next = $('#nav-next', el), back = $('#nav-back-today', el);
  if(prev) prev.addEventListener('click', function(){ viewDate = addDays(viewDate, -1); renderToday(); window.scrollTo(0,0); });
  if(next) next.addEventListener('click', function(){ viewDate = addDays(viewDate, 1); renderToday(); window.scrollTo(0,0); });
  if(back) back.addEventListener('click', function(){ viewDate = todayStr(); renderToday(); window.scrollTo(0,0); });

  /* 习惯打勾：立即保存 */
  el.querySelectorAll('[data-check]').forEach(function(box){
    box.addEventListener('click', function(){
      var k = box.getAttribute('data-check');
      d[k] = !d[k];
      save();
      box.classList.toggle('on', d[k]);
      box.textContent = d[k] ? '✓' : '';
    });
  });

  /* 输入自动保存草稿（防抖） */
  var draftTimer = null;
  function autoDraft(){
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function(){
      collectFields(el, d);
      save();
    }, 600);
  }
  ['#f-water','#f-walk','#f-sleep','#f-wake','#f-weight','#f-waist','#f-stress','#f-did','#f-tomorrow','#f-note'].forEach(function(sel){
    var f = $(sel, el);
    if(f){
      f.addEventListener('input', autoDraft);
      f.addEventListener('change', autoDraft);
    }
  });

  $('#btn-add-glucose', el).addEventListener('click', function(){
    var v = $('#g-value', el).value.trim();
    if(!v){ toast('请填写血糖数值'); return; }
    d.glucose.push({
      value: v,
      timing: $('#g-timing', el).value,
      method: $('#g-method', el).value.trim(),
      meds: $('#g-meds', el).value.trim()
    });
    save();
    renderToday();
    toast('已添加');
  });
  el.querySelectorAll('[data-del-glucose]').forEach(function(btn){
    btn.addEventListener('click', function(){
      d.glucose.splice(+btn.getAttribute('data-del-glucose'), 1);
      save(); renderToday();
    });
  });

  $('#btn-save', el).addEventListener('click', function(){
    collectFields(el, d);
    var isToday = (viewDate === todayStr());
    if(isToday) d.done = true;
    save();
    renderToday();
    renderTrend();
    renderPlan();
    toast(isToday ? '今日打卡已保存 ✓' : '修改已保存 ✓');
    window.scrollTo({top:0, behavior:'smooth'});
  });
}

/* ---- 计划 ---- */
function renderPlan(){
  var el = $('#page-plan');
  var t = todayStr();
  var todayIdx = dayIndex(t);
  var html = '<div class="notice" style="margin-bottom:12px">每天都做固定习惯，下表每天只增加一个重点。漏卡不补做，第二天继续。</div>';
  var lastWeek = 0;
  for(var i=0;i<30;i++){
    var week = Math.floor(i/7)+1;
    if(week!==lastWeek){
      html += '<div class="week-sep">第 '+week+' 周</div>';
      lastWeek = week;
    }
    var dateStr = addDays(START, i);
    var p = PLAN[i];
    var rec = DB.days[dateStr];
    var done = rec && isChecked(rec);
    var editable = dateStr <= t; // 未来日期不可编辑
    var cls = 'plan-item' + (done?' done':'') + (i+1===todayIdx?' today':'') + (p.review?' review':'') + (editable?' editable':'');
    html += '<div class="'+cls+'"'+(editable?' data-goto-date="'+dateStr+'"':'')+'><div class="d">'+(i+1)+'</div><div class="info">'
      + '<div class="focus">'+esc(p.focus)+'</div>'
      + '<div class="meta">'+dateLabel(dateStr)+' · <span class="walk">'+esc(p.walk)+'</span>'
      + (p.weigh?' · ⚖️称重':'') + (p.review?' · 📋复盘':'')
      + (editable?' · 点击编辑':'')
      + '</div></div></div>';
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-goto-date]').forEach(function(item){
    item.addEventListener('click', function(){
      viewDate = item.getAttribute('data-goto-date');
      document.querySelector('.tab[data-tab="today"]').click();
    });
  });
}

/* ---- 趋势 ---- */
function renderTrend(){
  var el = $('#page-trend');
  var dates = Object.keys(DB.days).sort();

  /* 汇总 */
  var checked=0, fullDays=0, walkSum=0, walkN=0, sleepSum=0, sleepN=0;
  var weights=[], waists=[], glucF=[], glucP=[];
  dates.forEach(function(ds){
    var d = DB.days[ds];
    var c = coreScore(d);
    if(isChecked(d)) checked++;
    if(c.full) fullDays++;
    if(d.walkMin!==''&&!isNaN(+d.walkMin)){ walkSum+=+d.walkMin; walkN++; }
    if(d.sleepH!==''&&!isNaN(+d.sleepH)){ sleepSum+=+d.sleepH; sleepN++; }
    if(d.weight!==''&&!isNaN(+d.weight)) weights.push({x:ds, y:+d.weight});
    if(d.waist!==''&&!isNaN(+d.waist)) waists.push({x:ds, y:+d.waist});
    (d.glucose||[]).forEach(function(g){
      var v=parseFloat(g.value); if(isNaN(v)) return;
      if(g.timing==='空腹') glucF.push({x:ds, y:v});
      else glucP.push({x:ds, y:v});
    });
  });

  var lastW = weights.length ? weights[weights.length-1].y : null;
  var wDelta = (lastW!=null && DB.baseline.weight) ? (lastW - DB.baseline.weight) : null;

  var html = '';
  html += '<div class="stat-grid">'
    + statCell(checked, '累计打卡天')
    + statCell(streak(), '连续打卡')
    + statCell(fullDays, '全部完成天')
    + statCell(walkN? Math.round(walkSum/walkN):'—', '日均步行分钟')
    + statCell(sleepN? (sleepSum/sleepN).toFixed(1):'—', '日均睡眠小时')
    + statCell(wDelta!=null? (wDelta>0?'+':'')+wDelta.toFixed(1) : '—', '较起始体重 kg', wDelta!=null && wDelta>0)
    + '</div>';

  /* 体重趋势 */
  html += '<div class="card"><div class="card-title">体重趋势 <span class="sub">看趋势，不比较每天数字</span></div>';
  if(weights.length<2 && !(DB.baseline.weight)){
    html += '<div class="empty">记录两次以上体重后显示趋势</div>';
  } else {
    var wdata = [{x:'起始', y:+DB.baseline.weight}].concat(weights);
    html += '<canvas class="chart" id="ch-weight"></canvas><div class="chart-note">起始 '+esc(DB.baseline.weight)+' kg（10月20日体检）</div>';
  }
  html += '</div>';

  /* 血糖趋势 */
  html += '<div class="card"><div class="card-title">血糖趋势 <span class="sub">起始空腹 7.0 mmol/L</span></div>';
  if(glucF.length+glucP.length < 1){
    html += '<div class="empty">添加血糖记录后显示趋势</div>';
  } else {
    html += '<canvas class="chart" id="ch-glucose"></canvas>'
      + '<div class="legend"><span><i style="background:#2f7d5b"></i>空腹</span><span><i style="background:#d97706"></i>餐后/其他</span></div>';
  }
  html += '</div>';

  /* 每周坚持度 */
  html += '<div class="card"><div class="card-title">每周习惯坚持度 <span class="sub">五件事：三餐/无酒甜饮/步行/睡眠/放松</span></div>';
  for(var w=0; w<5; w++){
    if(w===4 && dayIndex(todayStr())<=28) break;
    var segs = '';
    for(var dd=0; dd<7; dd++){
      var di = w*7+dd;
      if(di>=30) break;
      var ds = addDays(START, di);
      var rec = DB.days[ds];
      var on = rec ? coreScore(rec).done : 0;
      segs += '<div class="seg" style="opacity:1;background:'+ segColor(on) +'" title="'+dateLabel(ds)+'：完成 '+on+'/5"></div>';
    }
    html += '<div style="font-size:.78rem;color:var(--text-2);margin-top:'+(w?'10px':'2px')+'">第 '+(w+1)+' 周</div><div class="week-bar">'+segs+'</div>';
  }
  html += '<div class="chart-note">颜色越深完成度越高（浅→深：0→5项）</div></div>';

  /* 腰围 */
  if(waists.length>0){
    html += '<div class="card"><div class="card-title">腰围记录</div>';
    waists.forEach(function(r){
      html += '<div class="glucose-item"><span class="val">'+r.y+' cm</span><span class="tag">'+dateLabel(r.x)+'</span></div>';
    });
    html += '</div>';
  }

  html += '<div class="notice">30天看三件事：<b>习惯能否坚持、精神睡眠是否改善、体重血糖趋势如何</b>——不要求每天数字都下降。</div>';

  el.innerHTML = html;

  /* 画图 */
  if($('#ch-weight', el)) drawLine($('#ch-weight', el), [ {points:wdata, color:'#2f7d5b'} ], 'kg');
  if($('#ch-glucose', el)) drawLine($('#ch-glucose', el), [
    {points:glucF, color:'#2f7d5b'},
    {points:glucP, color:'#d97706'}
  ], 'mmol/L');
}
function statCell(v,k,warn){ return '<div class="stat-cell"><div class="v'+(warn?' warn':'')+'">'+v+'</div><div class="k">'+k+'</div></div>'; }
function segColor(n){
  var colors=['#e5e7eb','#cde6da','#a9d4c2','#7fbfA6'.toLowerCase(),'#55a987','#2f7d5b'];
  return colors[Math.min(n,5)];
}

/* 简易折线图 */
function drawLine(canvas, series, unit){
  var dpr = window.devicePixelRatio||1;
  var W = canvas.clientWidth, H = 180;
  canvas.width = W*dpr; canvas.height = H*dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  var padL=36, padR=12, padT=14, padB=24;
  var all=[];
  series.forEach(function(s){ all = all.concat(s.points.map(function(p){return p.y;})); });
  if(all.length===0) return;
  var min=Math.min.apply(null,all), max=Math.max.apply(null,all);
  if(max-min<0.001){ max+=1; min-=1; }
  var span=max-min; min-=span*0.12; max+=span*0.12;

  /* 收集所有x */
  var xs=[]; series.forEach(function(s){ s.points.forEach(function(p){ if(xs.indexOf(p.x)<0) xs.push(p.x); }); });
  var n = xs.length;
  function X(i){ return n===1 ? padL+(W-padL-padR)/2 : padL + (W-padL-padR)*i/(n-1); }
  function Y(v){ return padT + (H-padT-padB)*(1-(v-min)/(max-min)); }

  /* 网格和y轴 */
  ctx.strokeStyle='#eef0f2'; ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.lineWidth=1;
  for(var g=0; g<=3; g++){
    var v = min + (max-min)*g/3;
    var y = Y(v);
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillText(v.toFixed(1), 4, y+3);
  }
  series.forEach(function(s){
    if(s.points.length===0) return;
    ctx.strokeStyle=s.color; ctx.lineWidth=2; ctx.beginPath();
    s.points.forEach(function(p, i){
      var xi = X(xs.indexOf(p.x)), yi = Y(p.y);
      if(i===0) ctx.moveTo(xi,yi); else ctx.lineTo(xi,yi);
    });
    ctx.stroke();
    ctx.fillStyle=s.color;
    s.points.forEach(function(p){
      var xi=X(xs.indexOf(p.x)), yi=Y(p.y);
      ctx.beginPath(); ctx.arc(xi,yi,3,0,Math.PI*2); ctx.fill();
    });
    /* 末值标注 */
    var last = s.points[s.points.length-1];
    ctx.font='10px sans-serif';
    ctx.fillText(last.y, Math.min(X(xs.indexOf(last.x))+6, W-30), Y(last.y)-4);
  });
  /* x轴标签（最多6个） */
  ctx.fillStyle='#9ca3af'; ctx.font='9px sans-serif'; ctx.textAlign='center';
  var step = Math.max(1, Math.ceil(n/6));
  for(var i=0;i<n;i+=step){
    var lb = xs[i]==='起始'?'起始':dateLabel(xs[i]);
    ctx.fillText(lb, X(i), H-8);
  }
  ctx.textAlign='left';
}

/* ---- 设置 ---- */
function renderSetting(){
  var el = $('#page-setting');
  var b = DB.baseline;
  var html = '';
  html += '<div class="card"><div class="card-title">基线信息</div>'
    + '<div class="field-row">'
    + '<div class="field input-suffix"><label>起始体重（10月20日）</label><input type="number" step="0.1" id="s-weight" value="'+esc(b.weight)+'"><span class="suffix">kg</span></div>'
    + '<div class="field input-suffix"><label>起始空腹血糖</label><input type="number" step="0.1" id="s-glucose" value="'+esc(b.glucose)+'"><span class="suffix">mmol/L</span></div>'
    + '</div>'
    + '<div class="field-row">'
    + '<div class="field"><label>目标起床时间</label><input type="time" id="s-wake" value="'+esc(b.wakeTime)+'"></div>'
    + '<div class="field"><label>目标上床时间</label><input type="time" id="s-bed" value="'+esc(b.bedTime)+'"></div>'
    + '</div>'
    + '<button class="btn secondary small" id="btn-save-base">保存基线</button></div>';

  html += '<div class="card"><div class="card-title">数据管理</div>'
    + '<div class="setting-row"><div>导出 JSON<div class="desc">完整备份，可重新导入</div></div><button class="btn ghost small" id="btn-exp-json">导出</button></div>'
    + '<div class="setting-row"><div>导出 CSV<div class="desc">表格形式，可用 Excel 打开</div></div><button class="btn ghost small" id="btn-exp-csv">导出</button></div>'
    + '<div class="setting-row"><div>导入备份<div class="desc">选择之前导出的 JSON 文件</div></div><button class="btn ghost small" id="btn-import">导入</button></div>'
    + '<input type="file" id="file-import" accept=".json" style="display:none">'
    + '<div class="setting-row"><div>清空全部数据<div class="desc">不可恢复，请先导出备份</div></div><button class="btn danger small" id="btn-clear">清空</button></div>'
    + '</div>';

  html += '<div class="card"><div class="card-title">说明</div>'
    + '<div style="font-size:.82rem;color:var(--text-2);line-height:1.8">'
    + '· 数据仅保存在本机浏览器，换设备前请先导出备份<br>'
    + '· 饮水量服从医生对心肾功能及限水的要求<br>'
    + '· 血糖检测频次按医生要求，不因一次读数自行调药<br>'
    + '· 土豆、玉米、山药算主食；正常吃奶制品豆制品，不自行戒钙<br>'
    + '· 穴位按揉仅作辅助放松，不作为治疗手段<br>'
    + '· 漏卡不补做，第二天继续即可'
    + '</div></div>';

  html += '<div class="notice red">如出现黄疸、持续腹痛、腰痛伴发热或尿量显著减少，请及时就医。用药和复查安排以医嘱为准。</div>';

  el.innerHTML = html;

  $('#btn-save-base', el).addEventListener('click', function(){
    b.weight = $('#s-weight', el).value;
    b.glucose = $('#s-glucose', el).value;
    b.wakeTime = $('#s-wake', el).value;
    b.bedTime = $('#s-bed', el).value;
    save(); renderTrend(); toast('基线已保存');
  });
  $('#btn-exp-json', el).addEventListener('click', function(){
    download('health30-backup-'+todayStr()+'.json', JSON.stringify(DB, null, 2), 'application/json');
  });
  $('#btn-exp-csv', el).addEventListener('click', function(){
    download('health30-'+todayStr()+'.csv', toCSV(), 'text/csv;charset=utf-8');
  });
  $('#btn-import', el).addEventListener('click', function(){ $('#file-import', el).click(); });
  $('#file-import', el).addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try{
        var obj = JSON.parse(rd.result);
        if(!obj.days || !obj.baseline) throw 0;
        DB = obj; save(); renderAll(); toast('导入成功');
      }catch(err){ toast('文件格式不正确'); }
    };
    rd.readAsText(f);
  });
  $('#btn-clear', el).addEventListener('click', function(){
    if(confirm('确定清空全部打卡数据？此操作不可恢复。')){
      localStorage.removeItem(LS_KEY);
      DB = load(); renderAll(); toast('已清空');
    }
  });
}
function download(name, content, mime){
  var blob = new Blob(['﻿'+content], {type:mime});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function toCSV(){
  var rows = [['日期','天数','饮食合理','无酒无甜饮','饮水ml','步行分钟','睡眠小时','起床时间','放松','久坐中断','体重kg','腰围cm','血糖(数值/时机/方式/用药)','压力','做到了','明天最重要','备注']];
  var dates = Object.keys(DB.days).sort();
  dates.forEach(function(ds){
    var d = DB.days[ds];
    var gs = (d.glucose||[]).map(function(g){ return g.value+'/'+g.timing+'/'+(g.method||'')+'/'+(g.meds||''); }).join('；');
    rows.push([ds, dayIndex(ds), yn(d.dietOk), yn(d.noAlcoholSweet), d.waterMl, d.walkMin, d.sleepH, d.wakeTime||'', yn(d.relax), yn(d.sedentaryBreaks), d.weight, d.waist, gs, d.stress, d.did, d.tomorrow, d.note]);
  });
  return rows.map(function(r){ return r.map(csvCell).join(','); }).join('\n');
}
function yn(v){ return v?'是':''; }
function csvCell(v){
  v = String(v==null?'':v);
  if(/[",\n]/.test(v)) v = '"'+v.replace(/"/g,'""')+'"';
  return v;
}

/* ========== 导航 ========== */
document.querySelectorAll('.tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    currentTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b===btn); });
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    $('#page-'+currentTab).classList.add('active');
    if(currentTab==='trend') renderTrend();
    window.scrollTo(0,0);
  });
});

renderAll();
})();
