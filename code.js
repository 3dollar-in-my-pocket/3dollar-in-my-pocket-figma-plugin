const PROP = 'icon_menu_24pt';
const PREFIX = PROP + '=';
const CATEGORY_ID = '1037:55';
const ARCHIVE_TAG = '[보관]';
const NAME_RULE = /^[a-z0-9_]+$/;
const MIN_PX = 72;
const LABEL_FONT = { family: 'Noto Sans KR', style: 'Regular' };

const MENU = { cols: 8, cellW: 110, cellH: 64, pad: 20, icon: 24, gap: 6 };
const ROW = { labelW: 160, pitch: 75 };
const BOX = { labelH: 18, pinH: 48, gap: 16 };
const ARCHIVE_MIN = { w: 273, h: 251 };
const FRAME_GAP = 40;
const INSET = 28;

figma.showUI(__html__, { width: 420, height: 660, themeColors: true });

// ---------- 구조 찾기 ----------

async function locate() {
  let category = null;
  try {
    const n = await figma.getNodeByIdAsync(CATEGORY_ID);
    if (n && n.type === 'FRAME' && n.name === 'category') category = n;
  } catch (e) {
    category = null;
  }
  if (!category) {
    for (const page of figma.root.children) {
      await page.loadAsync();
      category = page.findOne(function (n) {
        return n.type === 'FRAME' && n.name === 'category' &&
          n.children.some(function (c) { return c.type === 'COMPONENT_SET' && c.name === 'menu'; });
      });
      if (category) break;
    }
  }
  if (!category) throw new Error('category 프레임을 찾지 못했습니다. Design System 파일에서 실행해 주세요.');

  let page = category;
  while (page.type !== 'PAGE') page = page.parent;
  if (figma.currentPage.id !== page.id) await figma.setCurrentPageAsync(page);

  function child(type, name) {
    return category.children.find(function (c) { return c.type === type && c.name === name; });
  }
  const ctx = {
    category: category,
    set: child('COMPONENT_SET', 'menu'),
    labels: child('FRAME', 'menu labels'),
    mappin: child('FRAME', 'mappin'),
    archive: child('FRAME', 'archive')
  };
  const names = { set: 'menu 세트', labels: 'menu labels 프레임', mappin: 'mappin 프레임', archive: 'archive 프레임' };
  for (const k in names) if (!ctx[k]) throw new Error('category 안에서 ' + names[k] + '을 찾지 못했습니다.');
  return ctx;
}

// ---------- 공용 ----------

function valueOf(comp) { return comp.name.slice(PREFIX.length); }
function isArchived(comp) { return comp.description.indexOf(ARCHIVE_TAG) === 0; }
function rowsOf(ctx) { return ctx.mappin.children.filter(function (c) { return c.type === 'FRAME'; }); }
function pinsIn(frame) { return frame.children.filter(function (c) { return c.type === 'FRAME'; }); }
function pinName(row, value) { return row.name + '_' + value; }
function pinOf(row, value) { return row.children.find(function (c) { return c.name === pinName(row, value); }); }
function boxOf(ctx, value) {
  return ctx.archive.children.find(function (c) { return c.type === 'FRAME' && c.name === value; });
}
function iconOf(frame) {
  return frame.findOne(function (n) {
    return n.type === 'INSTANCE' && n.componentProperties && n.componentProperties[PROP];
  });
}
function hasImage(node) {
  return !!node.findOne(function (n) {
    return Array.isArray(n.fills) && n.fills.some(function (f) { return f.type === 'IMAGE'; });
  });
}
async function componentById(id) {
  const comp = await figma.getNodeByIdAsync(id);
  if (!comp || comp.type !== 'COMPONENT') throw new Error('아이콘을 찾지 못했습니다. 목록을 새로고침해 주세요.');
  return comp;
}

function fit(frame, minW, minH) {
  let right = 0;
  let bottom = 0;
  for (const c of frame.children) {
    right = Math.max(right, c.x + c.width);
    bottom = Math.max(bottom, c.y + c.height);
  }
  frame.resizeWithoutConstraints(Math.max(minW || 1, Math.ceil(right + INSET)), Math.max(minH || 1, Math.ceil(bottom + INSET)));
}

function checkName(ctx, name, exceptId) {
  if (!NAME_RULE.test(name)) throw new Error('이름은 영문 소문자, 숫자, _ 만 쓸 수 있습니다.');
  const dup = ctx.set.children.some(function (c) { return c.id !== exceptId && valueOf(c) === name; });
  if (dup) throw new Error('"' + name + '" 은 이미 있는 이름입니다. (보관된 아이콘 포함)');
}

async function imageFrom(bytes) {
  const image = figma.createImage(bytes);
  const size = await image.getSizeAsync();
  if (size.width !== size.height) throw new Error('정사각형 이미지만 받습니다. (' + size.width + '×' + size.height + ')');
  if (size.width < MIN_PX) throw new Error(MIN_PX + '×' + MIN_PX + ' 이상이어야 합니다. (' + size.width + '×' + size.height + ')');
  return image;
}

function imageRect(hash) {
  const r = figma.createRectangle();
  r.name = 'image';
  r.resize(MENU.icon, MENU.icon);
  r.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FIT' }];
  return r;
}

// ---------- 배치 ----------

function packRows(ctx) {
  const order = ctx.set.children.map(valueOf);
  for (const row of rowsOf(ctx)) {
    const pins = pinsIn(row);
    const rank = function (p) {
      const i = order.indexOf(p.name.slice(row.name.length + 1));
      return i < 0 ? order.length + p.x : i;
    };
    pins.sort(function (a, b) { return rank(a) - rank(b); });
    const offset = row.children.length - pins.length;
    pins.forEach(function (p, i) {
      row.insertChild(offset + i, p);
      p.x = ROW.labelW + i * ROW.pitch;
      p.y = 0;
    });
    row.resizeWithoutConstraints(ROW.labelW + Math.max(1, pins.length) * ROW.pitch, row.height);
  }
}

function layoutArchive(ctx) {
  let y = 0;
  for (const box of ctx.archive.children.filter(function (c) { return c.type === 'FRAME'; })) {
    box.x = 0;
    box.y = y;
    y += box.height + BOX.gap;
  }
  fit(ctx.archive, ARCHIVE_MIN.w, ARCHIVE_MIN.h);
}

async function relayout(ctx) {
  const set = ctx.set;
  const labels = ctx.labels;
  const comps = set.children;
  const rows = Math.max(1, Math.ceil(comps.length / MENU.cols));
  const W = MENU.pad * 2 + MENU.cols * MENU.cellW;
  const H = MENU.pad * 2 + rows * MENU.cellH;

  comps.forEach(function (c, i) {
    c.x = MENU.pad + (i % MENU.cols) * MENU.cellW + (MENU.cellW - MENU.icon) / 2;
    c.y = MENU.pad + Math.floor(i / MENU.cols) * MENU.cellH;
  });
  set.resizeWithoutConstraints(W, H);

  await figma.loadFontAsync(LABEL_FONT);
  for (const t of labels.children.slice()) t.remove();
  labels.resizeWithoutConstraints(W, H);
  labels.x = set.x;
  labels.y = set.y;
  comps.forEach(function (c, i) {
    const archived = isArchived(c);
    const t = figma.createText();
    t.fontName = LABEL_FONT;
    t.fontSize = 10;
    t.characters = valueOf(c) + (archived ? ' (보관)' : '');
    t.fills = [{ type: 'SOLID', color: archived ? { r: 0.78, g: 0.78, b: 0.78 } : { r: 0.45, g: 0.45, b: 0.45 } }];
    t.textAlignHorizontal = 'CENTER';
    labels.appendChild(t);
    t.textAutoResize = 'HEIGHT';
    t.resize(MENU.cellW, t.height);
    t.name = valueOf(c);
    t.x = MENU.pad + (i % MENU.cols) * MENU.cellW;
    t.y = MENU.pad + Math.floor(i / MENU.cols) * MENU.cellH + MENU.icon + MENU.gap;
  });

  layoutArchive(ctx);
  ctx.archive.x = set.x + W + FRAME_GAP;
  ctx.archive.y = set.y;
  ctx.mappin.x = set.x;
  ctx.mappin.y = set.y + Math.max(H, ctx.archive.height) + FRAME_GAP;
  fit(ctx.category);
}

// ---------- 조회 ----------

async function snapshot(ctx) {
  const rows = rowsOf(ctx);
  const icons = [];
  for (const comp of ctx.set.children) {
    const value = valueOf(comp);
    icons.push({
      id: comp.id,
      value: value,
      archived: isArchived(comp),
      raster: hasImage(comp),
      pins: rows.filter(function (r) { return !!pinOf(r, value); }).length,
      thumb: await comp.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })
    });
  }
  return { icons: icons, rowCount: rows.length };
}

// ---------- 아이콘 관리 ----------

async function addIcon(ctx, name, bytes) {
  checkName(ctx, name);
  const image = await imageFrom(bytes);
  const comp = figma.createComponent();
  comp.name = PREFIX + name;
  comp.resize(MENU.icon, MENU.icon);
  comp.fills = [];
  comp.appendChild(imageRect(image.hash));
  ctx.set.appendChild(comp);
  await relayout(ctx);
  return name + ' 아이콘을 추가했습니다.';
}

async function replaceImage(ctx, id, bytes) {
  const comp = await componentById(id);
  const image = await imageFrom(bytes);
  for (const c of comp.children.slice()) c.remove();
  comp.appendChild(imageRect(image.hash));
  return valueOf(comp) + ' 이미지를 교체했습니다. 이 아이콘을 쓰는 mappin도 같이 바뀝니다.';
}

async function renameIcon(ctx, id, name) {
  const comp = await componentById(id);
  const old = valueOf(comp);
  if (name === old) return '이름이 같습니다.';
  checkName(ctx, name, id);
  comp.name = PREFIX + name;
  for (const row of rowsOf(ctx)) {
    const p = pinOf(row, old);
    if (p) p.name = pinName(row, name);
  }
  const box = boxOf(ctx, old);
  if (box) {
    await figma.loadFontAsync(LABEL_FONT);
    box.name = name;
    for (const p of pinsIn(box)) p.name = p.name.slice(0, p.name.length - old.length) + name;
    const label = box.children.find(function (c) { return c.type === 'TEXT'; });
    if (label) label.characters = name;
  }
  await relayout(ctx);
  return old + ' → ' + name + ' 으로 바꿨습니다.';
}

async function archiveIcon(ctx, id) {
  const comp = await componentById(id);
  if (isArchived(comp)) return '이미 보관된 아이콘입니다.';
  const value = valueOf(comp);
  comp.description = comp.description ? ARCHIVE_TAG + ' ' + comp.description : ARCHIVE_TAG;

  const pins = [];
  for (const row of rowsOf(ctx)) {
    const p = pinOf(row, value);
    if (p) pins.push(p);
  }
  if (pins.length) {
    await figma.loadFontAsync(LABEL_FONT);
    const box = figma.createFrame();
    box.name = value;
    box.fills = [];
    box.clipsContent = false;
    ctx.archive.appendChild(box);
    const label = figma.createText();
    label.fontName = LABEL_FONT;
    label.fontSize = 10;
    label.characters = value;
    label.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
    box.appendChild(label);
    pins.forEach(function (p, i) {
      box.appendChild(p);
      p.x = i * ROW.pitch;
      p.y = BOX.labelH;
    });
    box.resizeWithoutConstraints(pins.length * ROW.pitch, BOX.labelH + BOX.pinH);
  }
  packRows(ctx);
  await relayout(ctx);
  return value + ' 을 보관했습니다. 세트에는 남아 있어서 기존 화면은 깨지지 않습니다.';
}

async function restoreIcon(ctx, id) {
  const comp = await componentById(id);
  if (!isArchived(comp)) return '보관된 아이콘이 아닙니다.';
  const value = valueOf(comp);
  comp.description = comp.description.slice(ARCHIVE_TAG.length).trim();

  const box = boxOf(ctx, value);
  if (box) {
    for (const p of pinsIn(box)) {
      const row = rowsOf(ctx).find(function (r) { return p.name === pinName(r, value); });
      if (row) row.appendChild(p);
    }
    if (!pinsIn(box).length) box.remove();
  }
  packRows(ctx);
  await relayout(ctx);
  return value + ' 을 복원했습니다.';
}

// ---------- mappin 생성 ----------

async function generate(ctx, id) {
  const comp = await componentById(id);
  const value = valueOf(comp);
  if (isArchived(comp)) throw new Error('보관된 아이콘은 mappin을 만들 수 없습니다. 먼저 복원해 주세요.');
  if (boxOf(ctx, value)) throw new Error('archive에 ' + value + ' 핀이 남아 있습니다. 복원하거나 정리해 주세요.');

  const created = [];
  for (const row of rowsOf(ctx)) {
    if (pinOf(row, value)) continue;
    const template = pinsIn(row).find(function (p) { return !!iconOf(p); });
    if (!template) throw new Error(row.name + ' 행에 복제할 핀이 없습니다.');
    const t = iconOf(template);
    const geo = { x: t.x, y: t.y, w: t.width, h: t.height };

    const clone = template.clone();
    row.appendChild(clone);
    clone.name = pinName(row, value);
    const icon = iconOf(clone);
    icon.swapComponent(comp);
    if (icon.width !== geo.w || icon.height !== geo.h) icon.resize(geo.w, geo.h);
    icon.x = geo.x;
    icon.y = geo.y;
    created.push(clone);
  }
  if (!created.length) return value + ' 은 이미 모든 행에 핀이 있습니다.';

  packRows(ctx);
  await relayout(ctx);
  figma.currentPage.selection = created;
  figma.viewport.scrollAndZoomIntoView(created);
  return value + ' mappin ' + created.length + '장을 만들었습니다.';
}

// ---------- 메시지 ----------

async function run(task) {
  try {
    const ctx = await locate();
    const message = task ? await task(ctx) : null;
    if (task) figma.commitUndo();
    figma.ui.postMessage({ type: 'state', state: await snapshot(ctx), message: message, changed: !!task });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
  }
}

figma.ui.onmessage = function (msg) {
  if (msg.type === 'init') return run(null);
  if (msg.type === 'add') return run(function (ctx) { return addIcon(ctx, msg.name, msg.bytes); });
  if (msg.type === 'replace') return run(function (ctx) { return replaceImage(ctx, msg.id, msg.bytes); });
  if (msg.type === 'rename') return run(function (ctx) { return renameIcon(ctx, msg.id, msg.name); });
  if (msg.type === 'archive') return run(function (ctx) { return archiveIcon(ctx, msg.id); });
  if (msg.type === 'restore') return run(function (ctx) { return restoreIcon(ctx, msg.id); });
  if (msg.type === 'generate') return run(function (ctx) { return generate(ctx, msg.id); });
  if (msg.type === 'close') figma.closePlugin();
};
