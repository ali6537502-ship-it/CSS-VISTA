
(() => {
  'use strict';
  const app = window.CSSVistaGSA;
  if (!app) return;
  const $ = (id) => document.getElementById(id);
  const safe = (text) => String(text == null ? '' : text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const sections = app.allSections;
  const presets = [8, 14, 20, 30, 45, 60];
  const lessonWeight = (section) => Math.max(7, Math.min(20, Math.round(6 + String(section.text || '').trim().split(/\s+/).length / 110)));
  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const plusDays = (date, add) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + add); return d.toISOString().slice(0, 10); };
  const niceDate = (date) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
  const valid = (plan) => !!plan && Number.isInteger(plan.days) && plan.days >= 5 && plan.days <= 120 && /^\d{4}-\d{2}-\d{2}$/.test(plan.startDate || '');
  function schedule(plan) {
    const weights = sections.map(lessonWeight);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const result = Array.from({length: plan.days}, () => []);
    let cursor = 0, used = 0;
    for (let day = 0; day < plan.days; day++) {
      const remainingDays = plan.days - day;
      const target = (total - used) / remainingDays;
      let load = 0;
      const maxCursor = sections.length - (remainingDays - 1);
      while (cursor < maxCursor && (result[day].length === 0 || day === plan.days - 1 || load + weights[cursor] / 2 <= target)) {
        result[day].push(sections[cursor].id);
        load += weights[cursor];
        cursor++;
      }
      used += load;
    }
    const planned = result.map((ids, i) => ({
      index: i,
      date: plusDays(plan.startDate, i),
      ids,
      minutes: ids.reduce((sum, id) => sum + lessonWeight(app.byId.get(id)), 0),
      done: ids.filter((id) => !!app.getSaved().completed[id]).length,
      recall: []
    }));
    planned.forEach((day) => {
      const intervals = plan.days >= 30 ? [1, 3, 7] : plan.days >= 14 ? [1, 3] : [1];
      const repeat = new Set();
      intervals.forEach((offset) => {
        const earlier = planned[day.index - offset];
        if (earlier) earlier.ids.slice(-2).forEach((id) => repeat.add(id));
      });
      day.recall = [...repeat].slice(0, 4);
      day.minutes += day.recall.length * 3;
    });
    return planned;
  }
  function summary(plan) {
    const days = schedule(plan);
    const total = days.reduce((sum, d) => sum + d.minutes, 0);
    const completed = sections.filter((s) => !!app.getSaved().completed[s.id]).length;
    return {days, total, daily: Math.round(total / plan.days), completed};
  }
  function showSetup() {
    const existing = app.getSaved().plan;
    let duration = valid(existing) ? existing.days : 20;
    let starting = valid(existing) ? existing.startDate : today();
    function draw() {
      const s = summary({days: duration, startDate: starting});
      const min = Math.min(...s.days.map((d) => d.ids.length));
      const max = Math.max(...s.days.map((d) => d.ids.length));
      const presetButtons = presets.map((days) => '<button type="button" class="gsa-duration' + (duration === days ? ' selected' : '') + '" data-gsa-days="' + days + '" aria-pressed="' + (days === duration) + '"><strong>' + days + '</strong><span>days</span></button>').join('');
      app.modal('Choose your course duration',
        '<p class="gsa-notice">One complete course, your own timetable. Every option covers all 28 chapters and 141 lessons. Shorter courses have a heavier daily workload.</p>' +
        '<div class="gsa-durations">' + presetButtons + '</div>' +
        '<div class="gsa-fields"><label for="gsa-custom">Your duration (5–120 days)</label><input type="number" id="gsa-custom" min="5" max="120" value="' + duration + '">' +
        '<label for="gsa-start">Starting date</label><input id="gsa-start" type="date" value="' + safe(starting) + '"></div>' +
        '<div class="gsa-highlight"><strong>' + duration + '-day programme</strong><p>' + min + '–' + max + ' lessons per day · approximately ' + s.daily + ' minutes of lesson activities per day on average.</p><p>All 141 lessons remain included. Previous completions are retained if you change your schedule.</p></div>' +
        '<button class="gsa-primary" id="gsa-save-plan">' + (valid(app.getSaved().plan) ? 'Update my timetable' : 'Start my course') + '</button>' +
        '<p class="gsa-small">Time estimates exclude breaks and additional practice. An intensive timetable may require substantial study time each day.</p>');
      document.querySelectorAll('[data-gsa-days]').forEach((button) => button.addEventListener('click', () => { duration = Number(button.dataset.gsaDays); draw(); }));
      $('gsa-custom').addEventListener('change', (event) => {
        const value = Number(event.target.value);
        if (!Number.isInteger(value) || value < 5 || value > 120) { event.target.setCustomValidity('Choose between 5 and 120 days.'); event.target.reportValidity(); event.target.setCustomValidity(''); return; }
        duration = value;
        draw();
      });
      $('gsa-start').addEventListener('change', (event) => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) { starting = event.target.value; draw(); } });
      $('gsa-save-plan').addEventListener('click', () => {
        app.getSaved().plan = {days: duration, startDate: starting, changedAt: new Date().toISOString()};
        app.persist();
        app.closeModal();
        app.render();
        showPlan();
      });
    }
    draw();
  }
  function showPlan() {
    const plan = app.getSaved().plan;
    if (!valid(plan)) { showSetup(); return; }
    const stats = summary(plan);
    const now = today();
    const current = stats.days.find((day) => day.done < day.ids.length && day.date <= now) || stats.days.find((day) => day.done < day.ids.length) || stats.days[stats.days.length - 1];
    const overdue = stats.days.filter((day) => day.done < day.ids.length && day.date < now).length;
    const list = stats.days.map((day) => {
      const first = app.byId.get(day.ids[0]);
      const last = app.byId.get(day.ids[day.ids.length - 1]);
      const label = day.done === day.ids.length ? 'Completed' : day.date < now ? 'Catch up' : day.date === now ? 'Today' : 'Scheduled';
      const coverage = first ? first.chapterTitle + (last && first.chapter !== last.chapter ? ' → ' + last.chapterTitle : '') : '';
      const lessons = day.ids.map((id) => {
        const lesson = app.byId.get(id), done = !!app.getSaved().completed[id];
        return '<button class="gsa-day-lesson' + (done ? ' done' : '') + '" data-open="' + safe(id) + '"><span>' + (done ? '✓ ' : '○ ') + safe(lesson.number) + ' · ' + safe(lesson.title) + '</span><small>' + lessonWeight(lesson) + ' min</small></button>';
      }).join('');
      const recall = day.recall.map((id) => {
        const lesson = app.byId.get(id);
        return '<button class="gsa-recall-link" data-open="' + safe(id) + '">↻ Repeat: ' + safe(lesson.title) + '</button>';
      }).join('');
      return '<details class="gsa-day"' + (day.index === current.index ? ' open' : '') + '><summary><b>Day ' + (day.index + 1) + '</b><span><strong>' + niceDate(day.date) + ' · ' + label + '</strong><small>' + day.done + '/' + day.ids.length + ' complete · ' + day.minutes + ' min estimated · ' + safe(coverage) + '</small></span></summary><div class="gsa-day-lessons">' + lessons + '</div></details>';
    }).join('');
    app.modal('My GSA course',
      '<div class="gsa-highlight"><span class="eyebrow">Your study timetable</span><strong>' + plan.days + ' days · ' + niceDate(plan.startDate) + ' – ' + niceDate(plusDays(plan.startDate, plan.days - 1)) + '</strong>' +
      '<div class="gsa-stats"><div><b>' + stats.completed + '/141</b><span>Lessons completed</span></div><div><b>' + stats.daily + ' min</b><span>Average lesson time daily</span></div><div><b>' + overdue + '</b><span>Unfinished past days</span></div></div></div>' +
      '<div class="gsa-buttons"><button class="gsa-primary" id="gsa-continue">Continue my course</button><button class="gsa-secondary" id="gsa-change">Change duration</button></div>' +
      '<p class="gsa-small">You can catch up, move ahead or repeat a lesson. Adjusting the duration does not delete completed lessons, bookmarks or revision records.</p>' +
      '<div class="gsa-day-grid">' + list + '</div>');
    $('gsa-change').addEventListener('click', showSetup);
    $('gsa-continue').addEventListener('click', () => {
      const next = stats.days.flatMap((d) => d.ids).find((id) => !app.getSaved().completed[id]) || stats.days[0].ids[0];
      app.closeModal(); app.go(next);
    });
    app.openLinks();
  }
  function refreshSidebar() {
    const plan = app.getSaved().plan;
    const title = $('course-side-title'), sub = $('course-side-sub');
    if (!title || !sub) return;
    if (!valid(plan)) {
      title.textContent = 'Choose your duration';
      sub.textContent = 'Pick your own pace. Every plan contains the complete course.';
    } else {
      const days = schedule(plan);
      const next = days.find((d) => d.done < d.ids.length) || days[days.length - 1];
      title.textContent = plan.days + '-day course';
      sub.textContent = 'Day ' + (next.index + 1) + ' · ' + next.done + '/' + next.ids.length + ' done · ' + Math.round(days.reduce((n, d) => n + d.minutes, 0) / plan.days) + ' min daily average';
    }
  }
  const css = [
    '.gsa-durations{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}',
    '.gsa-duration{padding:12px;border:1px solid #d7e4d7;border-radius:13px;background:white;color:#24543b;cursor:pointer}',
    '.gsa-duration strong{display:block;font-size:22px}.gsa-duration span{font-size:11px;color:#6d8573}.gsa-duration.selected{border:2px solid #266147;background:#eef7ea}',
    '.gsa-fields{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:10px;margin:16px 0}.gsa-fields label{font-size:12px;font-weight:750}',
    '.gsa-fields input{border:1px solid #d0dfd1;border-radius:10px;padding:10px;font:inherit;min-width:0;width:100%}',
    '.gsa-notice{background:#f4f8f1;padding:14px 16px;border-radius:12px;font-size:13px!important}',
    '.gsa-highlight{background:#f1f7ed;padding:16px;border-radius:16px;margin:14px 0}.gsa-highlight>strong{font-family:Georgia,serif;font-size:24px;font-weight:500;display:block;color:#22553b}',
    '.gsa-highlight p{font-size:12px!important;margin:7px 0}.gsa-small{font-size:11px!important;color:#738775!important}',
    '.gsa-primary{border:0;border-radius:11px;background:#21523d;color:white;padding:12px 18px;font-weight:800;min-height:44px;cursor:pointer}',
    '.gsa-secondary{border:1px solid #cfdecf;border-radius:11px;background:white;color:#20513a;padding:12px 18px;font-weight:800;min-height:44px;cursor:pointer}',
    '.gsa-buttons{display:flex;gap:10px;flex-wrap:wrap}.gsa-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}',
    '.gsa-stats>div{padding:10px;background:white;border-radius:10px}.gsa-stats b{display:block;font-size:18px;color:#204d37}.gsa-stats span{display:block;font-size:10px;color:#668170}',
    '.gsa-day-grid{display:grid;gap:9px;margin-top:15px}.gsa-day{border:1px solid #dfebdf;border-radius:12px;background:white;overflow:hidden}',
    '.gsa-day summary{list-style:none;padding:13px;display:flex;align-items:center;gap:13px;cursor:pointer}.gsa-day summary::-webkit-details-marker{display:none}',
    '.gsa-day summary>b{display:grid;place-items:center;background:#e9f4e7;min-width:55px;height:46px;border-radius:10px;font-size:12px;color:#245940}',
    '.gsa-day summary>span{flex:1;min-width:0}.gsa-day summary strong{display:block;font-size:13px;color:#345341}.gsa-day summary small{display:block;font-size:11px;color:#809086;line-height:1.5}',
    '.gsa-day-lessons{padding:0 12px 12px 12px;display:grid;gap:6px}.gsa-day-lesson{width:100%;background:#f8faf6;border:1px solid #edf0ea;border-radius:9px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;cursor:pointer;color:#3c5e44;font-size:12px}',
    '.gsa-day-lesson.done{opacity:.6}.gsa-day-lesson small{white-space:nowrap;color:#728c7b}.gsa-day-lesson:hover{border-color:#9bbca2}',
    '.gsa-recall-label{margin:7px 0 1px!important;font-size:10px!important;color:#6e8770!important;text-transform:uppercase;letter-spacing:.08em;font-weight:800}',
    '.gsa-recall-link{width:100%;text-align:left;border:1px solid #d7e8d7;background:#f2f8ee;color:#285f42;border-radius:8px;padding:9px 11px;font-size:12px;cursor:pointer}',
    '.course-shortcut{width:100%;border:1px solid #bcd3bb;color:#246042;border-radius:11px;background:#edf5e8;padding:11px;font-weight:750;cursor:pointer;margin-top:12px}',
    '@media(max-width:520px){.gsa-durations{grid-template-columns:repeat(2,minmax(0,1fr))}.gsa-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}'
  ].join('\n');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  $('nav-course')?.addEventListener('click', () => { $('sidebar')?.classList.remove('mobile-open'); showPlan(); });
  $('top-plan')?.addEventListener('click', showPlan);
  $('course-side-button')?.addEventListener('click', showPlan);
  window.CSSVistaGSAPlannerRender = refreshSidebar;
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type !== 'cssvista:gsa:hydrate') return;
    app.updateFromAccount(event.data.snapshot);
  });
  refreshSidebar();
  if (!valid(app.getSaved().plan)) showSetup();
})();
