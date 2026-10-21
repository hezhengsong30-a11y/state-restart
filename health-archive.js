/* 健康档案页 - 独立模块，通过 window.__h30_api 与 app.js 共享状态 */
(function(){
'use strict';
var A = window.__h30_api;
if(!A){ console.warn('health-archive.js: __h30_api not ready'); return; }

/* ========== 首次打开：合并写入内置体检档案 ==========
 * 按问题名称/事件内容去重，已有数据只补缺失项与参考范围，不覆盖手工修改。
 * 每次升级种子版本（当前 archiveSeedV3）都会执行一次补全。
 */
(function seedArchiveOnce(){
  var seed = window.__H30_ARCHIVE_SEED;
  try{
    if(!seed){ console.warn('内置体检档案未加载'); return; }
    A.DB.settings = A.DB.settings || {};
    if(A.DB.settings.archiveSeedV3) return;
    if(typeof A.mergeArchive === 'function'){
      A.mergeArchive({
        archiveOnly: true,
        issues: JSON.parse(JSON.stringify(seed.issues)),
        monitorItems: JSON.parse(JSON.stringify(seed.monitorItems)),
        events: JSON.parse(JSON.stringify(seed.events))
      });
    }
    /* 重点问题跟随本期计划：仅「体重/BMI 管理」「血糖管理」，报告结论归入其他健康信息 */
    var focusNames = ['体重/BMI 管理', '血糖管理'];
    var seedNames = seed.issues.map(function(s){ return s.name; });
    A.DB.issues.forEach(function(i){
      if(focusNames.indexOf(i.name)>=0) i.focus = true;
      else if(seedNames.indexOf(i.name)>=0) i.focus = false;
    });
    /* 重点项复用已有监测项，避免重复建项 */
    var monByName = {};
    (A.DB.monitorItems||[]).forEach(function(m){
      (monByName[m.name] = monByName[m.name] || []).push(m.id);
    });
    function linkMonitor(issueName, names){
      var is = A.DB.issues.filter(function(x){ return x.name===issueName; })[0];
      if(!is) return;
      is.monitorIds = is.monitorIds || [];
      names.forEach(function(n){
        (monByName[n]||[]).forEach(function(id){
          if(is.monitorIds.indexOf(id)<0) is.monitorIds.push(id);
        });
      });
    }
    linkMonitor('体重/BMI 管理', ['体重', '体重指数']);
    linkMonitor('血糖管理', ['空腹血糖', '糖化血红蛋白']);
    var b = A.DB.baseline;
    if(b){
      if(b.weight && !b.weight.date && String(b.weight.value||'')===String(seed.baseline.weight.value)){
        b.weight.date = seed.baseline.weight.date;
        b.weight.source = seed.baseline.weight.source;
        b.weight.note = seed.baseline.weight.note;
      }
      if(!b.constitution || (!b.constitution.value && !b.constitution.date)){
        b.constitution = JSON.parse(JSON.stringify(seed.baseline.constitution));
      }
    }
    A.DB.settings.archiveSeedV3 = 'v3';
    A.save();
  }catch(e){ console.warn('seed archive skipped', e); }
})();

/* ========== 工具 ========== */
function getNextId(arr){
  var m=0; (arr||[]).forEach(function(o){ if(o && o.id>m) m=o.id; }); return m+1;
}
function uid(){ return Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }
function nowISO(){ return new Date().toISOString(); }

var ISSUE_TYPES = ['健康问题','症状','检查指标','用药','过敏','生活习惯','其他'];
var SOURCES = ['体检报告','医院记录','居家测量','本人描述','其他'];
var EVENT_TYPES = ['检查','就诊/医嘱','用药变化','症状变化','计划变化','生活事件','月度复盘'];
var RATINGS = ['改善/减轻','基本稳定','加重','本期未出现症状','已解决','信息不足，暂不能判断'];
var ACTION_KEYS = ['dietOk','noAlcoholSweet','walkMin','sleepH','waterMl','sedentaryBreaks','relax','sleepRest'];
var ACTION_MAP = { dietOk:'饮食', noAlcoholSweet:'无酒无甜饮', walkMin:'步行', sleepH:'睡眠', waterMl:'饮水', sedentaryBreaks:'久坐中断', relax:'放松', sleepRest:'尽量按时休息' };

/* ========== 数据层：问题 CRUD ========== */
function blankIssue(){
  return {
    id: null, name:'', type:'健康问题', currentStatus:'', keywords:[], source:'',
    occurDate:null, monitorIds:[], cycleGoal:'', linkedActions:[],
    nextReviewDate:null, reviewDate:null,
    seekCare:'', focus:false, archived:false, archivedAt:null, archivedReason:'',
    createdAt: nowISO(), updatedAt: nowISO()
  };
}
function addIssue(obj){
  var issue = Object.assign(blankIssue(), obj||{});
  issue.id = getNextId(A.DB.issues);
  A.DB.issues.push(issue);
  issue.updatedAt = nowISO();
  return issue;
}
function updateIssue(id, patch){
  var idx = A.DB.issues.findIndex(function(i){ return i.id===id; });
  if(idx<0) return null;
  A.DB.issues[idx] = Object.assign(A.DB.issues[idx], patch, { updatedAt: nowISO() });
  return A.DB.issues[idx];
}
function deleteIssue(id){
  var idx = A.DB.issues.findIndex(function(i){ return i.id===id; });
  if(idx<0) return false;
  var issue = A.DB.issues.splice(idx,1)[0];
  issue.deletedAt = nowISO();
  A.DB.trash.push({ type:'issue', obj: issue });
  /* 关联事件保留但 issueIds 去掉此 id；监测项保留但 issueId 清空 */
  A.DB.events.forEach(function(ev){
    if(Array.isArray(ev.issueIds)){
      ev.issueIds = ev.issueIds.filter(function(x){ return x!==id; });
    }
  });
  A.DB.monitorItems.forEach(function(mo){ if(mo.issueId===id) mo.issueId=null; });
  return true;
}
function setIssueFocus(id, focus){
  /* 温和提示：重点建议 1~3 项 */
  if(focus){
    var nFocus = A.DB.issues.filter(function(i){ return i.focus && !i.archived }).length;
    if(nFocus>=3){
      A.toast('建议重点保持 1~3 项，您已设为重点后可自行决定');
    }
  }
  return updateIssue(id, { focus: !!focus });
}
function archiveIssue(id, reason){
  return updateIssue(id, { archived:true, archivedAt: nowISO(), archivedReason: reason||'' });
}

/* ========== 数据层：事件 CRUD ========== */
function blankEvent(){
  return {
    id:null, date: A.todayStr(), approxDate:false, type:'检查', issueIds:[],
    description:'', source:'', value:null, valueUnit:'', notes:'',
    createdAt: nowISO()
  };
}
function addEvent(obj){
  var ev = Object.assign(blankEvent(), obj||{});
  ev.id = getNextId(A.DB.events);
  A.DB.events.push(ev);
  return ev;
}
function updateEvent(id, patch){
  var idx = A.DB.events.findIndex(function(e){ return e.id===id; });
  if(idx<0) return null;
  A.DB.events[idx] = Object.assign(A.DB.events[idx], patch);
  return A.DB.events[idx];
}
function deleteEvent(id){
  var idx = A.DB.events.findIndex(function(e){ return e.id===id; });
  if(idx<0) return false;
  var ev = A.DB.events.splice(idx,1)[0];
  ev.deletedAt = nowISO();
  A.DB.trash.push({ type:'event', obj:ev });
  return true;
}

/* ========== 数据层：监测项 CRUD ========== */
function blankMonitorItem(issueId){
  return { id:null, issueId: issueId||null, name:'', kind:'num', unit:'', refRange:'', options:[], notes:'', createdAt: nowISO() };
}
function addMonitorItem(obj){
  var m = Object.assign(blankMonitorItem(), obj||{});
  m.id = getNextId(A.DB.monitorItems);
  A.DB.monitorItems.push(m);
  return m;
}
function updateMonitorItem(id, patch){
  var idx = A.DB.monitorItems.findIndex(function(x){ return x.id===id; });
  if(idx<0) return null;
  A.DB.monitorItems[idx] = Object.assign(A.DB.monitorItems[idx], patch);
  return A.DB.monitorItems[idx];
}
function deleteMonitorItem(id){
  var idx = A.DB.monitorItems.findIndex(function(x){ return x.id===id; });
  if(idx<0) return false;
  A.DB.monitorItems.splice(idx,1);
  /* issue.monitorIds 同步 */
  A.DB.issues.forEach(function(i){
    if(Array.isArray(i.monitorIds)) i.monitorIds = i.monitorIds.filter(function(x){ return x!==id; });
  });
  return true;
}

/* 指标名归一化：去括号注释、去空格、转大写，用于匹配「ALT」与「ALT（谷丙转氨酶）」 */
function normLabName(s){
  return String(s||'').replace(/[（(][^）)]*[）)]/g,'').replace(/[\s:：]/g,'').toUpperCase();
}
function sameLabName(desc, name){
  var d=normLabName(desc), n=normLabName(name);
  if(!d || !n) return false;
  return d===n || d.indexOf(n)>=0 || n.indexOf(d)>=0;
}
function normUnit(u){ return String(u||'').replace(/\s/g,'').toLowerCase(); }

/* ========== 监测数据点来源汇总 ==========
 * 同一 issue 关联的数值型监测项，优先从 DB.days[].glucose[] / weight / waist / 等读取；
 * 也支持 events 里直接带的 value / valueUnit；monitorItems 定义后，可作为自定义监测。
 * 返回 [{date,value,unit,source,measurementType,notes}]
 */
function collectMonitorPoints(monitorId, issueId){
  var points = [];
  var mi = A.DB.monitorItems.find(function(x){ return x.id===monitorId; });
  var kind = mi ? mi.kind : 'num';

  /* 糖化血红蛋白 → 只取「检查」事件中单位为 % 的记录，不与 mmol/L 血糖混图 */
  if(mi && /糖化|hba1c/i.test(mi.name)){
    A.DB.events.forEach(function(ev){
      if(!A.hasNum(ev.value)) return;
      if(!/糖化/i.test(ev.description||'')) return;
      if(normUnit(ev.valueUnit)!=='%') return;
      if(issueId && (ev.issueIds||[]).indexOf(issueId)<0) return;
      points.push({ date: ev.date, value: A.num(ev.value), unit: ev.valueUnit, source: ev.source||'检查', measurementType:'', notes: ev.description||'' });
    });
  }
  /* 血糖 → 从 days[].glucose[] 读，并合并「检查」事件里的血糖值 */
  else if(mi && /血糖|glucose/i.test(mi.name)){
    var wantUnit = normUnit(mi.unit || 'mmol/l');
    Object.keys(A.DB.days).sort().forEach(function(ds){
      var g = A.DB.days[ds].glucose;
      (g||[]).forEach(function(x){
        if(A.hasNum(x.value) && normUnit(x.unit||'mmol/L')===wantUnit){
          points.push({
            date: ds,
            value: A.num(x.value),
            unit: x.unit || 'mmol/L',
            source: x.method || '居家测量',
            measurementType: x.timing || '',
            notes: x.meds || ''
          });
        }
      });
    });
    A.DB.events.forEach(function(ev){
      if(!A.hasNum(ev.value)) return;
      if(!/血糖/.test(ev.description||'')) return;
      if(normUnit(ev.valueUnit)!==wantUnit) return;
      if(issueId && (ev.issueIds||[]).indexOf(issueId)<0) return;
      points.push({ date: ev.date, value: A.num(ev.value), unit: ev.valueUnit, source: ev.source||'检查', measurementType: /空腹/.test(ev.description)?'空腹':(/餐后/.test(ev.description)?'餐后2小时':''), notes: ev.description||'' });
    });
  }
  /* 体重 → 从 days[].weight 读；基线仅在「有明确测量日期」时才进图，避免把未知日期当成周期首日 */
  else if(mi && /体重|weight/i.test(mi.name) && !/指数|bmi/i.test(mi.name)){
    var bw = A.DB.baseline.weight || {};
    if(A.hasNum(bw.value) && bw.date){
      points.push({ date: bw.date, value: A.num(bw.value), unit: 'kg', source: bw.source||'基线', measurementType:'', notes: bw.note||'' });
    }
    Object.keys(A.DB.days).sort().forEach(function(ds){
      var d = A.DB.days[ds];
      if(A.hasNum(d.weight)){
        points.push({ date: ds, value: A.num(d.weight), unit:'kg', source:'当日记录', measurementType:'', notes:'' });
      }
    });
  }
  /* 腰围 → days[].waist，基线同上 */
  else if(mi && /腰围|waist/i.test(mi.name)){
    var bwa = A.DB.baseline.waist || {};
    if(A.hasNum(bwa.value) && bwa.date) points.push({ date: bwa.date, value:A.num(bwa.value), unit:'cm', source:bwa.source||'基线', measurementType:'', notes:'' });
    Object.keys(A.DB.days).sort().forEach(function(ds){
      if(A.hasNum(A.DB.days[ds].waist)) points.push({ date:ds, value:A.num(A.DB.days[ds].waist), unit:'cm', source:'当日记录', measurementType:'', notes:'' });
    });
  }
  /* 睡眠 → days[].sleepH */
  else if(mi && /睡眠|sleep/i.test(mi.name)){
    Object.keys(A.DB.days).sort().forEach(function(ds){
      if(A.hasNum(A.DB.days[ds].sleepH)) points.push({ date:ds, value:A.num(A.DB.days[ds].sleepH), unit:'小时', source:'当日记录', measurementType:'', notes:'' });
    });
  }
  /* 步行 → days[].walkMin */
  else if(mi && /步行|walk/i.test(mi.name)){
    Object.keys(A.DB.days).sort().forEach(function(ds){
      if(A.hasNum(A.DB.days[ds].walkMin)) points.push({ date:ds, value:A.num(A.DB.days[ds].walkMin), unit:'分钟', source:'当日记录', measurementType:'', notes:'' });
    });
  }
  /* 压力 → days[].stress */
  else if(mi && /压力|stress/i.test(mi.name)){
    Object.keys(A.DB.days).sort().forEach(function(ds){
      if(A.hasNum(A.DB.days[ds].stress)) points.push({ date:ds, value:A.num(A.DB.days[ds].stress), unit:'0-10', source:'当日记录', measurementType:'', notes:'' });
    });
  }
  /* 通用：从 events.value 读（化验复查等）
   * 必须按指标名和单位双重匹配，避免把同一问题的 ALT / AST / GGT 混成一条线
   */
  else {
    A.DB.events.forEach(function(ev){
      if(!Array.isArray(ev.issueIds) || !ev.issueIds.length) return;
      if(issueId && ev.issueIds.indexOf(issueId)<0) return;
      if(!A.hasNum(ev.value)) return;
      if(mi){
        if(mi.name && !sameLabName(ev.description, mi.name)) return;   /* 指标名不匹配则跳过 */
        if(mi.unit && ev.valueUnit && normUnit(ev.valueUnit)!==normUnit(mi.unit)) return; /* 单位不同不混算 */
      }
      points.push({ date: ev.date, value: A.num(ev.value), unit: ev.valueUnit || (mi?mi.unit:''), source: ev.source || '事件', measurementType: '', notes: ev.notes || ev.description || '' });
    });
  }
  points.sort(function(a,b){ return a.date<b.date?-1:1; });
  return points;
}

/* ========== 图表：实线+虚线+实心点+空心点 ==========
 * cx,cy,cw,ch 画布尺寸；pts [{date,value}]；start/end 横轴范围；unit
 */
function drawHealthChart(cx,cy,cw,ch,pts,start,end,unit){
  var ctx = cx.getContext('2d');
  var padL=38, padR=14, padT=14, padB=24;
  ctx.clearRect(0,0,cw,ch);
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,cw,ch);

  if(!pts || pts.length===0){
    ctx.fillStyle='#9ca3af'; ctx.font='13px -apple-system,sans-serif'; ctx.textAlign='center';
    ctx.fillText('暂无记录', cw/2, ch/2);
    return;
  }

  var pStart = A.parseD(start), pEnd = A.parseD(end);
  var dur = Math.max(1, Math.round((pEnd-pStart)/86400000)+1);

  var vals = pts.map(function(p){ return p.value; });
  var vMin = Math.min.apply(null, vals);
  var vMax = Math.max.apply(null, vals);
  if(vMin===vMax){ vMin -= 1; vMax += 1; }
  var vPad = (vMax-vMin)*0.12;
  vMin -= vPad; vMax += vPad;

  function xOf(ds){
    var pd = A.parseD(ds);
    var t = (pd - pStart) / (pEnd - pStart);
    return padL + t * (cw - padL - padR);
  }
  function yOf(v){
    var r = (vMax - vMin);
    return padT + (1 - (v - vMin)/r) * (ch - padT - padB);
  }

  /* y 轴网格 & 标签 */
  ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1;
  ctx.fillStyle='#9ca3af'; ctx.font='10px -apple-system,sans-serif'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(var i=0;i<=3;i++){
    var vv = vMin + (vMax-vMin)*i/3;
    var yy = yOf(vv);
    ctx.beginPath(); ctx.moveTo(padL,yy); ctx.lineTo(cw-padR,yy); ctx.stroke();
    ctx.fillText(vv.toFixed(vMax-vMin<5?1:0), padL-4, yy);
  }

  /* 横轴日期点（只标起点/1/4/中点/3/4/终点） */
  ctx.fillStyle='#9ca3af'; ctx.textAlign='center'; ctx.textBaseline='top';
  [0, Math.floor(dur/4), Math.floor(dur/2), Math.floor(dur*3/4), dur-1].forEach(function(offset){
    var ds = A.addDays(start, offset);
    var xx = xOf(ds);
    var p=ds.split('-');
    ctx.fillText((+p[1])+'/'+(+p[2]), xx, ch-padB+6);
    ctx.strokeStyle='#f3f4f6'; ctx.beginPath(); ctx.moveTo(xx,padT); ctx.lineTo(xx,ch-padB); ctx.stroke();
  });

  /* 依次画出序列，处理虚线连接：
   * 实心点（真实记录）：fill primary
   * 前后两点之间日期差=连续 → 实线；差>1 → 虚线连接（不补造中间值）
   */
  ctx.lineWidth = 2;
  for(var i=1;i<pts.length;i++){
    var a=pts[i-1], b=pts[i];
    var xa=xOf(a.date), xb=xOf(b.date);
    var ya=yOf(a.value), yb=yOf(b.value);
    var gap = Math.round((A.parseD(b.date)-A.parseD(a.date))/86400000);
    ctx.beginPath();
    if(gap<=1){ /* 连续：实线 */
      ctx.strokeStyle='#2f7d5b'; ctx.setLineDash([]);
    } else { /* 中间缺记录：虚线连接 */
      ctx.strokeStyle='#d1d5db'; ctx.setLineDash([4,3]);
    }
    ctx.moveTo(xa,ya); ctx.lineTo(xb,yb); ctx.stroke();
  }
  ctx.setLineDash([]);

  /* 实心点 */
  pts.forEach(function(p){
    var x=xOf(p.date), y=yOf(p.value);
    ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2);
    ctx.fillStyle='#2f7d5b'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  });

  /* 图例 */
  ctx.fillStyle='#6b7280'; ctx.font='10px -apple-system,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='bottom';
  ctx.fillText('● 实际记录', padL+4, padT+12);
  var legendX = padL+78;
  ctx.strokeStyle='#d1d5db'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(legendX, padT+9); ctx.lineTo(legendX+18, padT+9); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillText('虚线：中间缺记录，仅连接前后数据', legendX+24, padT+12);
}

/* ========== 渲染：本轮概况 ========== */
function renderOverview(){
  var c = A.currentCycle();
  var idx = A.dayIndex(A.todayStr());
  var tot = A.cycleTotal();
  var focusIssue = A.DB.issues.find(function(i){ return i.focus && !i.archived; });
  var b = A.DB.baseline || {};
  var cons = b.constitution || {};
  var html='';
  html += '<div class="card archive-overview">';
  html += '<div class="card-title">本轮概况 <span class="sub">'+A.cycleLabel()+'</span></div>';
  html += '<div class="ao-row"><div><span class="ao-label">当前周期</span><div class="ao-val">'+A.cycleLabel()+'</div></div>';
  html += '<div><span class="ao-label">第几天</span><div class="ao-val">'+(idx>=1 && idx<=tot?('第 '+idx+' 天 / '+tot+' 天'):idx<1?'尚未开始':'已完成')+'</div></div>';
  html += '<div><span class="ao-label">重点问题</span><div class="ao-val">'+(focusIssue?A.esc(focusIssue.name):'<span class="muted">未设置</span>')+'</div></div>';
  html += '<div><span class="ao-label">下次复盘</span><div class="ao-val">'+(c.reviewDate?A.dateLabel(c.reviewDate):'<span class="muted">待设置</span>')+'</div></div>';
  html += '<div><span class="ao-label">中医体质</span><div class="ao-val">'+(cons.value?A.esc(cons.value):'<span class="muted">未记录</span>')+'</div>'
    + (cons.date||cons.note?'<div class="ao-item-kws">'+(cons.date?A.dateLabel(cons.date):'')+(cons.note?(cons.date?' · ':'')+A.esc(cons.note):'')+'</div>':'')
    + (function(){
        var due = A.constReviewDue ? A.constReviewDue(cons) : '';
        if(!due) return '';
        var today = A.todayStr();
        if(today >= due){
          var days = Math.round((A.parseD(today)-A.parseD(due))/86400000);
          return '<div class="ao-due">复评已到期'+(days>0?'（超 '+days+' 天）':'')+' · 建议在本周内复评</div>';
        }
        return '<div class="ao-item-kws">下次复评约 '+A.dateLabel(due)+'</div>';
      })()
    + '</div>';
  html += '</div>';
  html += '<div class="chart-note" style="margin-top:8px">本轮关注重点的变化，不要求所有问题在一个周期内解决。</div>';
  html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
  html += '<button class="btn small ghost" id="btn-cycle-change">调整周期</button>';
  html += '<button class="btn small ghost" id="btn-view-history">查看历史周期</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

/* ========== 重点问题卡片 ========== */
function renderFocusCards(){
  var focus = A.DB.issues.filter(function(i){ return i.focus && !i.archived; });
  if(focus.length===0){
    return '<div class="card"><div class="card-title">本轮重点关注</div>'
      + '<div class="empty">暂未设重点问题。添加问题后可点「设为重点」。</div></div>';
  }
  var html='<div class="card"><div class="card-title">本轮重点关注 <span class="sub">'+focus.length+' 项</span></div></div>';
  focus.forEach(function(issue){
    html += renderIssueCard(issue);
  });
  return html;
}
function renderIssueCard(issue){
  var monitors = A.DB.monitorItems.filter(function(m){ return Array.isArray(issue.monitorIds) && issue.monitorIds.indexOf(m.id)>=0; });
  var events = A.DB.events.filter(function(ev){ return (ev.issueIds||[]).indexOf(issue.id)>=0; }).sort(function(a,b){ return a.date>b.date?-1:1; });
  var html='<div class="archive-issue-card" data-issue-id="'+issue.id+'">';
  /* 就诊提醒（P0）：报告建议专科就诊的问题，卡片顶部醒目标注 */
  if(issue.seekCare){
    html += '<div class="aic-care">🏥 报告建议就诊：'+A.esc(issue.seekCare)+'（打卡不能替代就医）</div>';
  }
  html += '<div class="aic-head"><div class="aic-title">'+A.esc(issue.name)
    + (issue.focus?'<span class="aic-badge">本轮重点</span>':'')
    + '</div><div class="aic-actions">'
    + '<button class="link-btn" data-action="add-record">添加记录</button>'
    + '<button class="link-btn" data-action="detail">详情</button>'
    + '<button class="link-btn" data-action="edit">编辑</button>'
    + '<button class="link-btn" data-action="unfocus">移出重点</button>'
    + '</div></div>';
  /* 当前情况 */
  html += '<div class="aic-section"><div class="aic-sub">当前情况</div>'
    + '<div class="aic-body">'+(issue.currentStatus?A.esc(issue.currentStatus):'<span class="muted">待记录</span>')
    + (issue.occurDate?' <span class="aic-date">· '+A.dateLabel(issue.occurDate)+(issue.source?' · '+A.esc(issue.source):'')+'</span>':'')
    + '</div></div>';
  /* 本轮目标 */
  html += '<div class="aic-section"><div class="aic-sub">本轮目标</div>'
    + '<div class="aic-body">'+(issue.cycleGoal?A.esc(issue.cycleGoal):'<span class="muted">待设置</span>')+'</div></div>';
  /* 趋势图 */
  if(monitors.length>0){
    monitors.forEach(function(m){
      var pts = collectMonitorPoints(m.id, issue.id);
      html += '<div class="aic-section"><div class="aic-sub">趋势：'+A.esc(m.name)+'</div>';
      if(pts.length>0){
        html += '<canvas class="chart archive-chart" data-monitor="'+m.id+'" data-issue="'+issue.id+'" height="160"></canvas>';
        var cs = A.cycleStart(), ce = A.cycleEnd();
        html += '<div class="chart-note">本期有记录 '+pts.length+' 天 / 共 '+A.cycleTotal()+' 天</div>';
      } else {
        html += '<div class="aic-body"><span class="muted">暂无记录</span></div>';
      }
      html += '</div>';
    });
  } else {
    html += '<div class="aic-section"><div class="aic-sub">趋势</div><div class="aic-body"><span class="muted">未关联监测项目</span></div></div>';
  }
  /* 关联行动 */
  if(issue.linkedActions && issue.linkedActions.length){
    html += '<div class="aic-section"><div class="aic-sub">关联行动</div><div class="aic-body">';
    issue.linkedActions.forEach(function(k){
      html += '<span class="chip chip-sm">'+A.esc(ACTION_MAP[k]||k)+'</span>';
    });
    html += '</div></div>';
  }
  /* 阶段评价 / 下次回顾 */
  var review = A.DB.reviews.slice().sort(function(a,b){ return (b.reviewDate||'').localeCompare(a.reviewDate||''); })
    .find(function(r){ return (r.evaluations||[]).some(function(e){ return e.issueId===issue.id; }); });
  var latestRating = review ? review.evaluations.find(function(e){ return e.issueId===issue.id; }).rating : null;
  html += '<div class="aic-row">'
    + '<div class="aic-cell"><div class="aic-sub">阶段评价</div><div class="aic-body">'+(latestRating?A.esc(latestRating):'<span class="muted">待回顾</span>')+'</div></div>'
    + '<div class="aic-cell"><div class="aic-sub">下次回顾</div><div class="aic-body">'+(issue.nextReviewDate?A.dateLabel(issue.nextReviewDate):'<span class="muted">待设置</span>')+'</div></div>'
    + '</div>';
  html += '<details class="fold"><summary>更多：归档 / 删除</summary>'
    + '<div class="aic-more">'
    + '<button class="btn small ghost" data-action="archive">归档</button>'
    + '<button class="btn small danger" data-action="delete">删除</button>'
    + '</div></details>';
  html += '</div>';
  return html;
}

/* ========== 关键事件时间线 ========== */
function renderEventTimeline(){
  var evs = A.DB.events.slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var show = evs.slice(0,5);
  var more = evs.length - show.length;
  var html='<div class="card"><div class="card-title">关键时间点'
    + '<span style="display:flex;gap:6px">'
    + '<button class="btn small ghost" id="btn-lab-batch">批量录化验</button>'
    + '<button class="btn small secondary" id="btn-add-event">＋添加</button>'
    + '</span>'
    + '</div>';
  if(show.length===0){
    html += '<div class="empty">暂无事件。体检、就诊、用药、症状变化、计划开始都可以记在这里。</div>';
  } else {
    html += '<div class="timeline">';
    show.forEach(function(ev){ html += renderEventNode(ev); });
    html += '</div>';
    if(more>0){
      html += '<button class="btn small ghost" id="btn-view-all-events" style="margin-top:8px">查看全部（含 '+more+' 条更早事件）</button>';
    }
  }
  html += '</div>';
  return html;
}
function renderEventNode(ev){
  var typeColor = {'检查':'#2563eb','就诊/医嘱':'#2f7d5b','用药变化':'#d97706','症状变化':'#dc2626','计划变化':'#7c3aed','生活事件':'#6b7280','月度复盘':'#0ea5e9'}[ev.type] || '#9ca3af';
  var issueNames = (ev.issueIds||[]).map(function(id){ var i=A.DB.issues.find(function(x){ return x.id===id; }); return i?i.name:null; }).filter(Boolean);
  var html='<div class="tl-item"><div class="tl-dot" style="background:'+typeColor+'"></div>'
    + '<div class="tl-body"><div class="tl-head">'
    + '<span class="tl-type" style="color:'+typeColor+'">'+A.esc(ev.type)+'</span>'
    + '<span class="tl-date">'+(ev.date?(ev.approxDate?'约':'')+A.dateLabel(ev.date):'日期未知')+'</span>'
    + '</div>'
    + (issueNames.length?'<div class="tl-issues">'+A.esc(issueNames.join('、'))+'</div>':'')
    + (ev.description?'<div class="tl-desc">'+A.esc(ev.description)+'</div>':'')
    + (ev.value!=null?'<div class="tl-val">'+A.esc(String(ev.value))+(ev.valueUnit?' '+A.esc(ev.valueUnit):'')+(ev.source?' · '+A.esc(ev.source):'')+'</div>':'')
    + (ev.notes?'<div class="tl-note">'+A.esc(ev.notes)+'</div>':'')
    + '<div class="tl-actions">'
    + '<button class="link-btn" data-action="edit-event">编辑</button>'
    + '<button class="link-btn" data-action="del-event">删除</button>'
    + '</div>'
    + '</div></div>';
  return html;
}

/* ========== 月度复盘 ========== */
function renderLatestReview(){
  var reviews = A.DB.reviews.slice().sort(function(a,b){ return (b.reviewDate||'').localeCompare(a.reviewDate||''); });
  var latest = reviews[0];
  var html='<div class="card"><div class="card-title">月度复盘'
    + '<button class="btn small secondary" id="btn-do-review" style="margin-left:auto">开始/更新复盘</button>'
    + '</div>';
  if(!latest){
    html += '<div class="chart-note" style="margin-bottom:6px">本期还没有复盘。到 '+A.dateLabel(A.currentCycle().reviewDate||A.cycleEnd())+' 时可做复盘。</div>';
    html += '<div class="empty">点击「开始复盘」逐项评价重点问题，再决定下一轮的保留、移出或新增。</div>';
  } else {
    html += '<div class="review-head">复盘日期：'+A.dateLabel(latest.reviewDate)+(latest.completedAt?' · 保存于 '+A.hhmm(new Date(latest.completedAt)):'')+'</div>';
    html += '<div class="review-table"><div class="rt-row rt-head"><div>问题</div><div>用户评价</div><div>下一轮安排</div></div>';
    (latest.evaluations||[]).forEach(function(e){
      var issue = A.DB.issues.find(function(x){ return x.id===e.issueId; });
      html += '<div class="rt-row"><div>'+(issue?A.esc(issue.name):'<span class="muted">（已删除）</span>')+'</div>'
        + '<div>'+A.esc(e.rating||'未评价')+'</div>'
        + '<div>'+A.esc(e.note||'—')+'</div></div>';
    });
    html += '</div>';
    if(latest.nextPlan) html += '<div class="chart-note" style="margin-top:8px"><b>下一轮计划：</b>'+A.esc(latest.nextPlan)+'</div>';
  }
  html += '</div>';
  return html;
}

/* ========== 其他健康信息列表（默认折叠，展开看检测时间/问题/指标与参考范围） ========== */
function refFlag(value, ref){
  if(value==null || value==='' || !ref) return '';
  var v = +value; if(isNaN(v)) return '';
  var s = String(ref).replace(/\s/g,'');
  var m;
  if((m=s.match(/^(?:＜|<|≤)([\d.]+)$/))) return v>+m[1] ? '偏高' : '';
  if((m=s.match(/^(?:＞|>|≥)([\d.]+)$/))) return v<+m[1] ? '偏低' : '';
  if((m=s.match(/^([\d.]+)[-~～]([\d.]+)$/))){
    if(v>+m[2]) return '偏高';
    if(v<+m[1]) return '偏低';
  }
  return '';
}
function issueDetailHtml(issue){
  var mons = A.DB.monitorItems.filter(function(m){ return (issue.monitorIds||[]).indexOf(m.id)>=0; });
  var evs = A.DB.events.filter(function(ev){ return (ev.issueIds||[]).indexOf(issue.id)>=0; })
    .sort(function(a,b){ return String(a.date||'').localeCompare(String(b.date||'')); });
  var labs = [], finds = [];
  evs.forEach(function(ev){
    if(A.hasNum(ev.value)){
      var mon=null;
      for(var i=0;i<mons.length;i++){ if(sameLabName(ev.description, mons[i].name)){ mon=mons[i]; break; } }
      var ref = ev.refRange || (mon?mon.refRange:'') || '';
      labs.push({
        name : mon ? mon.name : String(ev.description||'').replace(/[（(].*$/,''),
        value: ev.value,
        unit : ev.valueUnit || (mon?mon.unit:'') || '',
        ref  : ref,
        flag : refFlag(ev.value, ref)
      });
    } else if(ev.description){
      finds.push(ev);
    }
  });
  mons.forEach(function(m){
    var has = labs.some(function(r){ return sameLabName(r.name, m.name); });
    if(!has) labs.push({ name:m.name, value:null, unit:m.unit||'', ref:m.refRange||'', flag:'' });
  });

  var html='<div class="ao-body">';
  html += '<div class="ao-line"><span class="ao-k">检测时间</span><span class="ao-v">'
    + (issue.occurDate ? A.dateLabel(issue.occurDate) : '<span class="muted">未记录</span>')
    + (issue.source ? ' · '+A.esc(issue.source) : '') + '</span></div>';
  html += '<div class="ao-line"><span class="ao-k">问题</span><span class="ao-v">'
    + (issue.currentStatus ? A.esc(issue.currentStatus) : '<span class="muted">未记录</span>') + '</span></div>';
  if(issue.seekCare){
    html += '<div class="ao-care">'+A.esc(issue.seekCare)+'</div>';
  }
  if(labs.length){
    html += '<div class="ao-sub">指标数值与参考范围</div><div class="ao-labs">';
    labs.forEach(function(r){
      html += '<div class="ao-lab">'
        + '<span class="ao-lab-n">'+A.esc(r.name)+'</span>'
        + '<span class="ao-lab-v">'+(r.value==null?'<span class="muted">待记录</span>':A.esc(r.value)+' '+A.esc(r.unit))+'</span>'
        + (r.flag?'<span class="ao-flag '+(r.flag==='偏高'?'up':'down')+'">'+r.flag+'</span>':'')
        + (r.ref?'<span class="ao-lab-r">参考 '+A.esc(r.ref)+'</span>':'')
        + '</div>';
    });
    html += '</div>';
  }
  if(finds.length){
    html += '<div class="ao-sub">检查结论</div>';
    finds.forEach(function(ev){
      html += '<div class="ao-find">'+(ev.date?'<span class="muted">'+A.dateLabel(ev.date)+'</span> · ':'')
        + A.esc(ev.description)
        + (ev.notes?'<div class="ao-find-note">'+A.esc(ev.notes)+'</div>':'')+'</div>';
    });
  }
  html += '<div class="ao-item-meta">'
    + '<button class="link-btn" data-action="set-focus">设为重点</button>'
    + '<button class="link-btn" data-action="detail">详情</button>'
    + '<button class="link-btn" data-action="edit">编辑</button>'
    + '</div></div>';
  return html;
}
function renderOtherIssues(){
  var nonFocus = A.DB.issues.filter(function(i){ return !i.focus && !i.archived; });
  if(nonFocus.length===0){
    return '';
  }
  var html='<details class="fold"><summary>其他健康信息 <span class="fold-sub">'+nonFocus.length+' 项 · 点击展开</span></summary>';
  html += '<div class="ao-list">';
  nonFocus.forEach(function(issue){
    var n = 0;
    A.DB.events.forEach(function(ev){
      if(A.hasNum(ev.value) && (ev.issueIds||[]).indexOf(issue.id)>=0) n++;
    });
    html += '<details class="ao-item" data-issue-id="'+issue.id+'">'
      + '<summary><span class="ao-item-title">'+A.esc(issue.name)+'</span>'
      + '<span class="ao-sum-meta">'+(issue.occurDate?A.dateLabel(issue.occurDate):'')
      + (n?' · '+n+' 项指标':'')+'</span></summary>'
      + issueDetailHtml(issue)
      + '</details>';
  });
  html += '</div></details>';
  return html;
}

/* ========== 基本资料与来源（折叠） ========== */
function renderBasicInfo(){
  var b = A.DB.baseline;
  var cons = b.constitution || {};
  var html='<details class="fold"><summary>基本资料与来源</summary>';
  html += '<div class="base-block"><div class="base-cur"><div>中医体质</div>'
    + '<div class="base-row">'+A.esc(cons.value||'待补充')+'</div>'
    + '<div class="base-row muted">来源：'+A.esc(cons.source||'待补充')+' · 测评日期：'+(cons.date?A.dateLabel(cons.date):'待补充')+'</div>'
    + (cons.note?'<div class="base-row muted">备注：'+A.esc(cons.note)+'</div>':'')
    + '</div></div>';
  html += '<div class="base-block"><div class="base-cur"><div>体重</div>'
    + '<div class="base-row">'+A.esc(b.weight.value||'待补充')+' kg</div>'
    + '<div class="base-row muted">来源：'+A.esc(b.weight.source||'待补充')+' · 测量日期：'+(b.weight.date?A.dateLabel(b.weight.date):'待补充')+'</div>'
    + (b.weight.note?'<div class="base-row muted">备注：'+A.esc(b.weight.note)+'</div>':'')
    + '</div></div>';
  html += '<div class="base-block"><div class="base-cur"><div>空腹血糖</div>'
    + '<div class="base-row">'+A.esc(b.glucose.value||'待补充')+' mmol/L</div>'
    + '<div class="base-row muted">来源：'+A.esc(b.glucose.source||'待补充')+' · 测量日期：'+(b.glucose.date?A.dateLabel(b.glucose.date):'待补充')+'</div>'
    + (b.glucose.note?'<div class="base-row muted">备注：'+A.esc(b.glucose.note)+'</div>':'')
    + '</div></div>';
  html += '<div class="base-block"><div class="base-cur"><div>腰围</div>'
    + '<div class="base-row">'+A.esc(b.waist.value||'待补充')+' cm</div>'
    + '<div class="base-row muted">来源：'+A.esc(b.waist.source||'待补充')+' · 测量日期：'+(b.waist.date?A.dateLabel(b.waist.date):'待补充')+'</div>'
    + '</div></div>';
  html += '<div class="chart-note" style="margin-top:8px">体检报告中的肝酶、血脂、脂肪肝、胆囊息肉、肾结晶、骨质增生等，请通过「＋添加健康问题或信息」录入，避免和基线字段混淆。</div>';
  html += '</details>';
  return html;
}

/* ========== 主渲染入口 ========== */
function renderArchive(){
  var el = A.$('#page-archive');
  if(!el) return;
  var html='';
  html += renderOverview();
  html += renderFocusCards();
  html += renderEventTimeline();
  html += renderLatestReview();
  html += renderOtherIssues();
  html += renderBasicInfo();
  html += '<div style="margin:12px 0 16px"><button class="btn" id="btn-add-issue">＋ 添加健康问题或信息</button></div>';
  el.innerHTML = html;
  bindArchive();
  window.requestAnimationFrame(function(){ drawAllCharts(); });
}

function drawAllCharts(){
  A.$$('.archive-chart').forEach(function(cv){
    var mid = +cv.getAttribute('data-monitor');
    var pts = collectMonitorPoints(mid);
    var w = cv.clientWidth || 300, h = +cv.getAttribute('height') || 160;
    cv.width = w*2; cv.height = h*2;
    cv.style.height = h+'px';
    var ctx = cv.getContext('2d');
    ctx.scale(2,2);
    var c = A.currentCycle();
    /* 横轴范围：以周期为主，但纳入周期外的真实记录（如体检日期在周期前），避免点画到图外 */
    var start=c.start, end=c.end;
    pts.forEach(function(p){
      if(p.date && p.date<start) start=p.date;
      if(p.date && p.date>end)   end=p.date;
    });
    drawHealthChart(cv, ctx, w, h, pts, start, end);
  });
}

/* ========== 事件绑定 ========== */
function bindArchive(){
  var root = A.$('#page-archive');
  if(!root) return;
  A.$$('#btn-add-issue', root).forEach(function(b){ b.addEventListener('click', function(){ openIssueDialog(null); }); });
  A.$$('#btn-add-event', root).forEach(function(b){ b.addEventListener('click', function(){ openEventDialog(null); }); });
  A.$$('#btn-lab-batch', root).forEach(function(b){ b.addEventListener('click', openLabBatchDialog); });
  A.$$('#btn-do-review', root).forEach(function(b){ b.addEventListener('click', openReviewDialog); });
  A.$$('#btn-cycle-change', root).forEach(function(b){ b.addEventListener('click', openCycleDialog); });

  /* 问题卡片内操作 */
  A.$$('#page-archive [data-issue-id]').forEach(function(container){
    var id = +container.getAttribute('data-issue-id');
    A.$$('[data-action]', container).forEach(function(btn){
      btn.addEventListener('click', function(){
        var act = btn.getAttribute('data-action');
        if(act==='edit') openIssueDialog(id);
        else if(act==='detail') openIssueDetail(id);
        else if(act==='unfocus') setIssueFocus(id, false) && (A.save(), A.renderAll());
        else if(act==='archive') {
          A.showModal({
            title:'归档问题',
            body:'<div class="modal-line">归档不会删除数据，仍可在档案里查看。归档时已减轻/基本稳定/已解决等均可。</div>'
              + '<div class="field" style="margin-top:10px"><label>归档原因（可选）</label><input id="archive-reason" placeholder="例如：指标稳定 3 个月" /></div>',
            buttons:[
              {label:'取消',cls:'ghost',onClick:A.closeModal},
              {label:'确认归档',cls:'',onClick:function(){
                var r = A.$('#archive-reason');
                archiveIssue(id, r?r.value:''); A.save(); A.renderAll(); A.closeModal(); A.toast('已归档');
              }}
            ]
          });
        }
        else if(act==='delete') {
          A.showModal({
            title:'删除问题',
            body:'<div class="modal-line">删除后进入回收站，30 天内可从备份导入恢复。确认删除？</div>',
            buttons:[
              {label:'取消',cls:'ghost',onClick:A.closeModal},
              {label:'删除',cls:'danger',onClick:function(){ deleteIssue(id); A.save(); A.renderAll(); A.closeModal(); }}
            ]
          });
        }
        else if(act==='add-record') openEventDialog({ issueIds:[id] });
      });
    });
  });
  /* 其他列表项操作（设为重点） */
  A.$$('#page-archive [data-issue-id] [data-action="set-focus"]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var c = btn.closest('[data-issue-id]');
      var id = +c.getAttribute('data-issue-id');
      setIssueFocus(id, true); A.save(); A.renderAll(); A.toast('已设为本轮重点');
    });
  });
  /* 时间线里的事件操作 */
  A.$$('[data-action="edit-event"]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var node = btn.closest('.tl-item');
      var issueId = +node.getAttribute('data-event-id');
      openEventDialog(issueId?A.DB.events.find(function(e){ return e.id===issueId; }):null);
    });
  });
  A.$$('[data-action="del-event"]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var node = btn.closest('.tl-item');
      var issueId = +node.getAttribute('data-event-id');
      if(!issueId) return;
      deleteEvent(issueId); A.save(); A.renderAll(); A.toast('已删除，可从备份恢复');
    });
  });
}

/* ========== 编辑 / 添加问题弹窗 ========== */
function openIssueDialog(id){
  var issue = id ? (A.DB.issues.find(function(i){ return i.id===id; }) || blankIssue()) : blankIssue();
  var isNew = !id;
  var kws = (issue.keywords||[]).join(',');
  var linked = (issue.linkedActions||[]).join(',');
  var monitors = A.DB.monitorItems.filter(function(m){ return m.issueId===issue.id || (issue.monitorIds||[]).indexOf(m.id)>=0; });
  var monitorOptions = A.DB.monitorItems.map(function(m){
    return '<label style="display:flex;align-items:center;gap:6px;font-size:.85rem;margin-right:14px"><input type="checkbox" value="'+m.id+'" '
      + ((issue.monitorIds||[]).indexOf(m.id)>=0?'checked':'') + '>'
      + A.esc(m.name)+'</label>';
  }).join('');
  var html='<div class="modal-line">'+(isNew?'新增健康问题':'编辑健康问题')+'</div>';
  if(/息肉/.test(issue.name||'')){
    html += '<div class="chart-note" style="text-align:left;margin-bottom:8px">息肉随访节奏（供参考，遵医嘱）：≤5mm 且无危险因素 → 一般无需随访；6～9mm → 6个月、1年、2年各复查一次超声；≥10mm → 建议肝胆外科评估。先把<b>息肉尺寸</b>补进「当前情况」，方便判断。</div>';
  }
  html += '<div class="field"><label>名称（必填）</label><input id="q-name" value="'+A.esc(issue.name)+'" placeholder="例如：血糖管理" /></div>';
  html += '<div class="field"><label>类型</label><select id="q-type">'
    + ISSUE_TYPES.map(function(t){ return '<option '+(issue.type===t?'selected':'')+'>'+t+'</option>'; }).join('')
    + '</select></div>';
  html += '<div class="field"><label>当前情况（可选）</label><textarea id="q-current" placeholder="一两句描述，重要数值建议带日期和来源">'+A.esc(issue.currentStatus)+'</textarea></div>';
  html += '<div class="field"><label>关键词（逗号分隔）</label><input id="q-keywords" value="'+A.esc(kws)+'" placeholder="例如：空腹血糖 7.0, 居家测量" /></div>';
  html += '<div class="field-row"><div class="field"><label>来源</label><select id="q-source">'
    + [''].concat(SOURCES).map(function(s){ return '<option '+(issue.source===s?'selected':'')+'>'+s+'</option>'; }).join('')
    + '</select></div>';
  html += '<div class="field"><label>发生/检查日期（未知可留空）</label><input id="q-occur" type="date" value="'+(issue.occurDate||'')+'" /></div></div>';
  html += '<div class="field-row"><div class="field"><label>下次回顾日期</label><input id="q-next-review" type="date" value="'+(issue.nextReviewDate||'')+'" /></div>';
  html += '<div class="field"><label>医嘱复查日期</label><input id="q-review" type="date" value="'+(issue.reviewDate||'')+'" /></div></div>';
  html += '<div class="field"><label>本轮目标</label><textarea id="q-goal" placeholder="例如：3～6个月减重5%（报告建议范围5%～15%）；或空腹血糖控制在4.4～7.0">'+A.esc(issue.cycleGoal)+'</textarea></div>';
  html += '<div class="field"><label>报告建议就诊（可选，填专科名称，保存后卡片顶部和今日页会提醒）</label><input id="q-seekcare" value="'+A.esc(issue.seekCare||'')+'" placeholder="例如：内分泌专科（血糖待确诊）、心血管专科、消化科查明肝功能异常原因" /></div>';
  html += '<div class="field"><label>关联计划行动</label><div id="q-linked" style="display:flex;flex-wrap:wrap;gap:4px;max-width:100%">';
  Object.keys(ACTION_MAP).forEach(function(k){
    html += '<label style="display:flex;align-items:center;gap:4px;font-size:.82rem;margin-right:10px"><input type="checkbox" value="'+k+'" '
      + ((issue.linkedActions||[]).indexOf(k)>=0?'checked':'') + '>' + A.esc(ACTION_MAP[k]) + '</label>';
  });
  html += '</div></div>';
  html += '<div class="field"><label>监测项目（从已有定义里挑，或新建）</label>';
  if(A.DB.monitorItems.length===0){
    html += '<div class="chart-note">暂无监测项目。可点下方「＋新建监测项目」，用快捷模板一键添加。</div>';
  } else {
    html += '<div id="q-monitor-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">'+monitorOptions+'</div>';
  }
  html += '<button type="button" class="btn small ghost" id="btn-new-monitor" style="margin-top:8px">＋新建监测项目</button>'
    + '<div id="q-new-monitor" style="display:none;margin-top:8px">'
    + '<div class="field-row"><div class="field"><input id="q-nm-name" placeholder="项目名（如 空腹血糖）"></div>'
    + '<div class="field"><input id="q-nm-unit" placeholder="单位（如 mmol/L）"></div></div>'
    + '<div class="chip-row">'
    + [['空腹血糖','mmol/L'],['餐后2小时血糖','mmol/L'],['糖化血红蛋白','%'],['总胆固醇','mmol/L'],['低密度脂蛋白胆固醇','mmol/L'],['甘油三酯','mmol/L'],['ALT（谷丙转氨酶）','U/L'],['AST（谷草转氨酶）','U/L'],['GGT（谷氨酰转肽酶）','U/L'],['血尿酸','μmol/L'],['体重','kg'],['腰围','cm']]
      .map(function(x){ return '<button type="button" class="chip" data-nm="'+x[0]+'" data-nmu="'+x[1]+'">'+x[0]+'</button>'; }).join('')
    + '</div>'
    + '<button type="button" class="btn small secondary" id="q-nm-add" style="margin-top:6px">添加该监测项目</button></div></div>';
  html += '<div class="field"><label><input type="checkbox" id="q-focus" '+(issue.focus?'checked':'')+'> 设为本轮重点</label></div>';

  A.showModal({
    title:(isNew?'新增':'编辑')+'健康问题',
    body: html,
    buttons:[
      {label:'取消',cls:'ghost',onClick:A.closeModal},
      {label:'保存',cls:'',onClick:function(){
        var name = A.$('#q-name').value.trim();
        if(!name){ A.toast('请填写名称'); return; }
        var kw = A.$('#q-keywords').value.split(/[,，]/).map(function(x){ return x.trim(); }).filter(Boolean);
        var linked = [];
        A.$$('#q-linked input[type="checkbox"]:checked').forEach(function(c){ linked.push(c.value); });
        var monitors = [];
        A.$$('#modal input[type="checkbox"][value]').forEach(function(c){
          if(A.DB.monitorItems.find(function(m){ return m.id===+c.value; })){
            monitors.push(+c.value);
          }
        });
        var patch = {
          name: name,
          type: A.$('#q-type').value,
          currentStatus: A.$('#q-current').value,
          keywords: kw,
          source: A.$('#q-source').value,
          occurDate: A.$('#q-occur').value || null,
          nextReviewDate: A.$('#q-next-review').value || null,
          reviewDate: A.$('#q-review').value || null,
          cycleGoal: A.$('#q-goal').value,
          seekCare: A.$('#q-seekcare').value.trim(),
          linkedActions: linked,
          monitorIds: monitors,
          focus: A.$('#q-focus').checked
        };
        if(isNew){
          issue = addIssue(patch);
        } else {
          updateIssue(id, patch);
        }
        /* 同时更新监测项的 issueId */
        monitors.forEach(function(mid){
          var mo = A.DB.monitorItems.find(function(m){ return m.id===mid; });
          if(mo && (mo.issueId===null || mo.issueId===undefined)) updateMonitorItem(mid, { issueId: issue.id });
        });
        A.save(); A.closeModal(); A.renderAll(); A.toast('已保存');
      }}
    ]
  });

  /* 新建监测项目：内联迷你表单 + 快捷模板 */
  var nmToggle=A.$('#btn-new-monitor');
  if(nmToggle) nmToggle.addEventListener('click',function(){
    var box=A.$('#q-new-monitor');
    if(box) box.style.display = (box.style.display==='none')?'block':'none';
  });
  A.$$('#modal .chip[data-nm]').forEach(function(ch){
    ch.addEventListener('click',function(){
      var n=A.$('#q-nm-name'), u=A.$('#q-nm-unit');
      if(n) n.value=ch.getAttribute('data-nm');
      if(u) u.value=ch.getAttribute('data-nmu');
    });
  });
  var nmAdd=A.$('#q-nm-add');
  if(nmAdd) nmAdd.addEventListener('click',function(){
    var n=A.$('#q-nm-name'), u=A.$('#q-nm-unit');
    var name=n?n.value.trim():'';
    if(!name){ A.toast('请先填项目名或点快捷模板'); return; }
    var mi=addMonitorItem({ name:name, kind:'num', unit:u?u.value.trim():'' });
    var list=A.$('#q-monitor-list');
    if(!list){
      /* 无列表时先创建容器 */
      var wrap=document.createElement('div');
      wrap.id='q-monitor-list';
      wrap.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:4px';
      nmAdd.parentNode.insertBefore(wrap, nmAdd.parentNode.querySelector('#q-new-monitor'));
      list=A.$('#q-monitor-list');
    }
    var lab=document.createElement('label');
    lab.style.cssText='display:flex;align-items:center;gap:6px;font-size:.85rem;margin-right:14px';
    lab.innerHTML='<input type="checkbox" value="'+mi.id+'" checked>'+A.esc(mi.name);
    list.appendChild(lab);
    if(n){ n.value=''; } if(u){ u.value=''; }
    A.toast('已添加「'+mi.name+'」，保存问题后生效');
  });
}

/* ========== 编辑 / 添加事件弹窗 ========== */
function openEventDialog(ev){
  var obj = ev || blankEvent();
  var isNew = !ev;
  var issueOpts = A.DB.issues.map(function(i){
    return '<label style="display:flex;align-items:center;gap:6px;font-size:.85rem;margin-right:14px"><input type="checkbox" value="'+i.id+'" '
      + ((obj.issueIds||[]).indexOf(i.id)>=0?'checked':'')+'>'+A.esc(i.name)+'</label>';
  }).join('');
  var html='<div class="chart-note" style="text-align:left;margin-bottom:8px">化验复查建议<b>按单项录入</b>：描述写指标名（如 总胆固醇、ALT），填数值和单位；低频项目（血脂、肝功、糖化、尿酸）复查时录入即可。点快捷模板可自动填名称和单位。</div>'
    + '<div class="chip-row" style="margin-bottom:10px">'
    + [['总胆固醇','mmol/L'],['低密度脂蛋白胆固醇','mmol/L'],['甘油三酯','mmol/L'],['高密度脂蛋白胆固醇','mmol/L'],['ALT','U/L'],['AST','U/L'],['GGT','U/L'],['糖化血红蛋白','%'],['血尿酸','μmol/L']]
      .map(function(x){ return '<button type="button" class="chip lab-chip" data-lab="'+x[0]+'" data-labu="'+x[1]+'">'+x[0]+'</button>'; }).join('')
    + '</div>'
    + '<div class="field-row"><div class="field"><label>类型</label><select id="q-ev-type">'
    + EVENT_TYPES.map(function(t){ return '<option '+(obj.type===t?'selected':'')+'>'+t+'</option>'; }).join('')
    + '</select></div><div class="field"><label>日期</label><input id="q-ev-date" type="date" value="'+(obj.date||A.todayStr())+'" />'
    + '<label style="display:flex;align-items:center;gap:4px;font-size:.78rem;color:#6b7280;margin-top:4px"><input type="checkbox" id="q-ev-approx" '+(obj.approxDate?'checked':'')+'> 大致日期</label></div></div>';
  html += '<div class="field"><label>关联健康问题</label><div id="q-ev-issues" style="display:flex;flex-wrap:wrap;gap:4px">'+issueOpts+'</div></div>';
  html += '<div class="field"><label>指标／事件描述</label><textarea id="q-ev-desc">'+A.esc(obj.description)+'</textarea></div>';
  html += '<div class="field-row"><div class="field"><label>数值（可选）</label><input id="q-ev-value" value="'+(obj.value!=null?obj.value:'')+'" /></div>'
    + '<div class="field"><label>单位</label><input id="q-ev-unit" value="'+A.esc(obj.valueUnit)+'" placeholder="mmol/L / kg / mm 等" /></div></div>';
  html += '<div class="field-row"><div class="field"><label>来源</label><input id="q-ev-source" value="'+A.esc(obj.source)+'" /></div>'
    + '<div class="field"><label>备注</label><input id="q-ev-notes" value="'+A.esc(obj.notes)+'" /></div></div>';

  A.showModal({
    title:(isNew?'新增':'编辑')+'事件',
    body:html,
    buttons:[
      {label:'取消',cls:'ghost',onClick:A.closeModal},
      {label:'保存',cls:'',onClick:function(){
        var issueIds = [];
        A.$$('#q-ev-issues input:checked').forEach(function(c){ issueIds.push(+c.value); });
        var valRaw = A.$('#q-ev-value').value.trim();
        var valNum = valRaw==='' ? null : (A.hasNum(valRaw) ? A.num(valRaw) : valRaw);
        var patch = {
          type: A.$('#q-ev-type').value,
          date: A.$('#q-ev-date').value || A.todayStr(),
          approxDate: A.$('#q-ev-approx').checked,
          issueIds: issueIds,
          description: A.$('#q-ev-desc').value,
          value: valNum,
          valueUnit: A.$('#q-ev-unit').value,
          source: A.$('#q-ev-source').value,
          notes: A.$('#q-ev-notes').value
        };
        if(isNew){ addEvent(patch); }
        else { updateEvent(obj.id, patch); }
        A.save(); A.closeModal(); A.renderAll(); A.toast('已保存');
      }}
    ]
  });

  /* 化验快捷模板：自动填名称和单位 */
  A.$$('#modal .lab-chip').forEach(function(ch){
    ch.addEventListener('click',function(){
      var d=A.$('#q-ev-desc'), u=A.$('#q-ev-unit');
      if(d) d.value=ch.getAttribute('data-lab');
      if(u) u.value=ch.getAttribute('data-labu');
    });
  });
}

/* ========== 批量录入化验单 ========== */
var LAB_PRESETS = [
  ['空腹血糖','mmol/L'],['餐后2小时血糖','mmol/L'],['糖化血红蛋白','%'],
  ['总胆固醇','mmol/L'],['甘油三酯','mmol/L'],['低密度脂蛋白胆固醇','mmol/L'],['高密度脂蛋白胆固醇','mmol/L'],
  ['ALT','U/L'],['AST','U/L'],['GGT','U/L'],['血尿酸','μmol/L'],['肌酐','μmol/L']
];

function labRowHtml(name, unit){
  var issueOpts = '<option value="">不关联</option>'
    + A.DB.issues.filter(function(i){ return !i.archived; })
        .map(function(i){ return '<option value="'+i.id+'">'+A.esc(i.name)+'</option>'; }).join('');
  return '<div class="lab-row" data-row>'
    + '<input class="lr-name" placeholder="指标名（如 ALT）" value="'+A.esc(name||'')+'">'
    + '<input class="lr-value" type="number" step="any" placeholder="数值">'
    + '<input class="lr-unit" placeholder="单位" value="'+A.esc(unit||'')+'">'
    + '<select class="lr-issue">'+issueOpts+'</select>'
    + '<button type="button" class="lr-del" title="移除">✕</button>'
    + '</div>';
}

function openLabBatchDialog(){
  var html = '<div class="chart-note" style="text-align:left;margin-bottom:8px">一次录完整张化验单：点下方指标可直接添加一行，填数值即可。保存后会同时生成事件，并自动把该指标接入对应问题的趋势。</div>';
  html += '<div class="field-row"><div class="field"><label>检查日期</label><input id="lab-date" type="date" value="'+A.todayStr()+'"></div>'
    + '<div class="field"><label>来源</label><input id="lab-source" placeholder="如：体检报告 / 医院复查"></div></div>';
  html += '<div class="chip-row" style="margin-bottom:10px">'
    + LAB_PRESETS.map(function(x){ return '<button type="button" class="chip lab-pre" data-n="'+x[0]+'" data-u="'+x[1]+'">'+x[0]+'</button>'; }).join('')
    + '</div>';
  html += '<div class="lab-head"><span>指标</span><span>数值</span><span>单位</span><span>关联问题</span><span></span></div>';
  html += '<div id="lab-rows">'+labRowHtml('','')+'</div>';
  html += '<button type="button" class="btn small ghost" id="lab-add-row" style="margin-top:6px">＋自定义一行</button>';

  A.showModal({
    title:'批量录入化验',
    body:html,
    buttons:[
      {label:'取消',cls:'ghost',onClick:A.closeModal},
      {label:'保存全部',cls:'',onClick:function(){
        var date = A.$('#lab-date').value || A.todayStr();
        var source = A.$('#lab-source').value.trim() || '检查';
        var n=0, created=[];
        A.$$('#lab-rows .lab-row').forEach(function(row){
          var nameEl=row.querySelector('.lr-name');
          var valEl =row.querySelector('.lr-value');
          var unitEl=row.querySelector('.lr-unit');
          var issEl =row.querySelector('.lr-issue');
          var name=(nameEl?nameEl.value:'').trim();
          var raw =(valEl?valEl.value:'').trim();
          if(!name || raw==='') return;
          if(!A.hasNum(raw)) return;
          var val=A.num(raw), unit=(unitEl?unitEl.value:'').trim();
          var iid = issEl && issEl.value ? +issEl.value : null;
          addEvent({ type:'检查', date:date, issueIds: iid?[iid]:[], description:name, value:val, valueUnit:unit, source:source });
          n++;
          if(iid){
            /* 确保该问题有同名监测项，并建立关联，让复查值进趋势图 */
            var mi = A.DB.monitorItems.find(function(m){ return m.issueId===iid && sameLabName(m.name,name); });
            if(!mi){
              mi = addMonitorItem({ issueId:iid, name:name, kind:'num', unit:unit });
            }
            var issue = A.DB.issues.find(function(i){ return i.id===iid; });
            if(issue){
              issue.monitorIds = issue.monitorIds||[];
              if(issue.monitorIds.indexOf(mi.id)<0) issue.monitorIds.push(mi.id);
            }
            created.push(name);
          }
        });
        if(!n){ A.toast('请至少填写一条有数值的指标'); return; }
        A.save(); A.closeModal(); A.renderAll();
        A.toast('已录入 '+n+' 项化验'+(created.length?'，并接入趋势':''));
      }}
    ]
  });

  A.$$('#modal .lab-pre').forEach(function(ch){
    ch.addEventListener('click',function(){
      var box=A.$('#lab-rows');
      if(!box) return;
      var wrap=document.createElement('div');
      wrap.innerHTML=labRowHtml(ch.getAttribute('data-n'), ch.getAttribute('data-u'));
      var row=wrap.firstChild;
      /* 只有一个问题时默认关联它，减少选择成本 */
      var live=A.DB.issues.filter(function(i){ return !i.archived; });
      if(live.length===1){ row.querySelector('.lr-issue').value=String(live[0].id); }
      box.appendChild(row);
      var v=row.querySelector('.lr-value'); if(v) v.focus();
    });
  });
  var addRow=A.$('#lab-add-row');
  if(addRow) addRow.addEventListener('click',function(){
    var box=A.$('#lab-rows'); if(!box) return;
    var wrap=document.createElement('div'); wrap.innerHTML=labRowHtml('',''); box.appendChild(wrap.firstChild);
  });
  A.$$('#modal .lr-del').forEach(function(b){
    b.addEventListener('click',function(){
      var row=b.closest('.lab-row'); if(row) row.parentNode.removeChild(row);
    });
  });
}

/* ========== 问题详情弹窗 ========== */
function openIssueDetail(id){
  var issue = A.DB.issues.find(function(i){ return i.id===id; });
  if(!issue) return;
  var evs = A.DB.events.filter(function(e){ return (e.issueIds||[]).indexOf(id)>=0; }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var html='<div class="modal-line"><b>'+A.esc(issue.name)+'</b> · '+A.esc(issue.type)+(issue.focus?' · 本轮重点':'')+'</div>';
  if(issue.seekCare){
    html += '<div class="aic-care" style="margin-top:8px">🏥 报告建议就诊：'+A.esc(issue.seekCare)+'（打卡不能替代就医）</div>';
  }
  if(/息肉/.test(issue.name||'')){
    html += '<div class="chart-note" style="text-align:left;margin-top:8px">息肉随访节奏（供参考，遵医嘱）：≤5mm 且无危险因素 → 一般无需随访；6～9mm → 6个月、1年、2年各复查一次超声；≥10mm → 建议肝胆外科评估。</div>';
  }
  html += '<div class="chart-note" style="margin:6px 0"><b>当前情况：</b>'+A.esc(issue.currentStatus||'待记录')+'</div>';
  html += '<div class="chart-note"><b>来源：</b>'+A.esc(issue.source||'待补充')+' <b>· 发生/检查日期：</b>'+(issue.occurDate?A.dateLabel(issue.occurDate):'待补充')+'</div>';
  html += '<div class="chart-note"><b>本轮目标：</b>'+A.esc(issue.cycleGoal||'待设置')+'</div>';
  if(issue.linkedActions && issue.linkedActions.length){
    html += '<div class="chart-note"><b>关联行动：</b>'+issue.linkedActions.map(function(k){ return A.esc(ACTION_MAP[k]||k); }).join('、')+'</div>';
  }
  if(issue.keywords && issue.keywords.length){
    html += '<div class="chart-note"><b>关键词：</b>'+issue.keywords.map(A.esc).join('、')+'</div>';
  }
  if(evs.length){
    html += '<details class="fold" open><summary>相关事件（'+evs.length+' 条）</summary>';
    evs.forEach(function(ev){
      html += '<div class="tl-item"><div class="tl-dot"></div><div class="tl-body">';
      html += '<div class="tl-head"><span class="tl-type">'+A.esc(ev.type)+'</span><span class="tl-date">'+A.dateLabel(ev.date)+'</span></div>';
      if(ev.description) html += '<div class="tl-desc">'+A.esc(ev.description)+'</div>';
      if(ev.value!=null) html += '<div class="tl-val">'+A.esc(String(ev.value))+(ev.valueUnit?' '+A.esc(ev.valueUnit):'')+'</div>';
      html += '</div></div>';
    });
    html += '</details>';
  }
  A.showModal({
    title:'问题详情',
    body:html,
    buttons:[{label:'关闭',cls:'',onClick:A.closeModal},{label:'编辑',cls:'secondary',onClick:function(){ A.closeModal(); openIssueDialog(id); }}]
  });
}

/* ========== 周期调整弹窗 ========== */
function openCycleDialog(){
  var c = A.currentCycle();
  var html='<div class="field"><label>周期名称</label><input id="q-c-name" value="'+A.esc(c.name||'')+'" /></div>';
  html += '<div class="field-row"><div class="field"><label>开始日期</label><input id="q-c-start" type="date" value="'+c.start+'" /></div>'
    + '<div class="field"><label>结束日期</label><input id="q-c-end" type="date" value="'+c.end+'" /></div></div>';
  html += '<div class="field"><label>复盘日期</label><input id="q-c-review" type="date" value="'+(c.reviewDate||'')+'" /></div>';
  A.showModal({
    title:'调整周期',
    body: html,
    buttons:[
      {label:'取消',cls:'ghost',onClick:A.closeModal},
      {label:'保存',cls:'',onClick:function(){
        var start = A.$('#q-c-start').value, end = A.$('#q-c-end').value;
        if(!start || !end){ A.toast('请填写开始和结束日期'); return; }
        if(end<start){ A.toast('结束日期不能早于开始日期'); return; }
        A.DB.cycles[0] = Object.assign({}, c, { start:start, end:end, reviewDate: A.$('#q-c-review').value||null, name: A.$('#q-c-name').value||c.name });
        A.save(); A.closeModal(); A.renderAll(); A.toast('已更新');
      }}
    ]
  });
}

/* ========== 月度复盘弹窗 ========== */
function openReviewDialog(){
  var issues = A.DB.issues.filter(function(i){ return i.focus && !i.archived; });
  var c = A.currentCycle();
  var today = A.todayStr();
  /* 查找已有复盘 */
  var existing = A.DB.reviews.find(function(r){ return r.cycleId===c.id || (r.reviewDate||'').slice(0,7)===c.start.slice(0,7); });
  var html = '<div class="chart-note" style="margin-bottom:10px">周期 '+A.cycleLabel()+' · 复盘日期 '+A.dateLabel(today)+'</div>';
  if(issues.length===0){
    html += '<div class="empty">暂未设置重点问题。请先在档案页设置 1~3 项重点后再做复盘。</div>';
  } else {
    issues.forEach(function(issue){
      var oldEval = existing ? (existing.evaluations||[]).find(function(e){ return e.issueId===issue.id; }) : null;
      html += '<div class="field"><label><b>'+A.esc(issue.name)+'</b></label>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 6px">';
      RATINGS.forEach(function(r){
        html += '<label style="font-size:.78rem;margin-right:8px"><input type="radio" name="rating-'+issue.id+'" value="'+r+'" '+(oldEval&&oldEval.rating===r?'checked':'')+'> '+r+'</label>';
      });
      html += '</div>'
        + '<textarea id="q-r-note-'+issue.id+'" placeholder="依据：本人感受 / 监测数据 / 医生结论（可选）">'+A.esc(oldEval?oldEval.note||'':'')+'</textarea>'
        + '</div>';
    });
    html += '<div class="field"><label>下一轮安排（一句话）</label>'
      + '<input id="q-r-next" value="'+A.esc(existing?existing.nextPlan||'':'')+'" placeholder="例如：保留饮食规律、步行和放松，血糖改为每月复查" /></div>';
  }
  A.showModal({
    title:'月度复盘',
    body: html,
    buttons:[
      {label:'取消',cls:'ghost',onClick:A.closeModal},
      {label:'保存复盘',cls:'',onClick:function(){
        var evaluations = issues.map(function(issue){
          var r = A.$('input[name="rating-'+issue.id+'"]:checked');
          return {
            issueId: issue.id,
            rating: r ? r.value : '信息不足，暂不能判断',
            evidence: '',
            note: (A.$('#q-r-note-'+issue.id).value).trim()
          };
        });
        var nextPlan = A.$('#q-r-next').value.trim();
        var review = {
          id: getNextId(A.DB.reviews),
          cycleId: c.id,
          reviewDate: today,
          completedAt: nowISO(),
          evaluations: evaluations,
          nextPlan: nextPlan
        };
        /* 替换同周期旧复盘 */
        var oldIdx = A.DB.reviews.findIndex(function(r){ return r.cycleId===c.id || (r.reviewDate||'').slice(0,7)===c.start.slice(0,7); });
        if(oldIdx>=0) A.DB.reviews[oldIdx] = review;
        else A.DB.reviews.push(review);
        A.save(); A.closeModal(); A.renderAll(); A.toast('复盘已保存');
      }}
    ]
  });
}

/* ========== 初始化引导 ==========
 * 首次进入健康档案页、且 issues 为空时弹出。
 * 方案：只从 DB.baseline 读取已有值预填，不硬编码任何体检指标。
 */
function bootstrapIfEmpty(){
  if(A.DB.issues && A.DB.issues.length>0) return;
  var bw = A.DB.baseline.weight || {};
  var bg = A.DB.baseline.glucose || {};
  var html = '<div class="modal-line">档案目前是空的。以下步骤帮您从已有的基线数据开始。</div>';
  html += '<div class="chart-note" style="margin:8px 0">体检报告里的肝酶、血脂、脂肪肝、胆囊息肉、肾结晶、骨质增生等，请在保存本页后点「＋添加健康问题或信息」逐条录入——这些数值不硬编码进源码，只保存在本机。</div>';
  var prefillWeight = (bw.value ? bw.value + ' kg' : '');
  var prefillGlucose = (bg.value ? bg.value + ' mmol/L' : '');
  html += '<div class="field"><label>自动生成：体重管理</label><input id="b-weight-name" value="体重/BMI 管理" /></div>';
  html += '<div class="field"><label>当前情况（含数值和来源，可编辑）</label>'
    + '<textarea id="b-weight-status">'+(prefillWeight?('基线 '+prefillWeight+'，来源：'+(bw.source||'体检报告')+'。BMI 待确认。'):'')+'</textarea></div>';
  html += '<div class="field"><label>自动生成：血糖管理</label><input id="b-glucose-name" value="血糖管理" /></div>';
  html += '<div class="field"><label>当前情况</label>'
    + '<textarea id="b-glucose-status">'+(prefillGlucose?('基线空腹 '+prefillGlucose+'。测量方式：'+(bg.source||'待补充')+'。'):'')+'</textarea></div>';
  html += '<div class="field"><label><input type="checkbox" id="b-generate" checked> 生成这两条，并设为本轮重点</label></div>';

  A.showModal({
    title:'初始化健康档案',
    body: html,
    buttons:[
      {label:'稍后再填',cls:'ghost',onClick:A.closeModal},
      {label:'跳过，手动添加',cls:'secondary',onClick:A.closeModal},
      {label:'生成并开始',cls:'',onClick:function(){
        if(A.$('#b-generate').checked){
          var wName = A.$('#b-weight-name').value.trim();
          var gName = A.$('#b-glucose-name').value.trim();
          if(wName){
            addIssue({
              name: wName, type:'检查指标',
              currentStatus: A.$('#b-weight-status').value.trim(),
              source: bw.source || '体检报告',
              occurDate: bw.date || null,
              cycleGoal:'待设置', focus:true
            });
            /* 自动建体重监测项 */
            addMonitorItem({ issueId: A.DB.issues[A.DB.issues.length-1].id, name:'体重', kind:'num', unit:'kg' });
          }
          if(gName){
            var gIssue = addIssue({
              name: gName, type:'检查指标',
              currentStatus: A.$('#b-glucose-status').value.trim(),
              source: bg.source || '',
              occurDate: bg.date || null,
              cycleGoal:'待设置', focus:true
            });
            addMonitorItem({ issueId: gIssue.id, name:'空腹血糖', kind:'num', unit:'mmol/L' });
          }
          /* 关联监测项 */
          A.DB.issues.forEach(function(i){
            if(i.focus && (i.name==='体重/BMI 管理' || i.name==='血糖管理')){
              i.monitorIds = A.DB.monitorItems.filter(function(m){ return m.issueId===i.id; }).map(function(m){ return m.id; });
            }
          });
        }
        A.save(); A.closeModal(); A.renderAll();
      }}
    ]
  });
}

/* ========== 注册渲染入口 ========== */
A.setArchiveRender(function(){
  renderArchive();
  /* 首次空档案时弹出初始化引导（只在 archive tab 激活后触发一次） */
  if(!window.__archive_bootstrapped){
    window.__archive_bootstrapped = true;
    bootstrapIfEmpty();
  }
});

/* 暴露给自测 */
window.__h30_arch = {
  addIssue: addIssue, updateIssue: updateIssue, deleteIssue: deleteIssue, setIssueFocus: setIssueFocus, archiveIssue: archiveIssue,
  addEvent: addEvent, updateEvent: updateEvent, deleteEvent: deleteEvent,
  addMonitorItem: addMonitorItem, updateMonitorItem: updateMonitorItem, deleteMonitorItem: deleteMonitorItem,
  blankIssue: blankIssue, blankEvent: blankEvent, blankMonitorItem: blankMonitorItem,
  collectMonitorPoints: collectMonitorPoints, renderArchive: renderArchive,
  getNextId: getNextId
};

})();
