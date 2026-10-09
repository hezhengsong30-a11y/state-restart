/* ============================================================
   状态重启 · 第一版
   本地状态引擎 + 本机存储 + AI增强（OpenAI兼容，可配置） + 本地降级
   ============================================================ */
'use strict';

/* ---------------- 常量与配置 ---------------- */

var STORE_RECORDS = 'czcq_records_v1';
var STORE_SETTINGS = 'czcq_settings_v1';

var DIMS = [
  { key: 'energy',  name: '精力',       hint: '身体和心理的电量' },
  { key: 'emotion', name: '情绪稳定度', hint: '内心是否平静' },
  { key: 'control', name: '掌控感',     hint: '事情是否在手里' },
  { key: 'action',  name: '行动意愿',   hint: '想不想动起来' }
];

var TRIGGERS = ['EaseBud项目', '团队协作', '本职工作', '家庭或生活', '身体疲惫', '重大决策', '其他'];

// 五类状态：key / 名称 / 颜色 / 关键追问（每类只问一个问题）
var STATES = {
  burnout: {
    name: '耗竭', cls: 's1',
    question: '继续工作一小时和先恢复二十分钟，哪个更可能产生结果？'
  },
  disorder: {
    name: '失序', cls: 's3',
    question: '今天什么结果不发生，会真正造成损失？'
  },
  avoidance: {
    name: '回避', cls: 's4',
    question: '你其实已经知道、但一直不愿意做的动作是什么？'
  },
  selfdoubt: {
    name: '自我否定', cls: 's5',
    question: '目前有哪些事实能够证明这个结论？'
  },
  overload: {
    name: '过载', cls: 's2',
    question: '现在有哪些事情可以明确推迟？'
  },
  stable: {
    name: '平稳', cls: '', question: ''
  }
};

// 本地规则恢复卡（AI 不可用时的降级内容）
var LOCAL_CARDS = {
  burnout: {
    bias: '你以为撑着就是负责，但低精力下的产出和质量都在打折，还在透支明天。',
    avoid: '不要做重大判断；不要熬夜补进度；不要答应任何额外任务。',
    body: '立即恢复 20 分钟：离开屏幕，闭眼小睡或出去走一圈，先定好 20 分钟的闹钟再走。',
    work: '恢复后只挑一件 15 分钟能收尾的小事，做完就停。'
  },
  disorder: {
    bias: '你觉得所有事都失控了，其实失控的只是「没排顺序」这一件事。',
    avoid: '不要一次性做全部计划；不要答应新的任何事情。',
    body: '把脑子里所有待办倒在一页纸上，只圈出 1 件，其余合上本子。',
    work: '只做圈中那一件的最小 15 分钟切片。'
  },
  avoidance: {
    bias: '你把「不想面对」当成了「还不着急」，但心里一直挂着它，这才是真正的消耗源。',
    avoid: '不要用「再想想」代替决定；不要开启新的无关任务来转移注意力。',
    body: '设 2 分钟计时，只写两行：我在躲什么？最坏结果是什么？',
    work: '做那个你知道必须做的动作的第一步：发那条消息 / 建那个文档 / 拨那个电话，只做第一步。'
  },
  selfdoubt: {
    bias: '你正在把「一件事没做好」推演成「我不行」，这是以偏概全。',
    avoid: '不要在此状态下评价自己的能力；不要写辞职、退出类的决定；不要发情绪化消息。',
    body: '离开屏幕 2 分钟：喝一杯水，肩膀下沉，深呼吸 5 次。',
    work: '写下今天已确认完成的 3 件事，无论多小。'
  },
  overload: {
    bias: '你默认所有事都重要且都今天要——这不成立。',
    avoid: '不要同时开多个任务；不要在低价值的事情上继续耗着。',
    body: '闭眼 1 分钟，做 3 轮 4-7-8 呼吸（吸4秒、停7秒、呼8秒）。',
    work: '从清单里明确推迟 2 件事，然后只做剩下的第一件。'
  }
};

var STATE_COLORS = { burnout: '#e5484d', overload: '#f59f00', disorder: '#d4a72c', avoidance: '#8b7fd4', selfdoubt: '#5b7fd4', stable: '#2f9e63' };

var FOLLOWUP_OPTIONS = [
  { key: '30m', label: '30分钟后', offset: 30 * 60 * 1000 },
  { key: '2h', label: '2小时后', offset: 2 * 3600 * 1000 },
  { key: 'night', label: '今天晚上', offset: -1 } // 今晚 21:00
];

var SAFE_WORDS = ['自杀', '自残', '伤害自己', '不想活', '活不下去', '轻生', '结束生命', '结束自己', '割腕', '跳楼', '想死', '去死'];
var SAFE_MSG = '你现在的痛苦比你以为的更值得被认真对待。请立即：<br><br>1. 联系一位你信任的人，告诉TA你现在很难受；<br>2. 拨打 24 小时心理援助热线：<b>12356</b> 或希望24热线 <b>400-161-9995</b>。<br><br>工具的急救流程先停在这里，人比事情重要。';

var DEFAULT_SETTINGS = {
  aiEnabled: true,
  aiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  aiModel: 'glm-4-flash',
  aiKey: '39224fcfb1584593bfa177b513be3ff9.10tgc78C12Uq33dx'
};

/* ---------------- 存取 ---------------- */

function loadJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

var records = loadJSON(STORE_RECORDS, []);
var settings = Object.assign({}, DEFAULT_SETTINGS, loadJSON(STORE_SETTINGS, {}));

function saveRecords() { saveJSON(STORE_RECORDS, records); }
function saveSettings() { saveJSON(STORE_SETTINGS, settings); }

/* ---------------- 工具函数 ---------------- */

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function fmtDate(ts) {
  var d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function fmtTime(ts) {
  var d = new Date(ts);
  return fmtDate(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function todayStr(ts) { return fmtDate(ts || Date.now()); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

var toastTimer = null;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
}

function copyText(text, okMsg) {
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(okMsg || '已复制'); }
    catch (e) { toast('复制失败，请长按文本手动复制'); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast(okMsg || '已复制'); }, fallback);
  } else { fallback(); }
}

/* 风险信号检测 */
function checkSafety(text) {
  if (!text) return false;
  for (var i = 0; i < SAFE_WORDS.length; i++) {
    if (text.indexOf(SAFE_WORDS[i]) >= 0) return true;
  }
  return false;
}
function showSafeModal() {
  $('safeModalBody').innerHTML = SAFE_MSG;
  $('safeModal').style.display = 'flex';
}

/* ---------------- 状态判定引擎（本地规则） ----------------
   优先级：耗竭 > 失序 > 回避 > 自我否定 > 过载 > 平稳
------------------------------------------------------------- */
function identifyState(scores) {
  var e = scores.energy, m = scores.emotion, c = scores.control, a = scores.action;

  var primary = 'stable', secondary = null;
  if (e <= 3) primary = 'burnout';
  else if (c <= 3) primary = 'disorder';
  else if (a <= 3 && e >= 5) primary = 'avoidance';
  else if (m <= 4) primary = 'selfdoubt';
  else if (e <= 6 && c <= 5) primary = 'overload';

  // 次状态：剩余维度里最低且 <=4 的
  var rest = [
    { k: 'burnout', v: e }, { k: 'selfdoubt', v: m },
    { k: 'disorder', v: c }, { k: 'avoidance', v: a }
  ].filter(function (x) { return x.k !== primary && x.v <= 4; })
    .sort(function (x, y) { return x.v - y.v; });
  if (rest.length) secondary = rest[0].k;

  if (primary === 'stable' && (Math.min(e, m, c, a) >= 7)) return { primary: 'stable', secondary: null };
  if (primary === 'stable') primary = 'overload'; // 有明显低谷但未达任一阈值，按轻度过载处理
  return { primary: primary, secondary: secondary };
}

/* ---------------- 视图管理 ---------------- */

var currentView = 'home';
function showView(name) {
  currentView = name;
  ['home', 'flow', 'pattern', 'settings'].forEach(function (v) {
    $('view-' + v).style.display = v === name ? '' : 'none';
  });
  document.querySelectorAll('.topnav-item').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-nav') === (name === 'flow' ? 'home' : name));
  });
  if (name === 'home') renderHome();
  if (name === 'pattern') renderPattern();
  if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

/* ---------------- 首页 ---------------- */

function renderHome() {
  // 连续天数
  var days = {};
  records.forEach(function (r) { days[todayStr(r.ts)] = 1; });
  var streak = 0, d = new Date();
  // 今天没记录也从昨天起算连续
  if (!days[todayStr(d.getTime())]) d.setDate(d.getDate() - 1);
  while (days[todayStr(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }
  $('statStreak').textContent = streak;

  // 本周最常状态
  var weekAgo = Date.now() - 7 * 86400 * 1000;
  var cnt = {};
  records.forEach(function (r) {
    if (r.ts >= weekAgo && r.state && r.state.primary && r.state.primary !== 'stable') {
      cnt[r.state.primary] = (cnt[r.state.primary] || 0) + 1;
    }
  });
  var top = null, max = 0;
  Object.keys(cnt).forEach(function (k) { if (cnt[k] > max) { max = cnt[k]; top = k; } });
  $('statTopState').textContent = top ? STATES[top].name : '—';
  $('statTopState').style.color = top ? STATE_COLORS[top] : '';

  // 最近有效调整方法
  var lastValid = null;
  for (var i = records.length - 1; i >= 0; i--) {
    var r = records[i];
    if (r.followup && r.followup.done && r.followup.effective && r.card && r.card.work) { lastValid = r; break; }
  }
  var lc = $('lastMethodCard');
  if (lastValid) {
    lc.style.display = '';
    $('lastMethodBody').textContent = lastValid.card.work + '（' + fmtDate(lastValid.ts) + '验证有效）';
  } else { lc.style.display = 'none'; }
}

/* ---------------- 流程（急救 / 日常记录） ---------------- */

var flow = null; // 当前流程状态

function startFlow(type) { // type: 'rescue' | 'daily'
  flow = {
    type: type,
    step: 'identify',
    scores: { energy: 5, emotion: 5, control: 5, action: 5 },
    triggers: [],
    text: '',
    state: null,
    answer: '',
    question: '',
    card: null,
    followupAt: null,
    followupLabel: ''
  };
  showView('flow');
  $('flowTitle').textContent = type === 'rescue' ? '状态急救' : '今日记录';
  $('flowIntro').textContent = type === 'rescue'
    ? '先给此刻的状态打分，识别你卡在哪一类，再进入恢复流程。'
    : '花 1 分钟记录今天的状态，积累你的个人规律。';
  renderIdentify();
  gotoStep('identify');
}

function gotoStep(step) {
  flow.step = step;
  var order = ['identify', 'question', 'card', 'followup', 'done'];
  var idx = order.indexOf(step);
  $('flowStep').textContent = flow.type === 'daily' && (step === 'question' || step === 'card')
    ? (idx + 1) + '/4' : (idx + 1) + '/' + order.length;
  ['identify', 'question', 'card', 'followup', 'done'].forEach(function (s) {
    $('step-' + s).style.display = s === step ? '' : 'none';
  });
  $('flowBack').style.display = (step === 'done') ? 'none' : '';
  $('flowBack').textContent = step === 'identify' ? '‹ 取消' : '‹ 上一步';
  window.scrollTo(0, 0);
}

/* --- 步骤1：识别 --- */
function renderIdentify() {
  var g = $('sliderGroup');
  g.innerHTML = '';
  DIMS.forEach(function (dim) {
    var item = document.createElement('div');
    item.className = 'slider-item';
    item.innerHTML =
      '<div class="slider-head"><span class="slider-name">' + dim.name +
      ' <span class="slider-hint">' + dim.hint + '</span></span>' +
      '<span class="slider-val" id="val-' + dim.key + '">5</span></div>' +
      '<input type="range" min="0" max="10" step="1" value="5" id="sl-' + dim.key + '">';
    g.appendChild(item);
    var input = item.querySelector('input');
    function sync() {
      var v = +input.value;
      flow.scores[dim.key] = v;
      $('val-' + dim.key).textContent = v;
      input.style.setProperty('--pct', (v * 10) + '%');
    }
    input.addEventListener('input', sync);
    sync();
  });

  var tg = $('triggerGroup');
  tg.innerHTML = '';
  TRIGGERS.forEach(function (t) {
    var b = document.createElement('button');
    b.className = 'chip';
    b.textContent = t;
    b.onclick = function () {
      var i = flow.triggers.indexOf(t);
      if (i >= 0) { flow.triggers.splice(i, 1); b.classList.remove('active'); }
      else { flow.triggers.push(t); b.classList.add('active'); }
    };
    tg.appendChild(b);
  });
  $('freeText').value = '';
  $('stateResult').style.display = 'none';
  $('btnIdentifyNext').removeAttribute('data-confirm');
  $('btnIdentifyNext').textContent = '识别状态';
}

function doIdentify() {
  flow.text = $('freeText').value.trim();

  // 安全边界：文字中出现风险信号 → 中断流程
  if (checkSafety(flow.text)) { showSafeModal(); return; }

  flow.state = identifyState(flow.scores);
  var sr = $('stateResult');
  var p = STATES[flow.state.primary];
  var dimStr = DIMS.map(function (d) { return d.name + ' ' + flow.scores[d.key]; }).join(' · ');
  var trigStr = flow.triggers.length ? flow.triggers.join('、') : '未选择';
  sr.innerHTML =
    '<div class="state-main" style="color:' + (STATE_COLORS[flow.state.primary] || 'var(--ok)') + '">' +
    esc(p.name) + '</div>' +
    '<div class="state-sub">' + (flow.state.secondary ? '次要状态：' + esc(STATES[flow.state.secondary].name) + ' · ' : '') +
    esc(dimStr) + '<br>诱因：' + esc(trigStr) + '</div>';
  sr.style.display = '';

  $('btnIdentifyNext').textContent = flow.type === 'daily' ? '保存记录' : '确认，进入关键追问';
  $('btnIdentifyNext').setAttribute('data-identified', '1');

  // 日常记录：识别后直接保存（含一条简短建议），不进追问
  if (flow.type === 'daily') {
    saveCurrentRecord();
    var sug = flow.state.primary === 'stable'
      ? '今天状态平稳，把有效的方法记下来，明天继续。'
      : '低维提示：优先照顾「' + lowestDimName() + '」，今晚睡前不要再加任务。';
    $('doneText').innerHTML = '已记录<br><span style="font-size:13px;font-weight:400;color:var(--ink-2)">' + esc(sug) + '</span>';
    gotoStep('done');
    return;
  }
  // 急救：识别结果已展示，第二次点击进入追问
  if ($('btnIdentifyNext').getAttribute('data-confirm') === '1') enterQuestion();
  $('btnIdentifyNext').setAttribute('data-confirm', '1');
}

function lowestDimName() {
  var min = 11, name = '';
  DIMS.forEach(function (d) { if (flow.scores[d.key] < min) { min = flow.scores[d.key]; name = d.name; } });
  return name;
}

/* --- 步骤2：追问 --- */
function enterQuestion() {
  var st = STATES[flow.state.primary];
  flow.question = st.question;
  $('qTag').textContent = st.name + ' · 只问一个问题';
  $('qText').textContent = st.question;
  $('answerText').value = '';
  $('aiStatus').textContent = '';
  $('aiStatus').className = 'ai-status';
  $('btnAnswerNext').disabled = false;
  gotoStep('question');
}

function doAnswer() {
  flow.answer = $('answerText').value.trim();
  if (!flow.answer) { toast('写一句事实也可以，比如：项目第二次被打回'); return; }
  if (checkSafety(flow.answer)) { showSafeModal(); return; }

  var btn = $('btnAnswerNext');
  btn.disabled = true;
  var status = $('aiStatus');
  status.className = 'ai-status';
  status.textContent = settings.aiEnabled ? 'AI 正在整理恢复卡…' : '使用本地规则生成恢复卡…';

  buildCard(function (card, viaAI) {
    flow.card = card;
    flow.viaAI = viaAI;
    status.textContent = '';
    btn.disabled = false;
    renderCard();
    gotoStep('card');
  }, function (err) {
    // AI 失败 → 本地降级
    flow.card = localCard();
    flow.viaAI = false;
    status.className = 'ai-status err';
    status.textContent = 'AI 暂不可用（' + err + '），已用本地规则生成。';
    btn.disabled = false;
    renderCard();
    gotoStep('card');
  });
}

/* --- 恢复卡构建 --- */
function localCard() {
  var key = flow.state.primary;
  var base = LOCAL_CARDS[key] || LOCAL_CARDS.overload;
  return {
    facts: flow.answer ? '从你的回答中提取：' + flow.answer : '把刚才回答里的客观事实整理在这里。',
    bias: base.bias,
    avoid: base.avoid,
    body: base.body,
    work: base.work
  };
}

function buildCard(done, fail) {
  if (!settings.aiEnabled || !settings.aiKey) { done(localCard(), false); return; }

  var st = STATES[flow.state.primary];
  var sys = '你是一位直接、务实的教练，服务于一个帮用户从负面状态恢复到可行动状态的工具。规则：\n' +
    '1. 不提供空泛鼓励（如"加油""你可以的"），语气直接、具体、口语化中文；\n' +
    '2. 不做心理或医学诊断；\n' +
    '3. 只输出 JSON，不要输出任何其他文字。\n' +
    '任务：根据用户的状态记录生成恢复卡，JSON 字段：\n' +
    '{"facts":"已确认事实：从用户回答中提取的客观事实，若回答含主观推演则剔除推演只留事实","bias":"用户正在进行的推演或认知偏差，1-2句，点破即可","avoid":"当前不宜作出的决定，1-2条，具体","body":"一个身体恢复动作，具体可立即执行，2-20分钟","work":"一个5-20分钟的工作动作，具体到第一步做什么"}';

  var user = '状态：' + st.name + '\n' +
    '评分：' + DIMS.map(function (d) { return d.name + '=' + flow.scores[d.key]; }).join('，') + '\n' +
    '诱因：' + (flow.triggers.join('、') || '未选择') + '\n' +
    '关键追问：' + flow.question + '\n' +
    '用户的回答：' + flow.answer;

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', settings.aiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + settings.aiKey);
    xhr.timeout = 30000;
    xhr.onload = function () {
      try {
        if (xhr.status !== 200) { fail('HTTP ' + xhr.status); return; }
        var data = JSON.parse(xhr.responseText);
        var content = data.choices[0].message.content.trim();
        content = content.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
        var card = JSON.parse(content);
        if (!card.work || !card.body) { fail('返回格式不完整'); return; }
        done({
          facts: card.facts || localCard().facts,
          bias: card.bias || '',
          avoid: card.avoid || '',
          body: card.body,
          work: card.work
        }, true);
      } catch (e) { fail('解析失败'); }
    };
    xhr.onerror = function () { fail('网络错误'); };
    xhr.ontimeout = function () { fail('超时'); };
    xhr.send(JSON.stringify({
      model: settings.aiModel,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.6,
      max_tokens: 600
    }));
  } catch (e) { fail('请求异常'); }
}

/* --- 步骤3：恢复卡渲染 --- */
function renderCard() {
  var st = STATES[flow.state.primary];
  var c = flow.card;
  var trigStr = flow.triggers.length ? flow.triggers.join('、') : '未明确';
  $('recoveryCard').innerHTML =
    '<div class="rc-head">' +
    '<div class="rc-state" style="color:' + (STATE_COLORS[flow.state.primary] || '') + '">' + esc(st.name) + ' · 恢复卡</div>' +
    '<div class="rc-trigger">触发因素：' + esc(trigStr) + (flow.viaAI ? ' · AI 整理' : ' · 本地规则') + '</div>' +
    '</div>' +
    rcSection('已确认事实', c.facts) +
    rcSection('你正在进行的推演 / 认知偏差', c.bias) +
    rcSection('当前不宜作出的决定', c.avoid) +
    rcSection('一个身体恢复动作', c.body, true) +
    rcSection('一个 5–20 分钟的工作动作', c.work, true);
}
function rcSection(label, body, strong) {
  return '<div class="rc-section"><div class="rc-label">' + esc(label) + '</div>' +
    '<div class="rc-body' + (strong ? ' action' : '') + '">' + esc(body) + '</div></div>';
}

/* --- 步骤4：回访 --- */
function renderFollowup() {
  var g = $('followupGroup');
  g.innerHTML = '';
  FOLLOWUP_OPTIONS.forEach(function (opt) {
    var b = document.createElement('button');
    b.className = 'chip' + (flow.followupAt && flow.followupLabel === opt.label ? ' active' : '');
    b.textContent = opt.label;
    b.onclick = function () {
      flow.followupAt = calcFollowupTs(opt);
      flow.followupLabel = opt.label;
      renderFollowup();
    };
    g.appendChild(b);
  });
  var box = $('remindBox');
  if (flow.followupAt) {
    box.textContent = '提醒文本（' + flow.followupLabel + '）：【状态重启】' + fmtTime(flow.followupAt) +
      ' 回访：刚才的恢复动作做了吗？花 1 分钟回来看看效果。';
    $('btnCopyRemind').style.display = '';
  } else {
    box.textContent = '未选择回访时间。建议至少选一个，急救才有闭环。';
    $('btnCopyRemind').style.display = 'none';
  }
}
function calcFollowupTs(opt) {
  if (opt.offset === -1) {
    var d = new Date(); d.setHours(21, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setTime(d.getTime() + 86400 * 1000); // 已过21点则明晚
    return d.getTime();
  }
  return Date.now() + opt.offset;
}

function saveCurrentRecord() {
  records.push({
    id: uid(),
    ts: Date.now(),
    type: flow.type,
    scores: flow.scores,
    triggers: flow.triggers.slice(),
    text: flow.text,
    state: flow.state,
    question: flow.question || '',
    answer: flow.answer || '',
    card: flow.card || null,
    viaAI: !!flow.viaAI,
    followup: { at: flow.followupAt || null, label: flow.followupLabel || '', done: false }
  });
  saveRecords();
}

function finishFlow() {
  saveCurrentRecord();
  $('doneText').textContent = '已保存';
  gotoStep('done');
}

/* ---------------- 回访检查与登记 ---------------- */

function checkFollowups() {
  var now = Date.now();
  var pending = null;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (r.followup && r.followup.at && !r.followup.done && r.followup.at <= now) {
      if (!pending || r.followup.at < pending.followup.at) pending = r; // 最早到期的先问
    }
  }
  if (pending) openFollowupModal(pending);
}

function openFollowupModal(r) {
  var body = $('followupModalBody');
  var stName = r.state && r.state.primary ? STATES[r.state.primary].name : '';
  body.innerHTML =
    '<div style="color:var(--ink-2);font-size:12px">' + fmtTime(r.followup.at) + ' 的回访 · 当时状态：' + esc(stName) + '</div>' +
    '<div class="fb-q">当时的动作执行了吗？</div>' +
    '<div class="chip-group" id="fbExec"><button class="chip" data-v="1">执行了</button><button class="chip" data-v="0">没执行</button></div>' +
    '<div id="fbExeced" style="display:none">' +
    '<div class="fb-q">现在感觉好些吗？</div>' +
    '<div class="chip-group" id="fbEff"><button class="chip" data-v="1">有效</button><button class="chip" data-v="0">没效果</button></div>' +
    '<div class="field" style="margin-top:10px"><div class="field-label">现在的精力分（0–10）</div>' +
    '<input type="range" min="0" max="10" value="5" id="fbEnergy"></div>' +
    '</div>' +
    '<div id="fbNotExec" style="display:none">' +
    '<div class="fb-q">没执行的真实原因是？</div>' +
    '<div class="chip-group" id="fbReason">' +
    ['忘了', '动作不合适', '状态已经变了', '其他'].map(function (t) { return '<button class="chip" data-v="' + t + '">' + t + '</button>'; }).join('') +
    '</div></div>' +
    '<button class="primary-btn" id="fbSubmit" style="margin-top:14px">提交回访</button>';

  var exec = null, eff = null, reason = '';
  function bind(groupId, cb) {
    $(groupId).querySelectorAll('.chip').forEach(function (b) {
      b.onclick = function () {
        $(groupId).querySelectorAll('.chip').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        cb(b.getAttribute('data-v'));
      };
    });
  }
  bind('fbExec', function (v) {
    exec = v === '1';
    $('fbExeced').style.display = exec ? '' : 'none';
    $('fbNotExec').style.display = exec ? 'none' : '';
  });
  bind('fbEff', function (v) { eff = v === '1'; });
  bind('fbReason', function (v) { reason = v; });

  $('fbSubmit').onclick = function () {
    if (exec === null) { toast('先选择是否执行了'); return; }
    r.followup.done = true;
    r.followup.executed = exec;
    if (exec) {
      if (eff === null) { toast('选择是否有效'); return; }
      r.followup.effective = eff;
      r.followup.afterEnergy = +($('fbEnergy').value);
    } else {
      if (!reason) { toast('选择没执行的原因'); return; }
      r.followup.reason = reason;
    }
    saveRecords();
    $('followupModal').style.display = 'none';
    toast('回访已记录');
    if (currentView === 'home') renderHome();
    // 还有别的到期回访则继续弹
    setTimeout(checkFollowups, 300);
  };
  $('followupModal').style.display = 'flex';
}

/* ---------------- 规律页 ---------------- */

var patternRange = 30;
function renderPattern() {
  var range = patternRange;
  var from = range > 0 ? Date.now() - range * 86400 * 1000 : 0;
  var rs = records.filter(function (r) { return r.ts >= from; });
  var body = $('patternBody');
  if (!rs.length) { body.innerHTML = '<div class="empty-tip">这个范围内还没有记录。</div>'; return; }

  var html = '';

  // 状态频率
  html += barBlock('五类状态出现频率', stateCount(rs, 'primary'), true);
  // 触发因素
  var trig = {};
  rs.forEach(function (r) { (r.triggers || []).forEach(function (t) { trig[t] = (trig[t] || 0) + 1; }); });
  html += barBlock('常见触发因素', trig, false);
  // 星期分布
  var dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], dcnt = {};
  rs.forEach(function (r) { var k = dow[new Date(r.ts).getDay()]; dcnt[k] = (dcnt[k] || 0) + 1; });
  html += barBlock('状态低谷出现在星期几', dcnt, false, dow);

  // 最有效 / 无效调整动作
  var eff = [], bad = [];
  rs.forEach(function (r) {
    if (r.followup && r.followup.done && r.followup.executed && r.card) {
      (r.followup.effective ? eff : bad).push(r.card.work);
    }
  });
  html += '<div class="card"><div class="card-title">有效调整动作（' + eff.length + '）</div>' +
    (eff.length ? eff.slice(-5).reverse().map(function (t) { return '<div class="card-body" style="padding:4px 0;border-bottom:1px dashed var(--line)">✓ ' + esc(t) + '</div>'; }).join('') : '<div class="hint">暂无</div>') +
    '</div>';
  html += '<div class="card"><div class="card-title">无效调整动作（' + bad.length + '）</div>' +
    (bad.length ? bad.slice(-5).reverse().map(function (t) { return '<div class="card-body" style="padding:4px 0;border-bottom:1px dashed var(--line)">✗ ' + esc(t) + '</div>'; }).join('') : '<div class="hint">暂无</div>') +
    '</div>';

  // 容易悲观判断的场景：重大决策诱因 + 情绪低 的记录
  var risky = rs.filter(function (r) {
    return r.scores && r.scores.emotion <= 4 && ((r.triggers || []).indexOf('重大决策') >= 0 || r.state.primary === 'selfdoubt');
  });
  if (risky.length) {
    html += '<div class="card"><div class="card-title">容易做出悲观判断的场景（' + risky.length + ' 次）</div>' +
      risky.slice(-4).reverse().map(function (r) {
        return '<div class="card-body" style="padding:4px 0;border-bottom:1px dashed var(--line)">' + fmtDate(r.ts) + ' · ' +
          esc((r.triggers || []).join('、') || '无诱因') + ' · ' + esc(r.text || '(未写字)') + '</div>';
      }).join('') + '</div>';
  }

  body.innerHTML = html;
}

function stateCount(rs, field) {
  var c = {};
  rs.forEach(function (r) {
    if (r.state && r.state[field] && r.state[field] !== 'stable') c[r.state[field]] = (c[r.state[field]] || 0) + 1;
  });
  return c;
}

function barBlock(title, countObj, isState, orderList) {
  var keys = Object.keys(countObj);
  if (!keys.length && !orderList) return '';
  if (orderList) {
    keys = orderList.filter(function (k) { return countObj[k]; }).concat(
      Object.keys(countObj).filter(function (k) { return orderList.indexOf(k) < 0; }));
  }
  keys.sort(function (a, b) { return countObj[b] - countObj[a]; });
  var max = 1;
  keys.forEach(function (k) { if (countObj[k] > max) max = countObj[k]; });
  var html = '<div class="card"><div class="card-title">' + esc(title) + '</div>';
  keys.forEach(function (k) {
    var name = isState ? STATES[k].name : k;
    var color = isState ? STATE_COLORS[k] : 'var(--primary)';
    var pct = Math.round(countObj[k] / max * 100);
    html += '<div class="bar-row"><span class="bar-name">' + esc(name) + '</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<span class="bar-num">' + countObj[k] + '</span></div>';
  });
  return html + '</div>';
}

/* ---------------- 设置页 ---------------- */

function renderSettings() {
  $('setAiEnabled').checked = settings.aiEnabled;
  $('setAiUrl').value = settings.aiUrl;
  $('setAiModel').value = settings.aiModel;
  $('setAiKey').value = settings.aiKey;
}
function persistSettings() {
  settings.aiEnabled = $('setAiEnabled').checked;
  settings.aiUrl = $('setAiUrl').value.trim() || DEFAULT_SETTINGS.aiUrl;
  settings.aiModel = $('setAiModel').value.trim() || DEFAULT_SETTINGS.aiModel;
  settings.aiKey = $('setAiKey').value.trim();
  saveSettings();
}

function testAI() {
  persistSettings();
  var status = $('aiTestStatus');
  if (!settings.aiKey) { status.className = 'ai-status err'; status.textContent = '请先填 API Key'; return; }
  status.className = 'ai-status';
  status.textContent = '测试中…';
  var xhr = new XMLHttpRequest();
  xhr.open('POST', settings.aiUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + settings.aiKey);
  xhr.timeout = 20000;
  xhr.onload = function () {
    if (xhr.status === 200) {
      status.className = 'ai-status ok';
      status.textContent = '连接成功，AI 增强可用';
    } else {
      status.className = 'ai-status err';
      status.textContent = '失败：HTTP ' + xhr.status + ' ' + xhr.responseText.slice(0, 120);
    }
  };
  xhr.onerror = function () { status.className = 'ai-status err'; status.textContent = '网络错误（检查接口地址 / 网络 / CORS）'; };
  xhr.ontimeout = function () { status.className = 'ai-status err'; status.textContent = '超时'; };
  xhr.send(JSON.stringify({
    model: settings.aiModel,
    messages: [{ role: 'user', content: '回复OK两个字母即可' }],
    max_tokens: 8
  }));
}

/* ---------------- 导出 / 导入 ---------------- */

function downloadFile(name, content, mime) {
  var blob = new Blob([content], { type: mime || 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
}

function exportJSON() {
  downloadFile('状态重启备份_' + todayStr() + '.json',
    JSON.stringify({ app: '状态重启', version: 1, exportedAt: fmtTime(Date.now()), records: records }, null, 2),
    'application/json');
  toast('已导出 JSON');
}

function exportCSV() {
  var head = ['日期', '类型', '精力', '情绪稳定度', '掌控感', '行动意愿', '诱因', '当时文字',
    '主要状态', '次要状态', '追问', '回答', '工作动作', '回访执行', '回访有效', '未执行原因'];
  var rows = records.map(function (r) {
    return [
      fmtTime(r.ts), r.type === 'rescue' ? '急救' : '日常',
      r.scores.energy, r.scores.emotion, r.scores.control, r.scores.action,
      (r.triggers || []).join('|'), r.text || '',
      r.state ? STATES[r.state.primary].name : '',
      r.state && r.state.secondary ? STATES[r.state.secondary].name : '',
      r.question || '', r.answer || '',
      r.card ? r.card.work : '',
      r.followup && r.followup.done ? (r.followup.executed ? '是' : '否') : '',
      r.followup && r.followup.done && r.followup.effective != null ? (r.followup.effective ? '是' : '否') : '',
      (r.followup && r.followup.reason) || ''
    ];
  });
  var csv = '\uFEFF' + [head].concat(rows).map(function (row) {
    return row.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\r\n');
  downloadFile('状态重启记录_' + todayStr() + '.csv', csv, 'text/csv');
  toast('已导出 CSV');
}

function importJSON(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      var incoming = data.records || data;
      if (!Array.isArray(incoming)) throw 0;
      var ids = {}; records.forEach(function (r) { ids[r.id] = 1; });
      var added = 0;
      incoming.forEach(function (r) {
        if (r && r.id && !ids[r.id] && r.scores) { records.push(r); added++; }
      });
      records.sort(function (a, b) { return a.ts - b.ts; });
      saveRecords();
      toast('导入成功，新增 ' + added + ' 条');
    } catch (e) { toast('文件格式不对，导入失败'); }
  };
  reader.readAsText(file);
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents() {
  // 顶部导航
  document.querySelectorAll('.topnav-item').forEach(function (b) {
    b.onclick = function () { showView(b.getAttribute('data-nav')); };
  });
  $('btnRescue').onclick = function () { startFlow('rescue'); };
  $('btnDaily').onclick = function () { startFlow('daily'); };

  // 流程
  $('flowBack').onclick = function () {
    if (flow.step === 'identify') { showView('home'); return; }
    var prev = { question: 'identify', card: 'question', followup: 'card' };
    if (flow.step === 'question') gotoStep('identify');
    else if (flow.step === 'card') gotoStep('question');
    else if (flow.step === 'followup') gotoStep('card');
  };
  $('btnIdentifyNext').onclick = doIdentify;
  $('btnAnswerNext').onclick = doAnswer;
  $('btnCardNext').onclick = function () { renderFollowup(); gotoStep('followup'); };
  $('btnCopyCard').onclick = function () {
    var c = flow.card, st = STATES[flow.state.primary];
    copyText('【恢复卡 · ' + st.name + '】\n已确认事实：' + c.facts + '\n认知偏差：' + c.bias +
      '\n不宜决定：' + c.avoid + '\n身体恢复：' + c.body + '\n工作动作：' + c.work, '恢复卡已复制');
  };
  $('btnCopyRemind').onclick = function () {
    copyText($('remindBox').textContent.replace(/^提醒文本（.+?）：/, ''), '提醒文本已复制');
  };
  $('btnFinishFlow').onclick = finishFlow;
  $('btnGoHome').onclick = function () { showView('home'); };

  // 规律页范围
  document.querySelectorAll('#patternRange .chip').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('#patternRange .chip').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      patternRange = +b.getAttribute('data-range');
      renderPattern();
    };
  });

  // 设置
  $('btnTestAi').onclick = testAI;
  $('btnExportJson').onclick = exportJSON;
  $('btnExportCsv').onclick = exportCSV;
  $('btnImportJson').onclick = function () { $('importFile').click(); };
  $('importFile').onchange = function (e) {
    if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  };
  $('btnClearData').onclick = function () {
    if (confirm('确定清空全部记录？此操作不可恢复，建议先导出备份。')) {
      records = [];
      saveRecords();
      toast('已清空');
      renderHome();
    }
  };

  // 安全弹层
  $('btnSafeClose').onclick = function () {
    $('safeModal').style.display = 'none';
    if (flow && flow.step === 'identify') { showView('home'); }
  };
}

/* ---------------- 启动 ---------------- */

document.addEventListener('DOMContentLoaded', function () {
  bindEvents();
  renderSettings();
  showView('home');
  setTimeout(checkFollowups, 600);
});
