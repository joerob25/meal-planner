/* Longevità — Longevity Diet Planner
   Core application logic */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let state = {
  settings: {
    ageGroup: 'under65',        // 'under65' | 'over65'
    mealsPerDay: 3,              // 2 or 3 (2 = skip lunch, eat breakfast + dinner + snack)
    windowStartHour: 8,          // 0–23
    windowLength: 12,            // 11 or 12
    fishPerWeek: 3,              // 2 or 3 — Longo recommends max 2–3
  },
  plan: null,                    // { Mon: { breakfast, lunch, dinner, snack } ... }
  shoppingList: null,            // aggregated ingredients
  checkedItems: new Set(),       // for shopping list
};

/* ---------- Plan generation ---------- */

function shufflePlan() {
  const { mealsPerDay, fishPerWeek } = state.settings;

  // Separate dinners into fish / non-fish
  const fishDinners = MEALS.dinner.filter(m => m.fish);
  const plantDinners = MEALS.dinner.filter(m => !m.fish);

  // Pick which days have fish (spread across the week)
  const fishDayIndices = pickSpread(7, fishPerWeek);

  // Pick and distribute meals, avoiding adjacent repeats
  const plan = {};
  const picked = { breakfast: [], lunch: [], dinner: [], snack: [] };

  for (let i = 0; i < 7; i++) {
    const day = DAYS[i];
    plan[day] = {};

    // Breakfast
    plan[day].breakfast = pickNonRepeating(MEALS.breakfast, picked.breakfast);
    picked.breakfast.push(plan[day].breakfast.id);

    // Lunch (only if 3 meals/day)
    if (mealsPerDay === 3) {
      plan[day].lunch = pickNonRepeating(MEALS.lunch, picked.lunch);
      picked.lunch.push(plan[day].lunch.id);
    }

    // Dinner
    const dinnerPool = fishDayIndices.includes(i) ? fishDinners : plantDinners;
    plan[day].dinner = pickNonRepeating(dinnerPool, picked.dinner);
    picked.dinner.push(plan[day].dinner.id);

    // Snack
    plan[day].snack = pickNonRepeating(MEALS.snack, picked.snack);
    picked.snack.push(plan[day].snack.id);
  }

  state.plan = plan;
  state.shoppingList = generateShoppingList(plan);
  state.checkedItems = new Set();
}

function pickNonRepeating(pool, recentIds) {
  // Prefer a meal not used in the last 3 days
  const recent = new Set(recentIds.slice(-3));
  const fresh = pool.filter(m => !recent.has(m.id));
  const candidates = fresh.length ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickSpread(total, count) {
  // Evenly distribute `count` days across `total` days
  const indices = [];
  const step = total / count;
  for (let i = 0; i < count; i++) {
    indices.push(Math.round(i * step + Math.random() * (step * 0.5)));
  }
  return indices.map(i => Math.min(i, total - 1));
}

/* ---------- Shopping list ---------- */

function generateShoppingList(plan) {
  const map = new Map();   // key: name+unit  →  { name, qty, unit, cat }

  Object.values(plan).forEach(day => {
    Object.values(day).forEach(meal => {
      if (!meal) return;
      meal.ingredients.forEach(ing => {
        const key = `${ing.name}__${ing.unit}`;
        if (map.has(key)) {
          map.get(key).qty += ing.qty;
        } else {
          map.set(key, { ...ing });
        }
      });
    });
  });

  // Group by category
  const grouped = {};
  CATEGORY_ORDER.forEach(c => (grouped[c] = []));
  map.forEach(item => {
    // Round up quantities nicely
    item.qty = Math.round(item.qty * 100) / 100;
    if (!grouped[item.cat]) grouped[item.cat] = [];
    grouped[item.cat].push(item);
  });

  // Sort each category alphabetically
  Object.keys(grouped).forEach(c => {
    grouped[c].sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

function formatQty(qty, unit) {
  // Whole-count items: show as "3 whole", "2 cloves", "1 clove" etc.
  if (unit === 'whole' || unit === 'slices' || unit === 'cloves' || unit === 'sticks') {
    const n = Math.ceil(qty);
    const singular = { cloves: 'clove', slices: 'slice', sticks: 'stick' };
    const u = (n === 1 && singular[unit]) ? singular[unit] : unit;
    return `${n} ${u}`;
  }
  // Tinned items: "2 × tin (400g)"
  if (unit.startsWith('tin ') || unit.startsWith('fillet ')) {
    const n = Math.ceil(qty);
    return n === 1 ? `1 ${unit}` : `${n} × ${unit}`;
  }
  if (qty >= 1000 && unit === 'g') return `${(qty / 1000).toFixed(2)} kg`;
  if (qty >= 1000 && unit === 'ml') return `${(qty / 1000).toFixed(2)} L`;
  return `${qty} ${unit}`;
}

/* ---------- Rendering ---------- */

function renderAll() {
  renderSettings();
  renderWindow();
  renderPlan();
  renderShoppingList();
  renderFMDReminder();
}

function renderSettings() {
  const s = state.settings;
  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.dataset.setting;
    const val = el.dataset.value;
    if (String(s[key]) === val) el.classList.add('active');
    else el.classList.remove('active');
  });

  const startEl = document.getElementById('window-start');
  if (startEl) startEl.value = s.windowStartHour;
}

function renderWindow() {
  const { windowStartHour, windowLength } = state.settings;
  const endHour = (windowStartHour + windowLength) % 24;

  document.getElementById('window-display').textContent =
    `${formatHour(windowStartHour)} – ${formatHour(endHour)}`;
  document.getElementById('window-length-display').textContent = `${windowLength} hours`;

  // Render clock dial
  const dial = document.getElementById('clock-dial');
  if (!dial) return;

  const startAngle = (windowStartHour / 24) * 360 - 90;
  const endAngle = ((windowStartHour + windowLength) / 24) * 360 - 90;

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const r = 72;
  const cx = 90, cy = 90;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = windowLength > 12 ? 1 : 0;

  dial.innerHTML = `
    <circle cx="90" cy="90" r="78" fill="none" stroke="currentColor" stroke-width="1" opacity="0.12" />
    <path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}"
          fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" />
    ${[0, 6, 12, 18].map(h => {
      const a = (h / 24) * 360 - 90;
      const x = cx + 82 * Math.cos((a * Math.PI) / 180);
      const y = cy + 82 * Math.sin((a * Math.PI) / 180);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
              font-size="10" font-family="var(--font-body)" fill="currentColor" opacity="0.5">${h}</text>`;
    }).join('')}
  `;
}

function formatHour(h) {
  const hr = h % 24;
  if (hr === 0) return '12 AM';
  if (hr < 12) return `${hr} AM`;
  if (hr === 12) return '12 PM';
  return `${hr - 12} PM`;
}

function renderPlan() {
  const container = document.getElementById('plan-grid');
  if (!state.plan) {
    container.innerHTML = `
      <div class="plan-empty">
        <div class="plan-empty-inner">
          <div class="plan-empty-mark">01</div>
          <h3>No plan yet</h3>
          <p>Press <em>Shuffle Week</em> to generate your meal plan, drawn from ${
            MEALS.breakfast.length + MEALS.lunch.length + MEALS.dinner.length + MEALS.snack.length
          } Longevity-aligned recipes.</p>
        </div>
      </div>`;
    return;
  }

  const { mealsPerDay } = state.settings;
  const mealTypes = mealsPerDay === 2
    ? ['breakfast', 'dinner', 'snack']
    : ['breakfast', 'lunch', 'dinner', 'snack'];

  container.innerHTML = DAYS.map((day, i) => `
    <article class="day-card" style="animation-delay: ${i * 0.05}s">
      <header class="day-card-header">
        <span class="day-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="day-label">${FULL_DAYS[i]}</span>
      </header>
      <div class="day-meals">
        ${mealTypes.map(type => {
          const meal = state.plan[day][type];
          if (!meal) return '';
          return `
            <button class="meal-card ${meal.fish ? 'has-fish' : ''}" data-meal-id="${meal.id}" data-day="${day}" data-type="${type}">
              <div class="meal-type">${type}${meal.fish ? ' · fish' : ''}</div>
              <div class="meal-name">${meal.name}</div>
              <div class="meal-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4">
                    <circle cx="8" cy="8" r="6.5" /><path d="M8 4v4l2.5 1.5" />
                  </svg>
                  ${meal.time}m
                </span>
                <span class="meta-item">${difficultyDots(meal.difficulty)}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </article>
  `).join('');

  // Attach click handlers
  container.querySelectorAll('.meal-card').forEach(btn => {
    btn.addEventListener('click', () => openMealModal(btn.dataset.mealId));
  });
}

function difficultyDots(level) {
  return `<span class="diff-dots" aria-label="Difficulty: ${['Easy','Medium','Harder'][level-1]}">${
    [1,2,3].map(n => `<span class="dot ${n <= level ? 'on' : ''}"></span>`).join('')
  }</span>`;
}

function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  if (!state.shoppingList) {
    container.innerHTML = `<p class="list-empty">Your shopping list appears here once you shuffle a plan.</p>`;
    document.getElementById('list-count').textContent = '';
    return;
  }

  let totalItems = 0;
  const html = CATEGORY_ORDER.map(cat => {
    const items = state.shoppingList[cat];
    if (!items || !items.length) return '';
    totalItems += items.length;
    return `
      <div class="cat-block">
        <h4 class="cat-title"><span class="cat-rule"></span>${CATEGORY_LABELS[cat]}</h4>
        <ul class="cat-items">
          ${items.map((it, idx) => {
            const key = `${cat}-${it.name}-${it.unit}`;
            const checked = state.checkedItems.has(key) ? 'checked' : '';
            return `
              <li class="shop-item ${checked}" data-key="${key}">
                <span class="check-box"><span class="check-tick"></span></span>
                <span class="item-name">${it.name}</span>
                <span class="item-qty">${formatQty(it.qty, it.unit)}</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  document.getElementById('list-count').textContent = `${totalItems} items`;

  container.querySelectorAll('.shop-item').forEach(li => {
    li.addEventListener('click', () => {
      const key = li.dataset.key;
      if (state.checkedItems.has(key)) state.checkedItems.delete(key);
      else state.checkedItems.add(key);
      li.classList.toggle('checked');
    });
  });
}

function renderFMDReminder() {
  // Show a rotating cycle reminder — FMD 2–3x per year
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const quarterNames = ['Winter', 'Spring', 'Summer', 'Autumn'];
  document.getElementById('fmd-quarter').textContent = quarterNames[quarter];
}

/* ---------- Meal detail modal ---------- */

function openMealModal(mealId) {
  const meal = findMealById(mealId);
  if (!meal) return;

  const modal = document.getElementById('meal-modal');
  const body = document.getElementById('modal-body');

  body.innerHTML = `
    <div class="modal-head">
      <div class="modal-type">${meal.fish ? 'Pescatarian' : 'Plant-based'}</div>
      <h2 class="modal-title">${meal.name}</h2>
      <p class="modal-desc">${meal.description}</p>
      <div class="modal-meta">
        <span><strong>${meal.time}</strong> min</span>
        <span>${['Easy', 'Medium', 'Harder'][meal.difficulty - 1]}</span>
      </div>
    </div>
    <div class="modal-section">
      <h3>Ingredients</h3>
      <ul class="modal-ingredients">
        ${meal.ingredients.map(i => `<li><span>${i.name}</span><span>${formatQty(i.qty, i.unit)}</span></li>`).join('')}
      </ul>
    </div>
    <div class="modal-section">
      <h3>Method</h3>
      <p class="modal-method">${meal.method}</p>
    </div>
  `;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMealModal() {
  document.getElementById('meal-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function findMealById(id) {
  for (const type of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const m = MEALS[type].find(x => x.id === id);
    if (m) return m;
  }
  return null;
}

/* ---------- Event bindings ---------- */

function bindEvents() {
  // Shuffle button
  document.getElementById('shuffle-btn').addEventListener('click', () => {
    const grid = document.getElementById('plan-grid');
    grid.classList.add('shuffling');
    setTimeout(() => {
      shufflePlan();
      renderPlan();
      renderShoppingList();
      grid.classList.remove('shuffling');
      // Smooth scroll to plan
      document.getElementById('plan-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 380);
  });

  // Settings buttons
  document.querySelectorAll('[data-setting]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.setting;
      const val = btn.dataset.value;
      const coerced = isNaN(+val) ? val : +val;
      state.settings[key] = coerced;
      renderSettings();
      renderWindow();
      if (state.plan) {
        // Re-render plan if meals per day changed
        renderPlan();
      }
    });
  });

  // Window start slider
  const startEl = document.getElementById('window-start');
  if (startEl) {
    startEl.addEventListener('input', e => {
      state.settings.windowStartHour = +e.target.value;
      renderWindow();
    });
  }

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeMealModal);
  document.getElementById('meal-modal').addEventListener('click', e => {
    if (e.target.id === 'meal-modal') closeMealModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMealModal();
  });

  // Print list
  document.getElementById('print-list').addEventListener('click', () => {
    if (!state.shoppingList) {
      alert('Shuffle a plan first!');
      return;
    }
    window.print();
  });

  // Copy list
  document.getElementById('copy-list').addEventListener('click', async () => {
    if (!state.shoppingList) return;
    let text = 'LONGEVITÀ — SHOPPING LIST\n\n';
    CATEGORY_ORDER.forEach(cat => {
      const items = state.shoppingList[cat];
      if (!items || !items.length) return;
      text += `${CATEGORY_LABELS[cat].toUpperCase()}\n`;
      items.forEach(i => {
        text += `  ☐ ${i.name} — ${formatQty(i.qty, i.unit)}\n`;
      });
      text += '\n';
    });
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copy-list');
      const orig = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = orig), 1500);
    } catch (err) {
      alert('Could not copy — try the print option instead.');
    }
  });

  // Section nav scroll
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  renderAll();
});
