/* @ds-bundle: {"format":4,"namespace":"SmclinicDesignSystem_c4cdb2","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"ICON_PATHS","sourcePath":"components/core/IconPaths.jsx"},{"name":"Kbd","sourcePath":"components/core/Kbd.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"Identifier","sourcePath":"components/data/Identifier.jsx"},{"name":"ScheduleGrid","sourcePath":"components/data/ScheduleGrid.jsx"},{"name":"SlotCell","sourcePath":"components/data/SlotCell.jsx"},{"name":"InlineNotice","sourcePath":"components/feedback/InlineNotice.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"SkeletonRows","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"FieldGroup","sourcePath":"components/forms/Field.jsx"},{"name":"FieldRow","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"FilterChip","sourcePath":"components/labels/FilterChip.jsx"},{"name":"SPECIALTIES","sourcePath":"components/labels/SpecialtyTag.jsx"},{"name":"SpecialtyTag","sourcePath":"components/labels/SpecialtyTag.jsx"},{"name":"StatusBadge","sourcePath":"components/labels/StatusBadge.jsx"},{"name":"Panel","sourcePath":"components/navigation/Panel.jsx"},{"name":"Toolbar","sourcePath":"components/navigation/Panel.jsx"},{"name":"ToolbarSeparator","sourcePath":"components/navigation/Panel.jsx"},{"name":"ToolbarSpacer","sourcePath":"components/navigation/Panel.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"CommandPalette","sourcePath":"components/overlays/CommandPalette.jsx"},{"name":"Menu","sourcePath":"components/overlays/Menu.jsx"},{"name":"Popover","sourcePath":"components/overlays/Menu.jsx"},{"name":"Modal","sourcePath":"components/overlays/Modal.jsx"}],"sourceHashes":{"components/core/Button.jsx":"0ae52c50d75e","components/core/Icon.jsx":"45f358ba5384","components/core/IconButton.jsx":"e82d8d6eb70b","components/core/IconPaths.jsx":"be31189fed94","components/core/Kbd.jsx":"68da9ab54a14","components/data/DataTable.jsx":"8688bafa46d9","components/data/Identifier.jsx":"7b9531c306cc","components/data/ScheduleGrid.jsx":"bd0abc0c0bd4","components/data/SlotCell.jsx":"0b5d6e9419c8","components/feedback/InlineNotice.jsx":"25aab226e3bb","components/feedback/Skeleton.jsx":"42cde23dfb7e","components/forms/Checkbox.jsx":"9cbfe19cd45b","components/forms/Field.jsx":"01bfc5f94e04","components/forms/Input.jsx":"6d2399e01b11","components/forms/Radio.jsx":"cb0a7dc6d333","components/forms/SearchInput.jsx":"86124c1a8be6","components/forms/Select.jsx":"fd3c05bbf3ba","components/labels/FilterChip.jsx":"e4d77b0f5d6f","components/labels/SpecialtyTag.jsx":"78e804e3bf9a","components/labels/StatusBadge.jsx":"09699df0782f","components/navigation/Panel.jsx":"4e9914a5e84b","components/navigation/Tabs.jsx":"9cb57a4c9a25","components/overlays/CommandPalette.jsx":"2282c3668a76","components/overlays/Menu.jsx":"1c41562b8d44","components/overlays/Modal.jsx":"2ac6a40e6192","ui_kits/arm-admin/AdminScreens.jsx":"b281913bc563","ui_kits/arm-doctor/DoctorScreens.jsx":"6b98b7b08fd9","ui_kits/arm-operator/App.jsx":"55ac4f006a9c","ui_kits/arm-operator/BookingModal.jsx":"5e77fa9b8d17","ui_kits/arm-operator/BookingsScreen.jsx":"aaff54996e41","ui_kits/arm-operator/OperatorShell.jsx":"7c19c5b1d2dc","ui_kits/arm-operator/ScheduleScreen.jsx":"9fb2cbcb8a0e","ui_kits/arm-operator/WaitlistScreen.jsx":"60e24c52e37e","ui_kits/arm-operator/data.js":"ebbfb7ad0ecd","ui_kits/arm-registrar/RegistrarScreens.jsx":"e0547ce9552b","ui_kits/shared/Chrome.jsx":"7e11df1384ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SmclinicDesignSystem_c4cdb2 = window.SmclinicDesignSystem_c4cdb2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/IconPaths.jsx
try { (() => {
// Lucide 0.x outline set, copied verbatim from assets/icons/lucide/*.svg. ISC — assets/icons/LICENSE-lucide.txt
const ICON_PATHS = {
  "arrow-right": "<path d=\"M5 12h14\"></path> <path d=\"m12 5 7 7-7 7\"></path>",
  "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M4.929 4.929 19.07 19.071\"></path>",
  "bell": "<path d=\"M10.268 21a2 2 0 0 0 3.464 0\"></path> <path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\"></path>",
  "building-2": "<path d=\"M10 12h4\"></path> <path d=\"M10 8h4\"></path> <path d=\"M14 21v-3a2 2 0 0 0-4 0v3\"></path> <path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\"></path> <path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\"></path>",
  "calendar": "<path d=\"M8 2v3\"></path> <path d=\"M16 2v3\"></path> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"></rect> <path d=\"M3 9h18\"></path>",
  "calendar-days": "<path d=\"M8 2v3\"></path> <path d=\"M16 2v3\"></path> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"></rect> <path d=\"M3 9h18\"></path> <path d=\"M8 13h.01\"></path> <path d=\"M12 13h.01\"></path> <path d=\"M16 13h.01\"></path> <path d=\"M8 17h.01\"></path> <path d=\"M12 17h.01\"></path> <path d=\"M16 17h.01\"></path>",
  "check": "<path d=\"M20 6 9 17l-5-5\"></path>",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"></path>",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\"></path>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"></path>",
  "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"></line> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"></line>",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"m9 12 2 2 4-4\"></path>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M12 6v6l4 2\"></path>",
  "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\"></circle> <circle cx=\"19\" cy=\"12\" r=\"1\"></circle> <circle cx=\"5\" cy=\"12\" r=\"1\"></circle>",
  "file-text": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"></path> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"></path> <path d=\"M10 9H8\"></path> <path d=\"M16 13H8\"></path> <path d=\"M16 17H8\"></path>",
  "funnel": "<path d=\"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z\"></path>",
  "hourglass": "<path d=\"M5 22h14\"></path> <path d=\"M5 2h14\"></path> <path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"></path> <path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"></path>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M12 16v-4\"></path> <path d=\"M12 8h.01\"></path>",
  "keyboard": "<path d=\"M10 8h.01\"></path> <path d=\"M12 12h.01\"></path> <path d=\"M14 8h.01\"></path> <path d=\"M16 12h.01\"></path> <path d=\"M18 8h.01\"></path> <path d=\"M6 8h.01\"></path> <path d=\"M7 16h10\"></path> <path d=\"M8 12h.01\"></path> <rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"></rect>",
  "layout-grid": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"></rect> <rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"></rect> <rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"></rect> <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"></rect>",
  "list": "<path d=\"M3 5h.01\"></path> <path d=\"M3 12h.01\"></path> <path d=\"M3 19h.01\"></path> <path d=\"M8 5h13\"></path> <path d=\"M8 12h13\"></path> <path d=\"M8 19h13\"></path>",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path>",
  "log-out": "<path d=\"m16 17 5-5-5-5\"></path> <path d=\"M21 12H9\"></path> <path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"></path>",
  "monitor": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"></rect> <line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"></line> <line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"></line>",
  "panel-left": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect> <path d=\"M9 3v18\"></path>",
  "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"></path> <path d=\"m15 5 4 4\"></path>",
  "phone": "<path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\"></path>",
  "plus": "<path d=\"M5 12h14\"></path> <path d=\"M12 5v14\"></path>",
  "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"></path> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"></path> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"></rect>",
  "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"></path> <path d=\"M21 3v5h-5\"></path> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"></path> <path d=\"M8 16H3v5\"></path>",
  "rows-3": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect> <path d=\"M21 9H3\"></path> <path d=\"M21 15H3\"></path>",
  "search": "<path d=\"m21 21-4.34-4.34\"></path> <circle cx=\"11\" cy=\"11\" r=\"8\"></circle>",
  "settings": "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"></path> <circle cx=\"12\" cy=\"12\" r=\"3\"></circle>",
  "star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"></path>",
  "stethoscope": "<path d=\"M11 2v2\"></path> <path d=\"M5 2v2\"></path> <path d=\"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1\"></path> <path d=\"M8 15a6 6 0 0 0 12 0v-3\"></path> <circle cx=\"20\" cy=\"10\" r=\"2\"></circle>",
  "trash-2": "<path d=\"M10 11v6\"></path> <path d=\"M14 11v6\"></path> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"></path> <path d=\"M3 6h18\"></path> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path>",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"></path> <path d=\"M12 9v4\"></path> <path d=\"M12 17h.01\"></path>",
  "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"></path> <circle cx=\"12\" cy=\"7\" r=\"4\"></circle>",
  "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"></path> <path d=\"M16 3.128a4 4 0 0 1 0 7.744\"></path> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"></path> <circle cx=\"9\" cy=\"7\" r=\"4\"></circle>",
  "x": "<path d=\"M18 6 6 18\"></path> <path d=\"m6 6 12 12\"></path>"
};
Object.assign(__ds_scope, { ICON_PATHS });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconPaths.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Обёртка над набором Lucide (assets/icons/lucide). Цвет всегда currentColor, толщина 2. */
function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  title,
  className = '',
  style,
  ...rest
}) {
  const body = __ds_scope.ICON_PATHS[name];
  if (!body) return null;
  const markup = (title ? '<title>' + title + '</title>' : '') + body;
  return /*#__PURE__*/React.createElement("svg", _extends({
    className: ('sm-icon ' + className).trim(),
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: title ? 'img' : undefined,
    "aria-hidden": title ? undefined : 'true',
    focusable: "false",
    style: style,
    dangerouslySetInnerHTML: {
      __html: markup
    }
  }, rest));
}
const ICON_NAMES = Object.keys(__ds_scope.ICON_PATHS);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Кнопка. Пилюля 40px — основные действия вне плотных зон. dense (32px, радиус 4) — внутри таблиц,
   строк и панелей. Иконка без подписи в основном действии запрещена: используйте IconButton. */
function Button({
  variant = 'primary',
  dense = false,
  block = false,
  icon,
  iconEnd,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = ['sm-btn', 'sm-btn--' + variant, dense && 'sm-btn--dense', block && 'sm-btn--block', className].filter(Boolean).join(' ');
  const s = dense ? 14 : 16;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s
  }) : null, children, iconEnd ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd,
    size: s
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Кнопка-иконка. Только вспомогательные действия (панели инструментов, строки таблицы, закрытие).
   label обязателен — он идёт в aria-label и в title. */
function IconButton({
  icon,
  label,
  variant = 'plain',
  size = 'md',
  pressed,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = ['sm-iconbtn', variant !== 'plain' && 'sm-iconbtn--' + variant, size === 'sm' && 'sm-iconbtn--sm', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    "aria-label": label,
    title: label,
    "aria-pressed": pressed === undefined ? undefined : String(pressed)
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 14 : 16
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Kbd.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Клавиша. Система клавиатурная: подсказки к горячим клавишам обязательны в меню, поиске и панелях. */
function Kbd({
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("kbd", _extends({
    className: ('sm-kbd ' + className).trim()
  }, rest), children);
}
Object.assign(__ds_scope, { Kbd });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Kbd.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Таблица. Вес всегда 400: если выделено всё, не выделено ничто. */
function DataTable({
  columns = [],
  rows = [],
  compact = false,
  zebra = false,
  selectedId,
  rowKey = 'id',
  onRowClick,
  renderActions,
  className = '',
  ...rest
}) {
  const cls = ['sm-table', compact && 'sm-table--compact', zebra && 'sm-table--zebra', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("table", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    className: c.align === 'right' ? 'sm-num' : undefined,
    style: c.width ? {
      width: c.width
    } : undefined
  }, c.label)), renderActions ? /*#__PURE__*/React.createElement("th", {
    style: {
      width: 88
    }
  }) : null)), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => {
    const key = r[rowKey];
    return /*#__PURE__*/React.createElement("tr", {
      key: key,
      "aria-selected": selectedId === key || undefined,
      onClick: onRowClick ? () => onRowClick(r) : undefined,
      style: onRowClick ? {
        cursor: 'pointer'
      } : undefined
    }, columns.map(c => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      className: c.align === 'right' ? 'sm-num' : undefined
    }, c.render ? c.render(r) : r[c.key])), renderActions ? /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      className: "sm-table__actions"
    }, renderActions(r))) : null);
  })));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/Identifier.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Идентификатор: номер записи, UID пациента, код услуги. Только моноширинный шрифт. */
function Identifier({
  value,
  strong = false,
  prefix,
  className = '',
  children,
  ...rest
}) {
  const cls = ['sm-ident', strong && 'sm-ident--strong', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), prefix ? prefix + ' ' : null, value !== undefined ? value : children);
}
Object.assign(__ds_scope, { Identifier });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Identifier.jsx", error: String((e && e.message) || e) }); }

// components/data/SlotCell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Слот сетки расписания — главный элемент системы. Ни одно состояние не различается только цветом:
   у каждого есть второй признак — точка, иконка, штриховка, тип контура или зачёркивание.
   Слот — карточка в дорожке врача, а не ячейка таблицы: свободное время не рисуется. */
const PRINT_LABEL = {
  free: 'свободен',
  booked: 'занят',
  first: 'первичный',
  waitlist: 'из листа ожидания',
  blocked: 'заблокирован',
  break: 'перерыв',
  absent: 'отсутствие',
  cancelled: 'отменён'
};
function SlotCell({
  state = 'free',
  patient,
  note,
  meta,
  vip = false,
  selected = false,
  hour = false,
  className = '',
  ...rest
}) {
  const cls = ['sm-slot', 'sm-slot--' + state, vip && 'sm-slot--vip', hour && 'sm-slot--hour', className].filter(Boolean).join(' ');
  const disabled = state === 'blocked' || state === 'break' || state === 'absent';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-selected": selected || undefined,
    "aria-disabled": disabled || undefined,
    "data-print-label": PRINT_LABEL[state],
    "data-hatch": state === 'blocked' || state === 'absent' ? '' : undefined
  }, rest), state === 'first' ? /*#__PURE__*/React.createElement("span", {
    className: "sm-slot__dot",
    "aria-hidden": "true"
  }) : null, state === 'waitlist' ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "hourglass",
    size: 12
  }) : null, vip ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    size: 12,
    title: "VIP"
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "sm-slot__name"
  }, patient || note || ''), meta ? /*#__PURE__*/React.createElement("span", {
    className: "sm-slot__meta"
  }, meta) : null);
}
Object.assign(__ds_scope, { SlotCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SlotCell.jsx", error: String((e && e.message) || e) }); }

// components/data/ScheduleGrid.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Сетка расписания — временное полотно: колонка времени плюс дорожка на врача.
   Вертикальных линий нет, дорожки разделены воздухом; часовая линия висит на самих слотах :00,
   поэтому совпадает с сеткой при любой высоте шапки и любой плотности строк.
   В реальной системе виртуализируется — здесь отрисовывается целиком, объём демонстрационный. */
function ScheduleGrid({
  times = [],
  columns = [],
  colWidth = 184,
  onSlotClick,
  selected,
  now,
  className = '',
  ...rest
}) {
  const template = 'var(--time-col-w) repeat(' + columns.length + ', minmax(148px, ' + colWidth + 'px))';
  const headRef = React.useRef(null);
  const [nowTop, setNowTop] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!now || times.length < 2 || !headRef.current) {
      setNowTop(null);
      return;
    }
    const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const offset = (mins(now) - mins(times[0])) / 15;
    if (offset < 0 || offset > times.length) {
      setNowTop(null);
      return;
    }
    const head = headRef.current;
    const rows = head.parentNode.querySelectorAll('.sm-grid__time');
    const rowH = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : head.getBoundingClientRect().height;
    setNowTop(head.getBoundingClientRect().height + offset * rowH);
  }, [now, times, columns]);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-grid ' + className).trim(),
    style: {
      gridTemplateColumns: template
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "sm-grid__head",
    ref: headRef
  }), columns.map(c => /*#__PURE__*/React.createElement("div", {
    className: "sm-grid__head",
    key: c.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-grid__doctor"
  }, c.doctor), /*#__PURE__*/React.createElement("span", {
    className: "sm-grid__spec"
  }, c.spec))), times.map((t, r) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: t
  }, /*#__PURE__*/React.createElement("div", {
    className: 'sm-grid__time' + (t.endsWith(':00') ? ' sm-grid__time--hour' : '')
  }, t.endsWith(':00') ? t : ''), columns.map(c => {
    const s = c.slots && c.slots[r] || {
      state: 'free'
    };
    const id = c.id + ':' + t;
    return /*#__PURE__*/React.createElement(__ds_scope.SlotCell, {
      key: id,
      state: s.state,
      patient: s.patient,
      note: s.note,
      meta: s.meta,
      vip: s.vip,
      hour: t.endsWith(':00'),
      selected: selected === id,
      onClick: onSlotClick ? () => onSlotClick(id, s, c, t) : undefined
    });
  }))), nowTop !== null ? /*#__PURE__*/React.createElement("div", {
    className: "sm-grid__now",
    style: {
      top: nowTop
    },
    "aria-hidden": "true"
  }) : null);
}
Object.assign(__ds_scope, { ScheduleGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ScheduleGrid.jsx", error: String((e && e.message) || e) }); }

// components/feedback/InlineNotice.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Уведомление строкой в потоке — над формой или списком. Самоисчезающих всплывашек для важного нет. */
const TONE_ICON = {
  info: 'info',
  success: 'circle-check',
  attention: 'triangle-alert',
  danger: 'circle-alert'
};
function InlineNotice({
  tone = 'info',
  title,
  icon,
  actions,
  children,
  className = '',
  ...rest
}) {
  const name = icon === null ? null : icon || TONE_ICON[tone];
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['sm-notice', 'sm-notice--' + tone, className].filter(Boolean).join(' '),
    role: tone === 'danger' ? 'alert' : 'status'
  }, rest), name ? /*#__PURE__*/React.createElement("span", {
    className: "sm-notice__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: 16
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: "sm-notice__body"
  }, title ? /*#__PURE__*/React.createElement("div", {
    className: "sm-notice__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "sm-notice__text"
  }, children) : null, actions ? /*#__PURE__*/React.createElement("div", {
    className: "sm-notice__actions"
  }, actions) : null));
}
Object.assign(__ds_scope, { InlineNotice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/InlineNotice.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Скелетон. До 300 мс не показываем ничего; 300 мс – 1 с — скелетон; дольше 1 с — скелетон и подпись. */
function Skeleton({
  width = '100%',
  height = 16,
  radius,
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ('sm-skeleton ' + className).trim(),
    style: {
      width,
      height,
      borderRadius: radius,
      ...style
    },
    "aria-hidden": "true"
  }, rest));
}

/* Столбик строк-заглушек в области, куда придут данные. caption показывается, когда ожидание дольше секунды. */
function SkeletonRows({
  rows = 4,
  height = 32,
  caption,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-skeleton__stack ' + className).trim(),
    role: "status",
    "aria-busy": "true"
  }, rest), caption ? /*#__PURE__*/React.createElement("span", {
    className: "sm-skeleton__caption"
  }, caption) : null, Array.from({
    length: rows
  }).map((_, i) => /*#__PURE__*/React.createElement(Skeleton, {
    key: i,
    height: height
  })));
}
Object.assign(__ds_scope, { Skeleton, SkeletonRows });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Флажок. Цель нажатия не меньше 24px даже в компактном режиме. */
function Checkbox({
  label,
  disabled,
  className = '',
  ...rest
}) {
  const cls = ['sm-check', disabled && 'sm-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "sm-check__box"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    strokeWidth: 3
  })), label ? /*#__PURE__*/React.createElement("span", {
    className: "sm-check__text"
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Обёртка поля: подпись программно связана с контролом, ошибка описана текстом рядом с полем. */
function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-field ' + className).trim()
  }, rest), label ? /*#__PURE__*/React.createElement("label", {
    className: "sm-field__label",
    htmlFor: htmlFor
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "sm-field__req",
    "aria-hidden": "true"
  }, "*") : null) : null, children, error ? /*#__PURE__*/React.createElement("span", {
    className: "sm-field__error",
    role: "alert"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert",
    size: 12
  }), error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "sm-field__hint"
  }, hint) : null);
}

/* Группа полей формы: шаг 24px между смысловыми группами, ширина до 640px. */
function FieldGroup({
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-fieldgroup ' + className).trim()
  }, rest), children);
}

/* Строка из нескольких полей в одну линию. */
function FieldRow({
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-fieldrow ' + className).trim()
  }, rest), children);
}
Object.assign(__ds_scope, { Field, FieldGroup, FieldRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Поле ввода. 40px в формах, compact 32px в панелях и строках таблицы. */
function Input({
  compact = false,
  invalid = false,
  mono = false,
  className = '',
  ...rest
}) {
  const cls = ['sm-input', compact && 'sm-input--compact', invalid && 'sm-input--invalid', mono && 'sm-input--mono', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("input", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest));
}

/* Многострочное поле: комментарий к записи, причина отмены. */
function Textarea({
  invalid = false,
  className = '',
  ...rest
}) {
  const cls = ['sm-input', invalid && 'sm-input--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest));
}
Object.assign(__ds_scope, { Input, Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Переключатель. Отмеченное состояние — кольцо, а не только цвет. */
function Radio({
  label,
  disabled,
  className = '',
  ...rest
}) {
  const cls = ['sm-check', disabled && 'sm-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "sm-check__box sm-check__box--round"
  }), label ? /*#__PURE__*/React.createElement("span", {
    className: "sm-check__text"
  }, label) : null);
}

/* Группа переключателей с общим name. */
function RadioGroup({
  name,
  value,
  onChange,
  options = [],
  inline = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup",
    className: className,
    style: {
      display: 'flex',
      flexDirection: inline ? 'row' : 'column',
      gap: inline ? 'var(--space-4)' : 'var(--space-2)'
    }
  }, rest), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement(Radio, {
      key: opt.value,
      name: name,
      value: opt.value,
      label: opt.label,
      disabled: opt.disabled,
      checked: value === undefined ? undefined : value === opt.value,
      onChange: onChange
    });
  }));
}
Object.assign(__ds_scope, { Radio, RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Поиск пациента, врача, услуги. Клавиша фокуса видна в самом поле. */
function SearchInput({
  compact = false,
  shortcut,
  className = '',
  ...rest
}) {
  const cls = ['sm-search', compact && 'sm-search--compact', className].filter(Boolean).join(' ');
  const inputCls = ['sm-input', compact && 'sm-input--compact'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-search__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: compact ? 14 : 16
  })), /*#__PURE__*/React.createElement("input", _extends({
    type: "search",
    className: inputCls
  }, rest)), shortcut ? /*#__PURE__*/React.createElement("span", {
    className: "sm-search__kbd"
  }, /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, shortcut)) : null);
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Выпадающий список. Длинные справочники (врачи, услуги) грузятся серверным поиском, а не целиком. */
function Select({
  compact = false,
  invalid = false,
  options = [],
  placeholder,
  children,
  className = '',
  ...rest
}) {
  const cls = ['sm-select', compact && 'sm-select--compact', invalid && 'sm-select--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: cls
  }, /*#__PURE__*/React.createElement("select", _extends({
    "aria-invalid": invalid || undefined
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder) : null, options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value,
    disabled: o.disabled
  }, o.label)), children), /*#__PURE__*/React.createElement("span", {
    className: "sm-select__chev"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: compact ? 14 : 16
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/labels/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Чип фильтра: клиника, направление, тип приёма. Радиус 4px — это плотная зона. */
function FilterChip({
  active = false,
  icon,
  count,
  small = false,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = ['sm-chip', small && 'sm-chip--sm', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    "aria-pressed": String(!!active)
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: small ? 12 : 14
  }) : null, children, count !== undefined ? /*#__PURE__*/React.createElement("span", {
    className: "sm-chip__count"
  }, count) : null);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/labels/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/labels/SpecialtyTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Метка направления. Пастель — только фильтры, вкладки и метки специальностей. В сетку расписания не заходит. */
const SPECIALTIES = {
  surgery: {
    label: 'Хирургия',
    token: '--spec-surgery'
  },
  oncology: {
    label: 'Онкология',
    token: '--spec-oncology'
  },
  homecare: {
    label: 'Услуги на дому',
    token: '--spec-homecare'
  },
  plastic: {
    label: 'Пластика',
    token: '--spec-plastic'
  },
  pediatric: {
    label: 'Детские клиники',
    token: '--spec-pediatric'
  },
  dental: {
    label: 'Стоматология',
    token: '--spec-dental'
  },
  cosmetology: {
    label: 'Косметология',
    token: '--spec-cosmetology'
  },
  ivf: {
    label: 'ЭКО',
    token: '--spec-ivf'
  },
  emergency: {
    label: 'Скорая помощь',
    token: '--spec-emergency'
  }
};
function SpecialtyTag({
  specialty,
  children,
  className = '',
  style,
  ...rest
}) {
  const s = SPECIALTIES[specialty];
  const bg = s ? 'var(' + s.token + ')' : 'var(--surface-light)';
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ('sm-spec ' + className).trim(),
    style: {
      background: bg,
      ...style
    }
  }, rest), children || (s ? s.label : specialty));
}
Object.assign(__ds_scope, { SPECIALTIES, SpecialtyTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/labels/SpecialtyTag.jsx", error: String((e && e.message) || e) }); }

// components/labels/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Статусная плашка вне сетки: списки, карточки, шапки. Иконка обязательна — цвет не единственный признак. */
const TONE_ICON = {
  neutral: 'circle-alert',
  booked: 'circle-check',
  attention: 'hourglass',
  danger: 'ban',
  vip: 'star'
};
function StatusBadge({
  tone = 'neutral',
  icon,
  children,
  className = '',
  ...rest
}) {
  const name = icon === null ? null : icon || TONE_ICON[tone];
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['sm-badge', 'sm-badge--' + tone, className].filter(Boolean).join(' ')
  }, rest), name ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: 11
  }) : null, children);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/labels/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Панель: карточка с шапкой и телом. Без тени — глубина задаётся поверхностью и линией 1px. */
function Panel({
  title,
  actions,
  padded = true,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    className: ('sm-panel ' + className).trim()
  }, rest), title || actions ? /*#__PURE__*/React.createElement("header", {
    className: "sm-panel__head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sm-panel__title"
  }, title), actions) : null, padded ? /*#__PURE__*/React.createElement("div", {
    className: "sm-panel__body"
  }, children) : children);
}

/* Панель инструментов над сеткой или списком. */
function Toolbar({
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-toolbar ' + className).trim()
  }, rest), children);
}

/* Вертикальная разделительная линия внутри панели инструментов. */
function ToolbarSeparator() {
  return /*#__PURE__*/React.createElement("span", {
    className: "sm-toolbar__sep",
    "aria-hidden": "true"
  });
}

/* Распорка, отжимающая остаток панели инструментов вправо. */
function ToolbarSpacer() {
  return /*#__PURE__*/React.createElement("span", {
    className: "sm-toolbar__spacer"
  });
}
Object.assign(__ds_scope, { Panel, Toolbar, ToolbarSeparator, ToolbarSpacer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Panel.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Вкладки раздела. Активная — вес 700 и планка --brand-green снизу. */
function Tabs({
  items = [],
  value,
  onChange,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-tabs ' + className).trim(),
    role: "tablist"
  }, rest), items.map(t => /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "tab",
    key: t.id,
    className: "sm-tab",
    "aria-selected": String(value === t.id),
    onClick: () => onChange && onChange(t.id)
  }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16
  }) : null, t.label, t.count !== undefined ? /*#__PURE__*/React.createElement("span", {
    className: "sm-tab__count"
  }, t.count) : null)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlays/CommandPalette.jsx
try { (() => {
/* Командная палитра по Ctrl+K: врач, услуга, клиника, пациент. */
function CommandPalette({
  open = true,
  query = '',
  onQueryChange,
  groups = [],
  onSelect,
  onClose,
  footerHint = true
}) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "sm-scrim",
    style: {
      alignItems: 'flex-start',
      paddingTop: 88
    },
    onMouseDown: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-modal",
    style: {
      maxWidth: 560
    },
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u041A\u043E\u043C\u0430\u043D\u0434\u043D\u0430\u044F \u043F\u0430\u043B\u0438\u0442\u0440\u0430",
    onMouseDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__head",
    style: {
      padding: '0 12px',
      gap: 8,
      height: 'var(--input-h)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    className: "sm-input",
    style: {
      border: 0,
      height: 38,
      padding: 0
    },
    autoFocus: true,
    value: query,
    placeholder: "\u0412\u0440\u0430\u0447, \u0443\u0441\u043B\u0443\u0433\u0430, \u043A\u043B\u0438\u043D\u0438\u043A\u0430, \u043F\u0430\u0446\u0438\u0435\u043D\u0442",
    onChange: e => onQueryChange && onQueryChange(e.target.value)
  }), /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, "Esc")), /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__body",
    style: {
      padding: '4px 0',
      maxHeight: 320
    }
  }, groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px 4px',
      fontSize: 11,
      lineHeight: '14px',
      color: 'var(--text-secondary)'
    }
  }, g.title), g.items.map(it => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: it.id,
    className: "sm-menu__item",
    onClick: () => onSelect && onSelect(it)
  }, it.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 14
  }) : null, /*#__PURE__*/React.createElement("span", null, it.label), it.meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, it.meta) : null))))), footerHint ? /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__foot",
    style: {
      justifyContent: 'flex-start',
      gap: 12,
      padding: '8px 12px',
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, "\u2191"), " ", /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, "\u2193"), " \u0432\u044B\u0431\u043E\u0440"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, "Enter"), " \u043E\u0442\u043A\u0440\u044B\u0442\u044C"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, "/"), " \u043F\u043E\u0438\u0441\u043A \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430")) : null));
}
Object.assign(__ds_scope, { CommandPalette });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/CommandPalette.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Menu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Всплывающее меню и поповер. Позиционирует вызывающая сторона; компонент даёт слой, рамку и тень. */
function Menu({
  items = [],
  width = 220,
  className = '',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['sm-popover', 'sm-menu', className].filter(Boolean).join(' '),
    role: "menu",
    style: {
      width,
      ...style
    }
  }, rest), items.map((it, i) => it.separator ? /*#__PURE__*/React.createElement("div", {
    className: "sm-menu__sep",
    key: 's' + i
  }) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "menuitem",
    key: it.label + i,
    className: ['sm-menu__item', it.danger && 'sm-menu__item--danger'].filter(Boolean).join(' '),
    disabled: it.disabled,
    onClick: it.onSelect
  }, it.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 14
  }) : null, it.label, it.kbd ? /*#__PURE__*/React.createElement("span", {
    className: "sm-menu__kbd"
  }, /*#__PURE__*/React.createElement(__ds_scope.Kbd, null, it.kbd)) : null)));
}

/* Пустой слой поверх сетки: подсказка, карточка слота, выпадающие результаты поиска. */
function Popover({
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['sm-popover', className].filter(Boolean).join(' ')
  }, rest), children);
}
Object.assign(__ds_scope, { Menu, Popover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Menu.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Modal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Модальное окно. Единственное место с тенью, кроме поповеров. Модальное поверх модального запрещено.
   Esc закрывает всегда — ловушек фокуса нет. */
function Modal({
  open = true,
  title,
  onClose,
  footer,
  wide = false,
  children,
  className = '',
  ...rest
}) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "sm-scrim",
    onMouseDown: onClose
  }, /*#__PURE__*/React.createElement("div", _extends({
    className: ('sm-modal ' + className).trim(),
    style: wide ? {
      maxWidth: 880
    } : undefined,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    onMouseDown: e => e.stopPropagation()
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__title"
  }, title), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__body"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "sm-modal__foot"
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Modal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-admin/AdminScreens.jsx
try { (() => {
const {
  Panel,
  Button,
  IconButton,
  DataTable,
  StatusBadge,
  SpecialtyTag,
  Identifier,
  Toolbar,
  ToolbarSeparator,
  ToolbarSpacer,
  FilterChip,
  SearchInput,
  InlineNotice,
  Modal,
  Field,
  FieldGroup,
  FieldRow,
  Input,
  Select,
  Checkbox,
  RadioGroup,
  Textarea,
  Tabs,
  Icon,
  Kbd,
  SlotCell
} = window.SmclinicDesignSystem_c4cdb2;
const DAYS = ['Пн 10', 'Вт 11', 'Ср 12', 'Чт 13', 'Пт 14', 'Сб 15', 'Вс 16'];
const DOCTORS = [{
  id: 'd1',
  name: 'Ковалёва И. С.',
  spec: 'Терапевт',
  specialty: 'surgery',
  week: ['work', 'work', 'work', 'work', 'work', 'off', 'off']
}, {
  id: 'd2',
  name: 'Мельник О. Р.',
  spec: 'Хирург',
  specialty: 'surgery',
  week: ['work', 'work', 'block', 'block', 'work', 'work', 'off']
}, {
  id: 'd3',
  name: 'Ершова Н. Д.',
  spec: 'Стоматолог',
  specialty: 'dental',
  week: ['work', 'work', 'work', 'work', 'work', 'work', 'off']
}, {
  id: 'd4',
  name: 'Панов А. Г.',
  spec: 'Педиатр',
  specialty: 'pediatric',
  week: ['work', 'work', 'work', 'break', 'work', 'off', 'off']
}, {
  id: 'd5',
  name: 'Литвинова С. А.',
  spec: 'Косметолог',
  specialty: 'cosmetology',
  week: ['absent', 'absent', 'absent', 'absent', 'absent', 'absent', 'absent']
}, {
  id: 'd6',
  name: 'Гурьев П. Л.',
  spec: 'Терапевт',
  specialty: 'surgery',
  week: ['off', 'work', 'work', 'work', 'work', 'work', 'off']
}];
const CELL = {
  work: {
    bg: 'var(--brand-green-tint)',
    bar: 'var(--brand-green)',
    label: '09:00–14:00'
  },
  block: {
    bg: 'var(--surface-light)',
    bar: 'var(--border-dark)',
    label: 'Операционный день',
    hatch: true
  },
  break: {
    bg: 'var(--surface-light)',
    bar: 'var(--border-dark)',
    label: 'Сокращённый',
    dashed: true
  },
  absent: {
    bg: 'var(--surface-absent)',
    bar: null,
    label: 'Отпуск',
    hatch: true
  },
  off: {
    bg: 'var(--white)',
    bar: null,
    label: ''
  }
};
function WeekCell({
  kind,
  onClick
}) {
  const c = CELL[kind];
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "data-print-label": c.label || 'нет приёма',
    style: {
      position: 'relative',
      height: 40,
      border: 0,
      borderRight: '1px solid var(--border-cell)',
      borderBottom: '1px solid var(--border-cell)',
      borderRadius: 0,
      background: c.bg,
      backgroundImage: c.hatch ? 'var(--hatch-45)' : 'none',
      outline: c.dashed ? '1px dashed var(--border-dark)' : 'none',
      outlineOffset: -3,
      font: 'inherit',
      fontSize: 11,
      color: kind === 'work' ? 'var(--text-primary)' : 'var(--text-secondary)',
      textAlign: 'left',
      padding: '0 8px 0 11px',
      cursor: 'pointer'
    }
  }, c.bar ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      background: c.bar
    }
  }) : null, c.label);
}
function AdminApp() {
  const [nav, setNav] = React.useState('templates');
  const [edit, setEdit] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [tab, setTab] = React.useState('week');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--n-100)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(WorkstationTop, {
    role: "\u0410\u0420\u041C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430",
    user: "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0420. \u0415.",
    initials: "\u0421\u0420",
    searchPlaceholder: "\u0412\u0440\u0430\u0447, \u043A\u0430\u0431\u0438\u043D\u0435\u0442, \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435",
    right: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "secondary",
      icon: "plus",
      onClick: () => setEdit({
        doctor: 'Ковалёва И. С.',
        day: 'Ср 12'
      })
    }, "\u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      paddingBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(WorkstationNav, {
    value: nav,
    onChange: setNav,
    items: [{
      id: 'templates',
      label: 'Шаблоны приёма',
      icon: 'calendar-days'
    }, {
      id: 'blocks',
      label: 'Блокировки',
      icon: 'lock',
      count: 4
    }, {
      id: 'absence',
      label: 'Отсутствия',
      icon: 'user',
      count: 2
    }, {
      id: 'equipment',
      label: 'Оборудование',
      icon: 'monitor',
      count: 9
    }, {
      id: 'users',
      label: 'Операторы',
      icon: 'users',
      count: 24
    }],
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u041A\u043B\u0438\u043D\u0438\u043A \u0432 \u0441\u0435\u0442\u0438"), /*#__PURE__*/React.createElement(Identifier, {
      value: "46"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u0412\u0440\u0430\u0447\u0435\u0439"), /*#__PURE__*/React.createElement(Identifier, {
      value: "5 442"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u0432 \u043C\u0435\u0441\u044F\u0446"), /*#__PURE__*/React.createElement(Identifier, {
      value: "850 000"
    })))
  }), /*#__PURE__*/React.createElement("main", {
    className: "sm-surface",
    style: {
      flex: 1,
      minWidth: 0,
      marginRight: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      id: 'week',
      label: 'Неделя',
      icon: 'calendar-days'
    }, {
      id: 'blocks',
      label: 'Блокировки',
      icon: 'lock',
      count: 4
    }, {
      id: 'equipment',
      label: 'Оборудование',
      icon: 'monitor',
      count: 9
    }]
  })), /*#__PURE__*/React.createElement(Toolbar, null, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    label: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      minWidth: 170,
      textAlign: 'center'
    }
  }, "10 \u2013 16 \u0430\u0432\u0433\u0443\u0441\u0442\u0430 2026"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-right",
    label: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F"
  }), /*#__PURE__*/React.createElement(ToolbarSeparator, null), /*#__PURE__*/React.createElement(FilterChip, {
    active: true,
    count: 6
  }, "\u0412\u0441\u0435 \u0432\u0440\u0430\u0447\u0438"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 2
  }, "\u0415\u0441\u0442\u044C \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200,
      marginLeft: 8
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u0412\u0440\u0430\u0447 \u0438\u043B\u0438 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C"
  })), /*#__PURE__*/React.createElement(ToolbarSpacer, null), /*#__PURE__*/React.createElement(IconButton, {
    icon: "printer",
    label: "\u041F\u0435\u0447\u0430\u0442\u044C \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F"
  }), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "refresh-cw"
  }, "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, notice ? /*#__PURE__*/React.createElement(InlineNotice, {
    tone: notice.tone,
    title: notice.title,
    actions: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "secondary",
      onClick: () => setNotice(null)
    }, "\u0421\u043A\u0440\u044B\u0442\u044C")
  }, notice.text) : null, tab === 'week' ? /*#__PURE__*/React.createElement(Panel, {
    title: "\u0428\u0430\u0431\u043B\u043E\u043D \u043F\u0440\u0438\u0451\u043C\u0430 \xB7 \u0414\u0438\u043D\u0430\u043C\u043E",
    padded: false,
    actions: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "ghost",
      iconEnd: "arrow-right"
    }, "\u0412\u0441\u0435 \u043A\u043B\u0438\u043D\u0438\u043A\u0438")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '220px repeat(7, minmax(96px, 1fr))',
      borderTop: '1px solid var(--border-cell)',
      borderLeft: '1px solid var(--border-cell)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-grid__head",
    style: {
      minHeight: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-grid__doctor"
  }, "\u0412\u0440\u0430\u0447")), DAYS.map(d => /*#__PURE__*/React.createElement("div", {
    className: "sm-grid__head",
    key: d,
    style: {
      minHeight: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-grid__doctor"
  }, d))), DOCTORS.map(doc => /*#__PURE__*/React.createElement(React.Fragment, {
    key: doc.id
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 8px',
      height: 40,
      borderRight: '1px solid var(--border-cell)',
      borderBottom: '1px solid var(--border-cell)',
      background: 'var(--white)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, doc.name), /*#__PURE__*/React.createElement(SpecialtyTag, {
    specialty: doc.specialty
  }, doc.spec)), doc.week.map((k, i) => /*#__PURE__*/React.createElement(WeekCell, {
    key: i,
    kind: k,
    onClick: () => setEdit({
      doctor: doc.name,
      day: DAYS[i]
    })
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      padding: '8px 12px',
      fontSize: 11,
      color: 'var(--text-secondary)',
      flexWrap: 'wrap'
    }
  }, [['work', 'Приём по шаблону'], ['block', 'Блокировка'], ['break', 'Сокращённый день'], ['absent', 'Отсутствие'], ['off', 'Нет приёма']].map(([k, l]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      background: CELL[k].bg,
      backgroundImage: CELL[k].hatch ? 'var(--hatch-45)' : 'none',
      border: '1px solid var(--border-light)',
      outline: CELL[k].dashed ? '1px dashed var(--border-dark)' : 'none',
      outlineOffset: -3
    }
  }), l)))) : null, tab === 'blocks' ? /*#__PURE__*/React.createElement(Panel, {
    title: "\u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u044F",
    padded: false
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: true,
    rowKey: "id",
    columns: [{
      key: 'id',
      label: 'Документ',
      width: 110,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.id
      })
    }, {
      key: 'doctor',
      label: 'Врач',
      width: 170
    }, {
      key: 'kind',
      label: 'Причина'
    }, {
      key: 'from',
      label: 'С',
      width: 110,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.from
      })
    }, {
      key: 'to',
      label: 'По',
      width: 110,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.to
      })
    }, {
      key: 'affected',
      label: 'Затронуто записей',
      align: 'right',
      width: 150
    }, {
      key: 'status',
      label: 'Статус',
      width: 130,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        tone: r.status === 'need' ? 'attention' : 'booked',
        icon: r.status === 'need' ? 'hourglass' : 'circle-check'
      }, r.status === 'need' ? 'Нужен перенос' : 'Применена')
    }],
    rows: [{
      id: 'B-1180',
      doctor: 'Мельник О. Р.',
      kind: 'Операционный день',
      from: '12.08.2026',
      to: '13.08.2026',
      affected: '14',
      status: 'need'
    }, {
      id: 'B-1181',
      doctor: 'Литвинова С. А.',
      kind: 'Отпуск',
      from: '10.08.2026',
      to: '24.08.2026',
      affected: '61',
      status: 'need'
    }, {
      id: 'B-1176',
      doctor: 'Панов А. Г.',
      kind: 'Сокращённый день',
      from: '13.08.2026',
      to: '13.08.2026',
      affected: '4',
      status: 'ok'
    }, {
      id: 'B-1170',
      doctor: 'Ершова Н. Д.',
      kind: 'Учёба',
      from: '08.08.2026',
      to: '08.08.2026',
      affected: '0',
      status: 'ok'
    }],
    renderActions: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "pencil",
      label: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
      size: "sm"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "trash-2",
      label: "\u0421\u043D\u044F\u0442\u044C \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0443",
      size: "sm",
      variant: "danger"
    }))
  })) : null, tab === 'equipment' ? /*#__PURE__*/React.createElement(Panel, {
    title: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \xB7 \u0414\u0438\u043D\u0430\u043C\u043E",
    padded: false
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: true,
    rowKey: "id",
    columns: [{
      key: 'id',
      label: 'Код',
      width: 110,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.id
      })
    }, {
      key: 'name',
      label: 'Оборудование'
    }, {
      key: 'room',
      label: 'Кабинет',
      width: 90
    }, {
      key: 'slot',
      label: 'Шаг слота',
      width: 100
    }, {
      key: 'load',
      label: 'Загрузка недели',
      align: 'right',
      width: 150
    }, {
      key: 'status',
      label: 'Состояние',
      width: 140,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        tone: r.status === 'ok' ? 'booked' : 'danger',
        icon: r.status === 'ok' ? 'circle-check' : 'triangle-alert'
      }, r.status === 'ok' ? 'В работе' : 'Обслуживание')
    }],
    rows: [{
      id: 'EQ.MRI.01',
      name: 'МРТ Siemens 1.5T',
      room: '018',
      slot: '30 минут',
      load: '92 %',
      status: 'ok'
    }, {
      id: 'EQ.CT.02',
      name: 'КТ 64 среза',
      room: '020',
      slot: '20 минут',
      load: '78 %',
      status: 'ok'
    }, {
      id: 'EQ.US.05',
      name: 'УЗИ экспертного класса',
      room: '210',
      slot: '30 минут',
      load: '85 %',
      status: 'ok'
    }, {
      id: 'EQ.XR.03',
      name: 'Рентген цифровой',
      room: '016',
      slot: '15 минут',
      load: '41 %',
      status: 'srv'
    }],
    renderActions: () => /*#__PURE__*/React.createElement(IconButton, {
      icon: "pencil",
      label: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
      size: "sm"
    })
  })) : null))), /*#__PURE__*/React.createElement(Modal, {
    open: !!edit,
    title: "\u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F",
    onClose: () => setEdit(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setEdit(null)
    }, "\u041E\u0442\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "check",
      onClick: () => {
        setEdit(null);
        setNotice({
          tone: 'attention',
          title: 'Блокировка создана',
          text: '14 записей требуют переноса. Оператор увидит их в задании смены; автоматический перенос не выполняется.'
        });
      }
    }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"))
  }, edit ? /*#__PURE__*/React.createElement(FieldGroup, {
    style: {
      maxWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-light)',
      borderRadius: 'var(--radius-dense)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14
  }), edit.doctor, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, edit.day, " \u0430\u0432\u0433\u0443\u0441\u0442\u0430 \xB7 \u0414\u0438\u043D\u0430\u043C\u043E")), /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430",
    htmlFor: "a1",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    id: "a1",
    options: ['Операционный день', 'Отпуск', 'Больничный', 'Учёба', 'Сокращённый день', 'Технический перерыв']
  })), /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0421",
    htmlFor: "a2",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "a2",
    defaultValue: "12.08.2026"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u043E",
    htmlFor: "a3",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "a3",
    defaultValue: "13.08.2026"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0412\u0440\u0435\u043C\u044F",
    htmlFor: "a4",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "a4",
    options: ['Весь день', '09:00–13:00', '13:00–18:00']
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u0434\u043B\u044F \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432",
    htmlFor: "a5"
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "a5",
    rows: 2,
    placeholder: "\u0427\u0442\u043E \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0443 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0435"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u0423\u0432\u0435\u0434\u043E\u043C\u0438\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432 \u043A\u043B\u0438\u043D\u0438\u043A\u0438",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u041F\u043E\u043C\u0435\u0442\u0438\u0442\u044C \u0437\u0430\u0442\u0440\u043E\u043D\u0443\u0442\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u043A\u0430\u043A \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430",
    defaultChecked: true
  })), /*#__PURE__*/React.createElement(InlineNotice, {
    tone: "attention",
    title: "14 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u0432 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B"
  }, "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F: \u0441\u043B\u043E\u0442 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u043E\u043C.")) : null));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-admin/AdminScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-doctor/DoctorScreens.jsx
try { (() => {
const {
  Panel,
  Button,
  IconButton,
  Tabs,
  DataTable,
  StatusBadge,
  SpecialtyTag,
  Identifier,
  Field,
  FieldGroup,
  Input,
  Textarea,
  Select,
  Checkbox,
  InlineNotice,
  Icon,
  Kbd,
  SkeletonRows
} = window.SmclinicDesignSystem_c4cdb2;
const DAY = [{
  id: 'A-2481-005',
  time: '09:00',
  patient: 'Иванова Е. П.',
  age: '42 года',
  kind: 'Повторный',
  status: 'done',
  service: 'Приём терапевта'
}, {
  id: 'A-2481-011',
  time: '09:30',
  patient: 'Петров А. А.',
  age: '31 год',
  kind: 'Первичный',
  status: 'now',
  service: 'Приём терапевта'
}, {
  id: 'A-2481-019',
  time: '10:00',
  patient: 'Николаев В. В.',
  age: '58 лет',
  kind: 'Повторный',
  status: 'wait',
  service: 'Приём терапевта'
}, {
  id: 'A-2481-024',
  time: '11:00',
  patient: 'Орлова Т. В.',
  age: '47 лет',
  kind: 'Повторный',
  status: 'vip',
  service: 'Приём терапевта'
}, {
  id: 'A-2481-021',
  time: '10:30',
  patient: 'Кузнецов Д. С.',
  age: '36 лет',
  kind: 'Повторный',
  status: 'cancelled',
  service: 'Приём терапевта'
}, {
  id: 'A-2481-033',
  time: '11:30',
  patient: 'Сидорова М. И.',
  age: '29 лет',
  kind: 'Первичный',
  status: 'wait',
  service: 'Приём терапевта'
}];
const ST = {
  done: ['neutral', 'Завершён', 'circle-check'],
  now: ['booked', 'На приёме', 'clock'],
  wait: ['neutral', 'Ожидает', 'hourglass'],
  vip: ['vip', 'VIP', 'star'],
  cancelled: ['danger', 'Отменён', 'ban']
};
function DayList({
  sel,
  onSel
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, DAY.map(a => {
    const on = sel === a.id;
    const s = ST[a.status];
    return /*#__PURE__*/React.createElement("button", {
      key: a.id,
      type: "button",
      onClick: () => onSel(a.id),
      style: {
        display: 'grid',
        gridTemplateColumns: '48px 1fr',
        gap: 8,
        alignItems: 'start',
        textAlign: 'left',
        padding: 'var(--space-2) var(--space-3)',
        border: 0,
        borderBottom: '1px solid var(--border-light)',
        borderLeft: '3px solid ' + (on ? 'var(--brand-green)' : 'transparent'),
        background: on ? 'var(--brand-green-faint)' : 'transparent',
        font: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background var(--transition-state),border var(--transition-state),opacity var(--transition-state)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)'
      }
    }, a.time), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 3,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        textDecoration: a.status === 'cancelled' ? 'line-through' : 'none'
      }
    }, a.patient), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)',
        fontSize: 11
      }
    }, a.kind, " \xB7 ", a.age), /*#__PURE__*/React.createElement(StatusBadge, {
      tone: s[0],
      icon: s[2]
    }, s[1])));
  }));
}
function Visit({
  id,
  onFinish,
  finished
}) {
  const a = DAY.find(x => x.id === id) || DAY[1];
  const [tab, setTab] = React.useState('visit');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      background: 'var(--white)',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0
    }
  }, a.patient), /*#__PURE__*/React.createElement(StatusBadge, {
    tone: ST[a.status][0],
    icon: ST[a.status][2]
  }, ST[a.status][1]), /*#__PURE__*/React.createElement(SpecialtyTag, {
    specialty: "surgery"
  }, "\u0422\u0435\u0440\u0430\u043F\u0438\u044F")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", null, a.age), /*#__PURE__*/React.createElement(Identifier, {
    prefix: "\u0417\u0430\u043F\u0438\u0441\u044C",
    value: a.id
  }), /*#__PURE__*/React.createElement(Identifier, {
    prefix: "UID",
    value: "7719 4402"
  }), /*#__PURE__*/React.createElement("span", null, a.time, " \xB7 ", a.kind.toLowerCase(), " \u043F\u0440\u0438\u0451\u043C"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "file-text"
  }, "\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer"
  }, "\u041F\u0435\u0447\u0430\u0442\u044C"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "check",
    onClick: onFinish
  }, "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043F\u0440\u0438\u0451\u043C"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-4)',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      id: 'visit',
      label: 'Приём',
      icon: 'stethoscope'
    }, {
      id: 'history',
      label: 'История',
      icon: 'list',
      count: 12
    }, {
      id: 'docs',
      label: 'Документы',
      icon: 'file-text',
      count: 4
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-4)'
    }
  }, finished ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(InlineNotice, {
    tone: "success",
    title: "\u041F\u0440\u0438\u0451\u043C \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D"
  }, "\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D, \u0437\u0430\u043F\u0438\u0441\u044C \u0437\u0430\u043A\u0440\u044B\u0442\u0430. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u0430\u0446\u0438\u0435\u043D\u0442 \u2014 \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432 \u0412. \u0412., 10:00.")) : null, tab === 'visit' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,640px) 300px',
      gap: 'var(--space-4)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(FieldGroup, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0416\u0430\u043B\u043E\u0431\u044B",
    htmlFor: "v1",
    required: true
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "v1",
    rows: 3,
    defaultValue: "\u0413\u043E\u043B\u043E\u0432\u043D\u0430\u044F \u0431\u043E\u043B\u044C \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u0435\u043B\u0438, \u0443\u0441\u0438\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043A \u0432\u0435\u0447\u0435\u0440\u0443. \u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 37,2."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0410\u043D\u0430\u043C\u043D\u0435\u0437",
    htmlFor: "v2"
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "v2",
    rows: 2,
    placeholder: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u044F, \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438, \u043F\u0440\u0438\u0451\u043C \u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442\u043E\u0432"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0414\u0438\u0430\u0433\u043D\u043E\u0437 \u043F\u043E \u041C\u041A\u0411-10",
    htmlFor: "v3",
    required: true,
    hint: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0434 \u0438\u043B\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u2014 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u0438\u0449\u0435\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "v3",
    defaultValue: "G44.2 \u0413\u043E\u043B\u043E\u0432\u043D\u0430\u044F \u0431\u043E\u043B\u044C \u043D\u0430\u043F\u0440\u044F\u0436\u0451\u043D\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0430"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F",
    htmlFor: "v4"
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "v4",
    rows: 3,
    placeholder: "\u041F\u0440\u0435\u043F\u0430\u0440\u0430\u0442\u044B, \u0440\u0435\u0436\u0438\u043C, \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u044F\u0432\u043A\u0430"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u043F\u0440\u0438\u0451\u043C \u0447\u0435\u0440\u0435\u0437 14 \u0434\u043D\u0435\u0439",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u0412\u044B\u0434\u0430\u043D \u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u044B\u0439 \u043B\u0438\u0441\u0442"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "\u0418\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontSize: 13
    }
  }, [['Общий анализ крови', '12.08', 'готов'], ['МРТ головного мозга', '13.08', 'готов'], ['Биохимия', '14.08', 'в работе']].map(([n, d, s]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 11
    }
  }, d), /*#__PURE__*/React.createElement(StatusBadge, {
    tone: s === 'готов' ? 'booked' : 'attention',
    icon: s === 'готов' ? 'circle-check' : 'hourglass'
  }, s))))), /*#__PURE__*/React.createElement(Panel, {
    title: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Kbd, null, "Ctrl"), /*#__PURE__*/React.createElement(Kbd, null, "Enter"), " \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Kbd, null, "/"), " \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0443 \u041C\u041A\u0411"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Kbd, null, "Esc"), " \u0437\u0430\u043A\u0440\u044B\u0442\u044C, \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F"))))) : null, tab === 'history' ? /*#__PURE__*/React.createElement(Panel, {
    title: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0440\u0438\u0451\u043C\u043E\u0432",
    padded: false
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: true,
    rowKey: "id",
    columns: [{
      key: 'date',
      label: 'Дата',
      width: 96,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.date
      })
    }, {
      key: 'doctor',
      label: 'Врач',
      width: 170
    }, {
      key: 'dx',
      label: 'Диагноз'
    }, {
      key: 'clinic',
      label: 'Клиника',
      width: 120
    }],
    rows: [{
      id: 1,
      date: '02.08.2026',
      doctor: 'Ковалёва И. С.',
      dx: 'J06.9 ОРВИ',
      clinic: 'Динамо'
    }, {
      id: 2,
      date: '19.05.2026',
      doctor: 'Мельник О. Р.',
      dx: 'M54.5 Боль в пояснице',
      clinic: 'Курская'
    }, {
      id: 3,
      date: '11.02.2026',
      doctor: 'Ковалёва И. С.',
      dx: 'I10 Гипертензия',
      clinic: 'Динамо'
    }]
  })) : null, tab === 'docs' ? /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement(SkeletonRows, {
    rows: 4,
    height: 40,
    caption: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430"
  })) : null));
}
function DoctorApp() {
  const [sel, setSel] = React.useState('A-2481-011');
  const [nav, setNav] = React.useState('day');
  const [finished, setFinished] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--n-100)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(WorkstationTop, {
    role: "\u0410\u0420\u041C \u0432\u0440\u0430\u0447\u0430",
    user: "\u041A\u043E\u0432\u0430\u043B\u0451\u0432\u0430 \u0418. \u0421.",
    initials: "\u041A\u0418",
    searchPlaceholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442 \u0438\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043F\u0438\u0441\u0438"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      paddingBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(WorkstationNav, {
    value: nav,
    onChange: setNav,
    items: [{
      id: 'day',
      label: 'Мой день',
      icon: 'calendar-days',
      count: 6
    }, {
      id: 'patients',
      label: 'Мои пациенты',
      icon: 'users'
    }, {
      id: 'lab',
      label: 'Результаты',
      icon: 'file-text',
      count: 3
    }, {
      id: 'schedule',
      label: 'Моё расписание',
      icon: 'clock'
    }],
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 12px',
        fontSize: 11,
        color: 'var(--text-secondary)'
      }
    }, "\u041F\u0440\u0438\u0451\u043C\u044B 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430"), /*#__PURE__*/React.createElement(DayList, {
      sel: sel,
      onSel: id => {
        setSel(id);
        setFinished(false);
      }
    }))
  }), /*#__PURE__*/React.createElement("main", {
    className: "sm-surface",
    style: {
      flex: 1,
      minWidth: 0,
      marginRight: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Visit, {
    id: sel,
    finished: finished,
    onFinish: () => setFinished(true)
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(DoctorApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-doctor/DoctorScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/App.jsx
try { (() => {
const {
  CommandPalette,
  Modal,
  Button,
  InlineNotice
} = window.SmclinicDesignSystem_c4cdb2;
const PALETTE_GROUPS = [{
  title: 'Врачи',
  items: [{
    id: 'd1',
    label: 'Ковалёва Ирина Сергеевна',
    icon: 'stethoscope',
    meta: 'Терапевт · Динамо'
  }, {
    id: 'd2',
    label: 'Мельник Олег Романович',
    icon: 'stethoscope',
    meta: 'Хирург · Динамо'
  }]
}, {
  title: 'Услуги',
  items: [{
    id: 's1',
    label: 'УЗИ брюшной полости',
    icon: 'monitor',
    meta: '2 400 ₽ · 30 мин'
  }, {
    id: 's2',
    label: 'Приём терапевта, первичный',
    icon: 'file-text',
    meta: '3 600 ₽ · 30 мин'
  }]
}, {
  title: 'Клиники',
  items: [{
    id: 'c1',
    label: 'Динамо',
    icon: 'building-2',
    meta: 'Ленинградский пр-т'
  }, {
    id: 'c2',
    label: 'Курская',
    icon: 'building-2',
    meta: 'ул. Земляной Вал'
  }]
}];
function App() {
  const D = window.OP_DATA;
  const [screen, setScreen] = React.useState('grid');
  const [clinic, setClinic] = React.useState('Динамо');
  const [columns, setColumns] = React.useState(D.columns);
  const [selected, setSelected] = React.useState('d1:09:15');
  const [booking, setBooking] = React.useState(false);
  const [notice, setNotice] = React.useState(null);
  const [palette, setPalette] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [dense, setDense] = React.useState(true);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  React.useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
  const sel = React.useMemo(() => {
    if (!selected) return null;
    const i = selected.indexOf(':');
    const column = columns.find(c => c.id === selected.slice(0, i));
    if (!column) return null;
    const time = selected.slice(i + 1);
    return {
      column: column,
      time: time,
      slot: column.slots[D.times.indexOf(time)] || {
        state: 'free'
      }
    };
  }, [selected, columns]);
  function confirmBooking(form) {
    const i = selected.indexOf(':');
    const cid = selected.slice(0, i);
    const time = selected.slice(i + 1);
    const row = D.times.indexOf(time);
    setColumns(cols => cols.map(c => {
      if (c.id !== cid) return c;
      const slots = c.slots.slice();
      slots[row] = {
        state: form.kind === 'first' ? 'first' : 'booked',
        patient: form.patient.split(' ').slice(0, 1).join(' ') + ' ' + form.patient.split(' ').slice(1).map(w => w[0] + '.').join(' ')
      };
      return Object.assign({}, c, {
        slots: slots
      });
    }));
    setBooking(false);
    setNotice({
      tone: 'success',
      title: 'Запись создана',
      text: form.patient + ' · 14 августа, ' + time + ' · ' + sel.column.doctor + ' · ' + clinic
    });
  }
  function cancelBooking() {
    const i = selected.indexOf(':');
    const cid = selected.slice(0, i);
    const row = D.times.indexOf(selected.slice(i + 1));
    setColumns(cols => cols.map(c => {
      if (c.id !== cid) return c;
      const slots = c.slots.slice();
      slots[row] = Object.assign({}, slots[row], {
        state: 'cancelled'
      });
      return Object.assign({}, c, {
        slots: slots
      });
    }));
    setConfirmCancel(false);
    setNotice({
      tone: 'attention',
      title: 'Запись отменена',
      text: 'Слот освободится после подтверждения сервера. Пациенту отправлено SMS.'
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--n-100)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    clinic: clinic,
    onClinic: setClinic,
    onPalette: () => setPalette(true)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      paddingBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(SideBar, {
    screen: screen,
    onScreen: setScreen
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      paddingRight: 'var(--space-3)'
    }
  }, screen === 'grid' ? /*#__PURE__*/React.createElement(ScheduleScreen, {
    columns: columns,
    notice: notice,
    onDismissNotice: () => setNotice(null),
    selected: selected,
    onSelect: setSelected,
    dense: dense,
    onDense: setDense,
    onBook: () => setBooking(true),
    onCancel: () => setConfirmCancel(true)
  }) : null, screen === 'wait' ? /*#__PURE__*/React.createElement("div", {
    className: "sm-surface",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(WaitlistScreen, {
    dense: dense,
    onOffer: () => {
      setScreen('grid');
      setSelected('d1:12:00');
    }
  })) : null, screen === 'bookings' ? /*#__PURE__*/React.createElement("div", {
    className: "sm-surface",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(BookingsScreen, {
    dense: dense
  })) : null, screen === 'patients' || screen === 'shift' ? /*#__PURE__*/React.createElement("div", {
    className: "sm-surface",
    style: {
      flex: 1,
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement(InlineNotice, {
    tone: "info",
    title: "\u042D\u043A\u0440\u0430\u043D \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B"
  }, "\u0420\u0430\u0437\u0434\u0435\u043B \xAB", screen === 'patients' ? 'Пациенты' : 'Задания смены', "\xBB \u043E\u043F\u0438\u0441\u0430\u043D \u0432 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u043A \u043F\u0443\u043D\u043A\u0442 \u0444\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u0439. \u041C\u0430\u043A\u0435\u0442 \u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D \u043F\u0443\u0441\u0442\u044B\u043C \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E: \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u0435\u0433\u043E \u043F\u043E \u0434\u043E\u0433\u0430\u0434\u043A\u0435 \u2014 \u0437\u043D\u0430\u0447\u0438\u0442 \u0432\u044B\u0434\u0430\u0442\u044C \u0432\u044B\u043C\u044B\u0441\u0435\u043B \u0437\u0430 \u0434\u0438\u0437\u0430\u0439\u043D-\u0441\u0438\u0441\u0442\u0435\u043C\u0443."))) : null)), /*#__PURE__*/React.createElement(BookingModal, {
    open: booking,
    sel: sel,
    onClose: () => setBooking(false),
    onConfirm: confirmBooking
  }), /*#__PURE__*/React.createElement(Modal, {
    open: confirmCancel,
    title: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C?",
    onClose: () => setConfirmCancel(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setConfirmCancel(false)
    }, "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      icon: "ban",
      onClick: cancelBooking
    }, "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, sel && sel.slot.patient ? sel.slot.patient : 'Пациент', " \xB7 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430, ", sel ? sel.time : '', " \xB7 ", sel ? sel.column.doctor : '', ". \u041F\u0430\u0446\u0438\u0435\u043D\u0442 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 SMS \u043E\u0431 \u043E\u0442\u043C\u0435\u043D\u0435. \u0421\u043B\u043E\u0442 \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430.")), /*#__PURE__*/React.createElement(CommandPalette, {
    open: palette,
    query: query,
    onQueryChange: setQuery,
    groups: PALETTE_GROUPS,
    onClose: () => setPalette(false),
    onSelect: () => setPalette(false)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/BookingModal.jsx
try { (() => {
const {
  Modal,
  Button,
  Field,
  FieldGroup,
  FieldRow,
  Input,
  Select,
  Checkbox,
  RadioGroup,
  SearchInput,
  InlineNotice,
  Identifier,
  Kbd,
  SpecialtyTag
} = window.SmclinicDesignSystem_c4cdb2;
function BookingModal({
  open,
  sel,
  onClose,
  onConfirm
}) {
  const D = window.OP_DATA;
  const [kind, setKind] = React.useState('first');
  const [service, setService] = React.useState(D.services[0]);
  const [patient, setPatient] = React.useState('Сидорова Мария Ивановна');
  const [phoneErr, setPhoneErr] = React.useState('');
  if (!open || !sel) return null;
  const {
    column,
    time
  } = sel;
  return /*#__PURE__*/React.createElement(Modal, {
    open: true,
    title: "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u043F\u0440\u0438\u0451\u043C",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        marginRight: 'auto',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C ", /*#__PURE__*/React.createElement(Kbd, null, "Ctrl"), /*#__PURE__*/React.createElement(Kbd, null, "Enter"), " \xB7 \u0437\u0430\u043A\u0440\u044B\u0442\u044C ", /*#__PURE__*/React.createElement(Kbd, null, "Esc")), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "\u041E\u0442\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "check",
      onClick: () => onConfirm({
        patient: patient,
        kind: kind,
        service: service
      })
    }, "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-light)',
      borderRadius: 'var(--radius-dense)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Identifier, {
    value: time,
    strong: true
  }), /*#__PURE__*/React.createElement("span", null, column.doctor), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, column.spec), /*#__PURE__*/React.createElement(SpecialtyTag, {
    specialty: column.specialty
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'var(--text-secondary)'
    }
  }, "14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430 \xB7 \u0414\u0438\u043D\u0430\u043C\u043E")), /*#__PURE__*/React.createElement(FieldGroup, {
    style: {
      maxWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442",
    htmlFor: "bm-p",
    required: true,
    hint: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F, \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u043F\u043E\u043B\u0438\u0441\u0430. \u041F\u043E\u0438\u0441\u043A \u0438\u0434\u0451\u0442 \u043F\u043E \u0432\u0441\u0435\u043C 46 \u043A\u043B\u0438\u043D\u0438\u043A\u0430\u043C."
  }, /*#__PURE__*/React.createElement(SearchInput, {
    id: "bm-p",
    value: patient,
    onChange: e => setPatient(e.target.value),
    shortcut: "/"
  })), /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
    htmlFor: "bm-ph",
    required: true,
    error: phoneErr,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "bm-ph",
    defaultValue: "+7 916 220-14-08",
    invalid: !!phoneErr,
    onBlur: e => setPhoneErr(e.target.value.replace(/\D/g, '').length < 11 ? 'Номер из 10 цифр после +7' : '')
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0422\u0438\u043F \u043F\u0440\u0438\u0451\u043C\u0430",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'var(--input-h)',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(RadioGroup, {
    name: "bm-kind",
    value: kind,
    onChange: e => setKind(e.target.value),
    inline: true,
    options: [{
      value: 'first',
      label: 'Первичный'
    }, {
      value: 'repeat',
      label: 'Повторный'
    }]
  })))), /*#__PURE__*/React.createElement(Field, {
    label: "\u0423\u0441\u043B\u0443\u0433\u0430",
    htmlFor: "bm-s",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    id: "bm-s",
    value: service,
    onChange: e => setService(e.target.value),
    options: D.services
  })), /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
    htmlFor: "bm-d",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "bm-d",
    options: ['15 минут', '30 минут', '45 минут', '60 минут'],
    defaultValue: "30 \u043C\u0438\u043D\u0443\u0442"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u041A\u0430\u043D\u0430\u043B \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F",
    htmlFor: "bm-c",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "bm-c",
    options: ['Телефон', 'Сайт', 'Личный визит', 'Партнёр'],
    defaultValue: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C SMS-\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0443",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u0421\u043D\u044F\u0442\u044C \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430 \u0438\u0437 \u043B\u0438\u0441\u0442\u0430 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F",
    defaultChecked: true
  })), /*#__PURE__*/React.createElement(InlineNotice, {
    tone: "info"
  }, "\u0421\u043B\u043E\u0442 \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430, \u043E\u043D \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u043C \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432."))));
}
Object.assign(window, {
  BookingModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/BookingModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/BookingsScreen.jsx
try { (() => {
const {
  DataTable,
  Panel,
  Button,
  IconButton,
  StatusBadge,
  Identifier,
  Toolbar,
  ToolbarSpacer,
  ToolbarSeparator,
  FilterChip,
  SearchInput
} = window.SmclinicDesignSystem_c4cdb2;
const STATUS = {
  booked: ['booked', 'Записан'],
  cancelled: ['danger', 'Отменена'],
  vip: ['vip', 'VIP']
};
function BookingsScreen({
  dense
}) {
  const D = window.OP_DATA;
  const [sel, setSel] = React.useState('A-2481-011');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Toolbar, null, /*#__PURE__*/React.createElement(FilterChip, {
    active: true,
    count: 128
  }, "\u0421\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 6
  }, "\u041E\u0442\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0435"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 12
  }, "\u041F\u0435\u0440\u0432\u0438\u0447\u043D\u044B\u0435"), /*#__PURE__*/React.createElement(ToolbarSeparator, null), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 260
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442, \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043F\u0438\u0441\u0438, \u0432\u0440\u0430\u0447"
  })), /*#__PURE__*/React.createElement(ToolbarSpacer, null), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer"
  }, "\u041F\u0435\u0447\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0430")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "\u0417\u0430\u043F\u0438\u0441\u0438 \u0441\u043C\u0435\u043D\u044B \xB7 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430",
    padded: false
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: dense,
    rowKey: "id",
    selectedId: sel,
    onRowClick: r => setSel(r.id),
    columns: [{
      key: 'time',
      label: 'Время',
      width: 64,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.time,
        strong: true
      })
    }, {
      key: 'id',
      label: 'Запись',
      width: 104,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.id
      })
    }, {
      key: 'patient',
      label: 'Пациент',
      width: 170
    }, {
      key: 'doctor',
      label: 'Врач',
      width: 150
    }, {
      key: 'service',
      label: 'Услуга'
    }, {
      key: 'clinic',
      label: 'Клиника',
      width: 110
    }, {
      key: 'status',
      label: 'Статус',
      width: 120,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        tone: STATUS[r.status][0]
      }, STATUS[r.status][1])
    }, {
      key: 'sum',
      label: 'Сумма, ₽',
      align: 'right',
      width: 90
    }],
    rows: D.bookings,
    renderActions: r => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "pencil",
      label: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
      size: "sm"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "printer",
      label: "\u041F\u0435\u0447\u0430\u0442\u044C \u0442\u0430\u043B\u043E\u043D\u0430",
      size: "sm"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "ban",
      label: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
      size: "sm",
      variant: "danger"
    }))
  }))));
}
Object.assign(window, {
  BookingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/BookingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/OperatorShell.jsx
try { (() => {
const {
  Icon,
  IconButton,
  SearchInput,
  Kbd,
  SpecialtyTag,
  Identifier
} = window.SmclinicDesignSystem_c4cdb2;
const NAV = [{
  id: 'grid',
  label: 'Расписание',
  icon: 'layout-grid'
}, {
  id: 'wait',
  label: 'Лист ожидания',
  icon: 'hourglass',
  count: 5
}, {
  id: 'bookings',
  label: 'Записи смены',
  icon: 'list',
  count: 128
}, {
  id: 'patients',
  label: 'Пациенты',
  icon: 'users'
}, {
  id: 'shift',
  label: 'Задания смены',
  icon: 'file-text'
}];
function TopBar({
  clinic,
  onClinic,
  onPalette
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-h)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'calc(var(--sidebar-w) - var(--space-4))',
      flex: 'none',
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: '-0.022em',
      color: 'var(--brand-green-700)',
      whiteSpace: 'nowrap'
    }
  }, "\u0421\u041C-\u041A\u043B\u0438\u043D\u0438\u043A\u0430"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)',
      whiteSpace: 'nowrap'
    }
  }, "\u0410\u0420\u041C \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430")), /*#__PURE__*/React.createElement("label", {
    className: "sm-chip",
    style: {
      gap: 6,
      paddingLeft: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "building-2",
    size: 14
  }), /*#__PURE__*/React.createElement("select", {
    value: clinic,
    onChange: e => onClinic(e.target.value),
    style: {
      appearance: 'none',
      border: 0,
      background: 'transparent',
      font: 'inherit',
      color: 'var(--text-body)',
      cursor: 'pointer'
    }
  }, window.OP_DATA.clinics.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "sm-search--pill",
    style: {
      flex: 1,
      maxWidth: 460,
      marginInline: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442, \u0432\u0440\u0430\u0447, \u0443\u0441\u043B\u0443\u0433\u0430 \u2014 \u0438\u043B\u0438 \u2318K \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430",
    shortcut: "/"
  })), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "settings",
    label: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sm-chip",
    style: {
      gap: 8,
      paddingLeft: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: 'var(--brand-green-tint)',
      color: 'var(--brand-green-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 500
    }
  }, "\u041A\u0410"), "\u041A\u0443\u0437\u044C\u043C\u0438\u043D\u0430 \u0410. \u0412."));
}
function SideBar({
  screen,
  onScreen
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "data-chrome": true,
    style: {
      width: 'var(--sidebar-w)',
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      padding: '0 var(--space-3) var(--space-3) var(--space-4)',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    type: "button",
    className: "sm-navitem",
    "aria-current": screen === n.id ? 'page' : undefined,
    onClick: () => onScreen(n.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 15
  }), n.label, n.count !== undefined ? /*#__PURE__*/React.createElement("span", {
    className: "sm-navitem__count"
  }, n.count) : null))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--elev-1)',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u0421\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(Identifier, {
    value: "2481",
    strong: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u0437\u0430 \u0441\u043C\u0435\u043D\u0443"), /*#__PURE__*/React.createElement(Identifier, {
    value: "128",
    strong: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u0421\u0440\u0435\u0434\u043D\u0435\u0435 \u0432\u0440\u0435\u043C\u044F \u0437\u0430\u043F\u0438\u0441\u0438"), /*#__PURE__*/React.createElement(Identifier, {
    value: "00:47",
    strong: true
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '0 var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "keyboard",
    size: 14
  }), " \u0413\u043E\u0440\u044F\u0447\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438 ", /*#__PURE__*/React.createElement(Kbd, null, "?")));
}
Object.assign(window, {
  TopBar,
  SideBar,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/OperatorShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/ScheduleScreen.jsx
try { (() => {
const {
  ScheduleGrid,
  FilterChip,
  SearchInput,
  IconButton,
  Button,
  Icon,
  Identifier,
  StatusBadge,
  SpecialtyTag,
  InlineNotice,
  Kbd
} = window.SmclinicDesignSystem_c4cdb2;
const HAIR = '1px solid var(--border-subtle)';
function Row({
  term,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-meta)',
      fontSize: 12
    }
  }, term), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      fontSize: 13
    }
  }, children));
}
function SlotDetails({
  sel,
  columns,
  onSelect,
  onBook,
  onCancel
}) {
  const D = window.OP_DATA;
  if (!sel) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 'var(--space-4)',
        color: 'var(--text-meta)',
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-body)'
      }
    }, "\u0421\u043B\u043E\u0442 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D."), /*#__PURE__*/React.createElement("div", {
      style: {
        lineHeight: '20px'
      }
    }, "\u0421\u0442\u0440\u0435\u043B\u043A\u0438 \u2014 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u043F\u043E \u0441\u0435\u0442\u043A\u0435, ", /*#__PURE__*/React.createElement(Kbd, null, "Enter"), " \u2014 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C, ", /*#__PURE__*/React.createElement(Kbd, null, "Space"), " \u2014 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C."));
  }
  const {
    slot,
    column,
    time
  } = sel;
  const busy = slot.state === 'booked' || slot.state === 'first' || slot.state === 'cancelled';
  const idx = D.times.indexOf(time);
  const nearby = D.times.map((t, i) => ({
    t: t,
    i: i,
    s: column.slots[i] || {
      state: 'free'
    }
  })).filter(x => x.s.state === 'free' && x.i !== idx).sort((a, b) => Math.abs(a.i - idx) - Math.abs(b.i - idx)).slice(0, 5).sort((a, b) => a.i - b.i);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      borderBottom: HAIR
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26,
      lineHeight: '30px',
      fontWeight: 600,
      letterSpacing: '-0.028em',
      fontVariantNumeric: 'tabular-nums'
    }
  }, time), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, "14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), slot.state === 'free' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "neutral"
  }, "\u0421\u0432\u043E\u0431\u043E\u0434\u0435\u043D") : null, slot.state === 'booked' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "booked"
  }, "\u0417\u0430\u043F\u0438\u0441\u0430\u043D") : null, slot.state === 'first' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "booked"
  }, "\u041F\u0435\u0440\u0432\u0438\u0447\u043D\u044B\u0439") : null, slot.state === 'waitlist' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "attention"
  }, "\u041B\u0438\u0441\u0442 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F") : null, slot.state === 'cancelled' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "danger"
  }, "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430") : null, slot.state === 'blocked' || slot.state === 'break' || slot.state === 'absent' ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "neutral",
    icon: "ban"
  }, "\u041D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D") : null, slot.vip ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "vip"
  }, "VIP") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, column.doctor), /*#__PURE__*/React.createElement(SpecialtyTag, {
    specialty: column.specialty
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, column.spec)), busy || slot.patient ? /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      padding: '14px var(--space-4)',
      display: 'grid',
      gridTemplateColumns: '92px 1fr',
      rowGap: 9,
      columnGap: 10,
      alignItems: 'baseline',
      borderBottom: HAIR
    }
  }, /*#__PURE__*/React.createElement(Row, {
    term: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442"
  }, slot.patient), /*#__PURE__*/React.createElement(Row, {
    term: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D"
  }, /*#__PURE__*/React.createElement(Identifier, {
    value: "+7 916 220-14-08",
    strong: true
  })), /*#__PURE__*/React.createElement(Row, {
    term: "\u0417\u0430\u043F\u0438\u0441\u044C"
  }, /*#__PURE__*/React.createElement(Identifier, {
    value: "A-2481-005",
    strong: true
  })), /*#__PURE__*/React.createElement(Row, {
    term: "\u0423\u0441\u043B\u0443\u0433\u0430"
  }, "\u041F\u0440\u0438\u0451\u043C \u0442\u0435\u0440\u0430\u043F\u0435\u0432\u0442\u0430, ", slot.state === 'first' ? 'первичный' : 'повторный'), /*#__PURE__*/React.createElement(Row, {
    term: "\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440"
  }, "\u041A\u0443\u0437\u044C\u043C\u0438\u043D\u0430 \u0410. \u0412.")) : null, slot.note ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px var(--space-4)',
      fontSize: 13,
      color: 'var(--text-meta)',
      borderBottom: HAIR
    }
  }, slot.note) : null, slot.state === 'free' && nearby.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, "\u0415\u0449\u0451 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E \u0443 \u044D\u0442\u043E\u0433\u043E \u0432\u0440\u0430\u0447\u0430"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, nearby.map(x => /*#__PURE__*/React.createElement("button", {
    key: x.t,
    type: "button",
    className: "sm-chip",
    onClick: () => onSelect(column.id + ':' + x.t)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, x.t))))) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      padding: 'var(--space-3) var(--space-4)',
      borderTop: HAIR,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, slot.state === 'free' ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    className: "sm-btn--lg",
    icon: "plus",
    block: true,
    onClick: onBook
  }, "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C") : null, slot.state === 'waitlist' ? /*#__PURE__*/React.createElement(Button, {
    variant: "attention",
    className: "sm-btn--lg",
    icon: "check",
    block: true,
    onClick: onBook
  }, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0438\u0437 \u043B\u0438\u0441\u0442\u0430 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F") : null, busy && slot.state !== 'cancelled' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "refresh-cw",
    block: true
  }, "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "phone",
    block: true
  }, "\u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer",
    block: true
  }, "\u041F\u0435\u0447\u0430\u0442\u044C \u0442\u0430\u043B\u043E\u043D\u0430"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "danger",
    icon: "ban",
    block: true,
    onClick: onCancel
  }, "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C"))) : null));
}
function ScheduleScreen({
  columns,
  notice,
  onDismissNotice,
  selected,
  onSelect,
  onBook,
  onCancel,
  dense,
  onDense
}) {
  const D = window.OP_DATA;
  const [range, setRange] = React.useState('today');
  const sel = React.useMemo(() => {
    if (!selected) return null;
    const i = selected.indexOf(':');
    const column = columns.find(c => c.id === selected.slice(0, i));
    if (!column) return null;
    const time = selected.slice(i + 1);
    return {
      column: column,
      time: time,
      slot: column.slots[D.times.indexOf(time)] || {
        state: 'free'
      }
    };
  }, [selected, columns]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      gap: 'var(--space-3)',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "sm-surface",
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      rowGap: 'var(--space-2)',
      minHeight: 52,
      padding: 'var(--space-2) var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-seg",
    style: {
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sm-seg__item",
    "aria-label": "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0434\u0435\u043D\u044C"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 15
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sm-seg__item",
    "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0434\u0435\u043D\u044C"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 15
  }))), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 18,
      lineHeight: '24px',
      letterSpacing: '-0.022em',
      whiteSpace: 'nowrap',
      flex: '0 0 auto'
    }
  }, "\u041F\u044F\u0442\u043D\u0438\u0446\u0430, 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)',
      whiteSpace: 'nowrap',
      flex: '0 1 auto',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "31 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439 \u0441\u043B\u043E\u0442 \xB7 6 \u0432\u0440\u0430\u0447\u0435\u0439"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '1 0 8px',
      minWidth: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-seg"
  }, [['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['week', 'Неделя']].map(([id, l]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    type: "button",
    className: "sm-seg__item",
    "aria-selected": range === id,
    onClick: () => setRange(id)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "rows-3",
    label: "\u041F\u043B\u043E\u0442\u043D\u044B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438",
    pressed: dense,
    onClick: () => onDense(!dense)
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "refresh-cw",
    label: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "printer",
    label: "\u041F\u0435\u0447\u0430\u0442\u044C \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 'var(--space-2)',
      rowGap: 'var(--space-2)',
      minHeight: 44,
      padding: 'var(--space-2) var(--space-4)',
      borderTop: HAIR,
      borderBottom: HAIR
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u0412\u0440\u0430\u0447, \u0443\u0441\u043B\u0443\u0433\u0430, \u043A\u0430\u0431\u0438\u043D\u0435\u0442"
  })), /*#__PURE__*/React.createElement(FilterChip, {
    icon: "circle-check",
    count: 31
  }, "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0435"), /*#__PURE__*/React.createElement(FilterChip, {
    icon: "layout-grid"
  }, "\u0412\u0441\u0435 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F"), /*#__PURE__*/React.createElement(FilterChip, {
    icon: "star"
  }, "VIP"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 8
    }
  }), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "funnel"
  }, "\u0424\u0438\u043B\u044C\u0442\u0440\u044B")), notice ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      padding: 'var(--space-3) var(--space-4) 0'
    }
  }, /*#__PURE__*/React.createElement(InlineNotice, {
    tone: notice.tone,
    title: notice.title,
    actions: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "secondary",
      onClick: onDismissNotice
    }, "\u0421\u043A\u0440\u044B\u0442\u044C")
  }, notice.text)) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '0 var(--space-4) var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(ScheduleGrid, {
    times: D.times,
    columns: columns,
    selected: selected,
    now: "11:20",
    onSlotClick: id => onSelect(id)
  }))), /*#__PURE__*/React.createElement("aside", {
    className: "sm-surface",
    style: {
      width: 316,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(SlotDetails, {
    sel: sel,
    columns: columns,
    onSelect: onSelect,
    onBook: onBook,
    onCancel: onCancel
  })));
}
Object.assign(window, {
  ScheduleScreen,
  SlotDetails
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/ScheduleScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/WaitlistScreen.jsx
try { (() => {
const {
  DataTable,
  Panel,
  Button,
  IconButton,
  StatusBadge,
  Identifier,
  Tabs,
  Toolbar,
  ToolbarSpacer,
  FilterChip,
  SearchInput,
  SkeletonRows
} = window.SmclinicDesignSystem_c4cdb2;
function WaitlistScreen({
  onOffer,
  dense
}) {
  const D = window.OP_DATA;
  const [sel, setSel] = React.useState('W-4471');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Toolbar, null, /*#__PURE__*/React.createElement(FilterChip, {
    active: true,
    count: 5
  }, "\u0412\u0441\u0435"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 2
  }, "\u0416\u0434\u0443\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 2 \u0434\u043D\u0435\u0439"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 1
  }, "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 220,
      marginLeft: 8
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442 \u0438\u043B\u0438 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"
  })), /*#__PURE__*/React.createElement(ToolbarSpacer, null), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer"
  }, "\u0412\u044B\u0433\u0440\u0443\u0437\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-4)',
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: 'var(--space-4)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "\u041B\u0438\u0441\u0442 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \xB7 \u0414\u0438\u043D\u0430\u043C\u043E",
    padded: false,
    actions: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "ghost",
      iconEnd: "arrow-right"
    }, "\u0412\u0441\u0435 \u043A\u043B\u0438\u043D\u0438\u043A\u0438")
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: dense,
    rowKey: "id",
    selectedId: sel,
    onRowClick: r => setSel(r.id),
    columns: [{
      key: 'id',
      label: 'Заявка',
      width: 88,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.id
      })
    }, {
      key: 'patient',
      label: 'Пациент'
    }, {
      key: 'phone',
      label: 'Телефон',
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.phone
      })
    }, {
      key: 'spec',
      label: 'Направление',
      width: 120
    }, {
      key: 'want',
      label: 'Желаемое время',
      width: 150
    }, {
      key: 'added',
      label: 'В ожидании',
      width: 96,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        tone: r.priority,
        icon: r.priority === 'attention' ? 'hourglass' : null
      }, r.added)
    }],
    rows: D.waitlist,
    renderActions: r => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "phone",
      label: "\u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C",
      size: "sm"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "calendar-days",
      label: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0441\u043B\u043E\u0442",
      size: "sm",
      onClick: onOffer
    }))
  })), /*#__PURE__*/React.createElement(Panel, {
    title: "\u041F\u043E\u0434\u0431\u043E\u0440 \u0441\u043B\u043E\u0442\u0430"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "\u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0430 \u041C. \u0418. \xB7 \u0422\u0435\u0440\u0430\u043F\u0435\u0432\u0442 \xB7 14.08 \u0434\u043E 12:00"), /*#__PURE__*/React.createElement(SkeletonRows, {
    rows: 2,
    height: 32,
    caption: "\u0418\u0449\u0435\u043C \u0441\u043B\u043E\u0442\u044B \u0432 6 \u043A\u043B\u0438\u043D\u0438\u043A\u0430\u0445"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, [['09:45', 'Ковалёва И. С.', 'Динамо'], ['11:15', 'Ковалёва И. С.', 'Динамо'], ['10:00', 'Гурьев П. Л.', 'Курская']].map(([t, d, c]) => /*#__PURE__*/React.createElement("button", {
    key: t + d,
    type: "button",
    className: "sm-chip",
    style: {
      height: 40,
      justifyContent: 'flex-start',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, t), /*#__PURE__*/React.createElement("span", null, d), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'var(--text-secondary)',
      fontSize: 11
    }
  }, c)))), /*#__PURE__*/React.createElement(Button, {
    variant: "attention",
    icon: "check",
    block: true,
    onClick: onOffer
  }, "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C 09:45")))));
}
Object.assign(window, {
  WaitlistScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/WaitlistScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/arm-operator/data.js
try { (() => {
/* Демонстрационные данные АРМ оператора. Фамилии и номера вымышлены. */
window.OP_DATA = function () {
  const times = [];
  for (let h = 9; h < 14; h++) for (const m of [0, 15, 30, 45]) times.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
  const mk = (state, patient, extra) => Object.assign({
    state: state,
    patient: patient
  }, extra || {});
  const free = {
    state: 'free'
  };
  const columns = [{
    id: 'd1',
    doctor: 'Ковалёва И. С.',
    spec: 'Терапевт · каб. 204',
    specialty: 'surgery',
    slots: [mk('booked', 'Иванова Е. П.', {
      meta: '30'
    }), free, mk('first', 'Петров А. А.'), free, mk('booked', 'Николаев В. В.'), free, free, mk('break', null, {
      note: 'Тех. перерыв'
    }), mk('booked', 'Орлова Т. В.', {
      vip: true
    }), free, mk('cancelled', 'Кузнецов Д. С.'), free, mk('waitlist', 'Сидорова М. И.'), free, free, free, free, free, free, free]
  }, {
    id: 'd2',
    doctor: 'Мельник О. Р.',
    spec: 'Хирург · каб. 118',
    specialty: 'surgery',
    slots: [free, mk('booked', 'Гаврилов П. Н.'), free, mk('first', 'Белова А. К.'), free, free, mk('blocked', null, {
      note: 'Операционный день'
    }), mk('blocked', null, {
      note: ''
    }), mk('blocked', null, {
      note: ''
    }), free, free, mk('booked', 'Титов С. Ю.'), free, free, mk('waitlist', 'Романова Л. А.'), free, free, free, free, free]
  }, {
    id: 'd3',
    doctor: 'Ершова Н. Д.',
    spec: 'Стоматолог · каб. 302',
    specialty: 'dental',
    slots: [mk('first', 'Зайцева О. М.'), free, free, mk('booked', 'Лебедев И. И.'), free, mk('booked', 'Сорокин А. В.'), free, free, mk('booked', 'Фомина Е. С.'), free, free, free, mk('cancelled', 'Дроздов К. П.'), free, free, mk('booked', 'Юрьева Н. Н.'), free, free, free, free]
  }, {
    id: 'd4',
    doctor: 'Панов А. Г.',
    spec: 'Педиатр · каб. 105',
    specialty: 'pediatric',
    slots: [mk('booked', 'Савельев М. М.'), mk('booked', 'Савельева А. М.'), free, free, mk('first', 'Тихонов Р. О.'), free, free, mk('break', null, {
      note: 'Обед'
    }), mk('break', null, {
      note: ''
    }), free, mk('booked', 'Игнатова В. С.'), free, free, free, free, free, free, free, free, free]
  }, {
    id: 'd5',
    doctor: 'Литвинова С. А.',
    spec: 'Косметолог · каб. 410',
    specialty: 'cosmetology',
    slots: [mk('absent', null, {
      note: 'Отпуск'
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    }), mk('absent', null, {
      note: ''
    })]
  }];
  const waitlist = [{
    id: 'W-4471',
    patient: 'Сидорова М. И.',
    phone: '+7 916 220-14-08',
    spec: 'Терапевт',
    want: '14.08 до 12:00',
    added: '2 дня',
    priority: 'attention'
  }, {
    id: 'W-4472',
    patient: 'Романова Л. А.',
    phone: '+7 903 118-77-20',
    spec: 'Хирург',
    want: '14–16.08 утро',
    added: '1 день',
    priority: 'neutral'
  }, {
    id: 'W-4468',
    patient: 'Захаров Е. Д.',
    phone: '+7 925 604-31-55',
    spec: 'Стоматолог',
    want: 'любое',
    added: '5 дней',
    priority: 'attention'
  }, {
    id: 'W-4480',
    patient: 'Волкова И. Н.',
    phone: '+7 977 302-90-11',
    spec: 'Педиатр',
    want: '15.08 после 16:00',
    added: 'сегодня',
    priority: 'neutral'
  }, {
    id: 'W-4481',
    patient: 'Гусев А. Т.',
    phone: '+7 916 445-02-73',
    spec: 'Терапевт',
    want: '14.08 вечер',
    added: 'сегодня',
    priority: 'neutral'
  }];
  const bookings = [{
    id: 'A-2481-005',
    time: '09:00',
    patient: 'Иванова Е. П.',
    doctor: 'Ковалёва И. С.',
    service: 'Приём терапевта, повторный',
    clinic: 'Динамо',
    status: 'booked',
    sum: '3 200'
  }, {
    id: 'A-2481-006',
    time: '09:15',
    patient: 'Гаврилов П. Н.',
    doctor: 'Мельник О. Р.',
    service: 'Консультация хирурга',
    clinic: 'Динамо',
    status: 'booked',
    sum: '2 900'
  }, {
    id: 'A-2481-011',
    time: '09:30',
    patient: 'Петров А. А.',
    doctor: 'Ковалёва И. С.',
    service: 'Приём терапевта, первичный',
    clinic: 'Динамо',
    status: 'booked',
    sum: '3 600'
  }, {
    id: 'A-2481-014',
    time: '09:45',
    patient: 'Белова А. К.',
    doctor: 'Мельник О. Р.',
    service: 'Консультация хирурга, первичная',
    clinic: 'Динамо',
    status: 'booked',
    sum: '3 900'
  }, {
    id: 'A-2481-019',
    time: '10:00',
    patient: 'Николаев В. В.',
    doctor: 'Ковалёва И. С.',
    service: 'Приём терапевта, повторный',
    clinic: 'Динамо',
    status: 'booked',
    sum: '3 200'
  }, {
    id: 'A-2481-021',
    time: '10:30',
    patient: 'Кузнецов Д. С.',
    doctor: 'Ковалёва И. С.',
    service: 'Приём терапевта, повторный',
    clinic: 'Динамо',
    status: 'cancelled',
    sum: '0'
  }, {
    id: 'A-2481-024',
    time: '11:00',
    patient: 'Орлова Т. В.',
    doctor: 'Ковалёва И. С.',
    service: 'Приём терапевта, повторный',
    clinic: 'Динамо',
    status: 'vip',
    sum: '5 400'
  }, {
    id: 'A-2481-030',
    time: '11:15',
    patient: 'Титов С. Ю.',
    doctor: 'Мельник О. Р.',
    service: 'Перевязка',
    clinic: 'Динамо',
    status: 'booked',
    sum: '1 800'
  }];
  const clinics = ['Динамо', 'Войковская', 'Курская', 'Молодёжная', 'Текстильщики', 'Марьина Роща'];
  const services = ['Приём терапевта, первичный', 'Приём терапевта, повторный', 'Консультация хирурга', 'УЗИ брюшной полости', 'Забор крови'];
  return {
    times: times,
    columns: columns,
    waitlist: waitlist,
    bookings: bookings,
    clinics: clinics,
    services: services
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-operator/data.js", error: String((e && e.message) || e) }); }

// ui_kits/arm-registrar/RegistrarScreens.jsx
try { (() => {
const {
  Panel,
  Button,
  IconButton,
  DataTable,
  StatusBadge,
  SpecialtyTag,
  Identifier,
  Toolbar,
  ToolbarSeparator,
  ToolbarSpacer,
  FilterChip,
  SearchInput,
  InlineNotice,
  Modal,
  Field,
  FieldGroup,
  FieldRow,
  Input,
  Select,
  Checkbox,
  Icon,
  Kbd,
  Tabs
} = window.SmclinicDesignSystem_c4cdb2;
const QUEUE = [{
  id: 'A-2481-005',
  time: '09:00',
  patient: 'Иванова Е. П.',
  doctor: 'Ковалёва И. С.',
  room: '204',
  service: 'Приём терапевта, повторный',
  status: 'done',
  sum: '3 200',
  paid: true
}, {
  id: 'A-2481-011',
  time: '09:30',
  patient: 'Петров А. А.',
  doctor: 'Ковалёва И. С.',
  room: '204',
  service: 'Приём терапевта, первичный',
  status: 'inroom',
  sum: '3 600',
  paid: true
}, {
  id: 'A-2481-014',
  time: '09:45',
  patient: 'Белова А. К.',
  doctor: 'Мельник О. Р.',
  room: '118',
  service: 'Консультация хирурга',
  status: 'arrived',
  sum: '3 900',
  paid: false
}, {
  id: 'A-2481-019',
  time: '10:00',
  patient: 'Николаев В. В.',
  doctor: 'Ковалёва И. С.',
  room: '204',
  service: 'Приём терапевта, повторный',
  status: 'wait',
  sum: '3 200',
  paid: false
}, {
  id: 'A-2481-024',
  time: '11:00',
  patient: 'Орлова Т. В.',
  doctor: 'Ковалёва И. С.',
  room: '204',
  service: 'Приём терапевта, повторный',
  status: 'vip',
  sum: '5 400',
  paid: true
}, {
  id: 'A-2481-030',
  time: '11:15',
  patient: 'Титов С. Ю.',
  doctor: 'Мельник О. Р.',
  room: '118',
  service: 'Перевязка',
  status: 'wait',
  sum: '1 800',
  paid: false
}, {
  id: 'A-2481-021',
  time: '10:30',
  patient: 'Кузнецов Д. С.',
  doctor: 'Ковалёва И. С.',
  room: '204',
  service: 'Приём терапевта, повторный',
  status: 'noshow',
  sum: '0',
  paid: false
}];
const ST = {
  wait: ['neutral', 'Ожидается', 'clock'],
  arrived: ['booked', 'Пришёл', 'circle-check'],
  inroom: ['booked', 'На приёме', 'stethoscope'],
  done: ['neutral', 'Завершён', 'check'],
  vip: ['vip', 'VIP', 'star'],
  noshow: ['danger', 'Не пришёл', 'ban']
};
function RegistrarApp() {
  const [nav, setNav] = React.useState('queue');
  const [rows, setRows] = React.useState(QUEUE);
  const [sel, setSel] = React.useState('A-2481-019');
  const [notice, setNotice] = React.useState(null);
  const [newPatient, setNewPatient] = React.useState(false);
  const current = rows.find(r => r.id === sel);
  function checkIn() {
    setRows(rs => rs.map(r => r.id === sel ? Object.assign({}, r, {
      status: 'arrived'
    }) : r));
    setNotice({
      tone: 'success',
      title: 'Пациент отмечен как пришедший',
      text: current.patient + ' · ' + current.time + ' · каб. ' + current.room + '. Врач видит отметку в своём АРМ.'
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--n-100)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(WorkstationTop, {
    role: "\u0410\u0420\u041C \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430",
    user: "\u0411\u0435\u043B\u043A\u0438\u043D\u0430 \u041E. \u0418.",
    initials: "\u0411\u041E",
    searchPlaceholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442: \u0444\u0430\u043C\u0438\u043B\u0438\u044F, \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u043F\u043E\u043B\u0438\u0441",
    right: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "secondary",
      icon: "plus",
      onClick: () => setNewPatient(true)
    }, "\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0446\u0438\u0435\u043D\u0442")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      paddingBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(WorkstationNav, {
    value: nav,
    onChange: setNav,
    items: [{
      id: 'queue',
      label: 'Приём сегодня',
      icon: 'list',
      count: 7
    }, {
      id: 'arrived',
      label: 'В клинике',
      icon: 'users',
      count: 2
    }, {
      id: 'pay',
      label: 'Оплаты',
      icon: 'file-text',
      count: 3
    }, {
      id: 'docs',
      label: 'Документы',
      icon: 'printer'
    }],
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--text-secondary)'
      }
    }, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u043E\u0432"), [['204 · Ковалёва И. С.', 5], ['118 · Мельник О. Р.', 2], ['302 · Ершова Н. Д.', 4]].map(([n, c]) => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, n), /*#__PURE__*/React.createElement(Identifier, {
      value: c
    }))))
  }), /*#__PURE__*/React.createElement("main", {
    className: "sm-surface",
    style: {
      flex: 1,
      minWidth: 0,
      marginRight: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Toolbar, null, /*#__PURE__*/React.createElement(FilterChip, {
    active: true,
    count: 7
  }, "\u0412\u0441\u0435"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 2
  }, "\u041E\u0436\u0438\u0434\u0430\u044E\u0442\u0441\u044F"), /*#__PURE__*/React.createElement(FilterChip, {
    count: 3
  }, "\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u044B"), /*#__PURE__*/React.createElement(ToolbarSeparator, null), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 240
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: "\u041F\u0430\u0446\u0438\u0435\u043D\u0442 \u0438\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043F\u0438\u0441\u0438"
  })), /*#__PURE__*/React.createElement(ToolbarSpacer, null), /*#__PURE__*/React.createElement(IconButton, {
    icon: "refresh-cw",
    label: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"
  }), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer"
  }, "\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0430 \u0441\u043C\u0435\u043D\u0443")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-4)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 320px',
      gap: 'var(--space-4)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, notice ? /*#__PURE__*/React.createElement(InlineNotice, {
    tone: notice.tone,
    title: notice.title,
    actions: /*#__PURE__*/React.createElement(Button, {
      dense: true,
      variant: "secondary",
      onClick: () => setNotice(null)
    }, "\u0421\u043A\u0440\u044B\u0442\u044C")
  }, notice.text) : null, /*#__PURE__*/React.createElement(Panel, {
    title: "\u041F\u0440\u0438\u0451\u043C 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430 \xB7 \u0414\u0438\u043D\u0430\u043C\u043E",
    padded: false
  }, /*#__PURE__*/React.createElement(DataTable, {
    compact: true,
    rowKey: "id",
    selectedId: sel,
    onRowClick: r => setSel(r.id),
    columns: [{
      key: 'time',
      label: 'Время',
      width: 64,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.time,
        strong: true
      })
    }, {
      key: 'patient',
      label: 'Пациент',
      width: 160
    }, {
      key: 'doctor',
      label: 'Врач',
      width: 150
    }, {
      key: 'room',
      label: 'Каб.',
      width: 56,
      render: r => /*#__PURE__*/React.createElement(Identifier, {
        value: r.room
      })
    }, {
      key: 'service',
      label: 'Услуга'
    }, {
      key: 'status',
      label: 'Статус',
      width: 128,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        tone: ST[r.status][0],
        icon: ST[r.status][2]
      }, ST[r.status][1])
    }, {
      key: 'sum',
      label: 'Оплата',
      width: 110,
      render: r => r.paid ? /*#__PURE__*/React.createElement(StatusBadge, {
        tone: "booked"
      }, r.sum, " \u20BD") : /*#__PURE__*/React.createElement(StatusBadge, {
        tone: "attention"
      }, r.sum, " \u20BD \xB7 \u0434\u043E\u043B\u0433")
    }],
    rows: rows,
    renderActions: r => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "printer",
      label: "\u041F\u0435\u0447\u0430\u0442\u044C \u0442\u0430\u043B\u043E\u043D\u0430",
      size: "sm"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "pencil",
      label: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C",
      size: "sm"
    }))
  }))), /*#__PURE__*/React.createElement(Panel, {
    title: "\u041F\u0440\u0438\u0451\u043C \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430"
  }, current ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0
    }
  }, current.patient), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    tone: ST[current.status][0],
    icon: ST[current.status][2]
  }, ST[current.status][1]), /*#__PURE__*/React.createElement(SpecialtyTag, {
    specialty: "surgery"
  }, "\u0422\u0435\u0440\u0430\u043F\u0438\u044F"))), /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: 'grid',
      gridTemplateColumns: '92px 1fr',
      rowGap: 6,
      columnGap: 8,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\u0417\u0430\u043F\u0438\u0441\u044C"), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(Identifier, {
    value: current.id,
    strong: true
  })), /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\u0412\u0440\u0435\u043C\u044F"), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, current.time, " \xB7 \u043A\u0430\u0431. ", current.room), /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\u0412\u0440\u0430\u0447"), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, current.doctor), /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\u0423\u0441\u043B\u0443\u0433\u0430"), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, current.service), /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\u041A \u043E\u043F\u043B\u0430\u0442\u0435"), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(Identifier, {
    value: current.sum + ' ₽',
    strong: true
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "check",
    block: true,
    onClick: checkIn,
    disabled: current.status !== 'wait'
  }, "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u0438\u0445\u043E\u0434"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "printer"
  }, "\u041F\u0435\u0447\u0430\u0442\u044C \u0442\u0430\u043B\u043E\u043D\u0430"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "secondary",
    icon: "file-text"
  }, "\u0414\u043E\u0433\u043E\u0432\u043E\u0440 \u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u0435"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "attention",
    icon: "circle-alert"
  }, "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443"), /*#__PURE__*/React.createElement(Button, {
    dense: true,
    variant: "danger",
    icon: "ban"
  }, "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043D\u0435\u044F\u0432\u043A\u0443")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "Enter"), " \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u0438\u0445\u043E\u0434 \xB7 ", /*#__PURE__*/React.createElement(Kbd, null, "Ctrl"), /*#__PURE__*/React.createElement(Kbd, null, "P"), " \u043F\u0435\u0447\u0430\u0442\u044C \u0442\u0430\u043B\u043E\u043D\u0430")) : null)))), /*#__PURE__*/React.createElement(Modal, {
    open: newPatient,
    title: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0446\u0438\u0435\u043D\u0442",
    onClose: () => setNewPatient(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setNewPatient(false)
    }, "\u041E\u0442\u043C\u0435\u043D\u0430"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "check",
      onClick: () => setNewPatient(false)
    }, "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443"))
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    style: {
      maxWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F",
    htmlFor: "n1",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n1"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0418\u043C\u044F",
    htmlFor: "n2",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n2"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u041E\u0442\u0447\u0435\u0441\u0442\u0432\u043E",
    htmlFor: "n3",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n3"
  }))), /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Field, {
    label: "\u0414\u0430\u0442\u0430 \u0440\u043E\u0436\u0434\u0435\u043D\u0438\u044F",
    htmlFor: "n4",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n4",
    placeholder: "\u0434\u0434.\u043C\u043C.\u0433\u0433\u0433\u0433"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
    htmlFor: "n5",
    required: true,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n5",
    placeholder: "+7 ___ ___-__-__"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u043E\u043B",
    htmlFor: "n6",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "n6",
    options: ['Женский', 'Мужской']
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u043E\u043B\u0438\u0441 \u041E\u041C\u0421 \u0438\u043B\u0438 \u0414\u041C\u0421",
    htmlFor: "n7",
    hint: "16 \u0446\u0438\u0444\u0440, \u0438\u0449\u0435\u0442\u0441\u044F \u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435 \u043F\u0440\u0438 \u0432\u0432\u043E\u0434\u0435"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "n7",
    mono: true
  })), /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u0421\u043E\u0433\u043B\u0430\u0441\u0438\u0435 \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E",
    defaultChecked: true
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(RegistrarApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/arm-registrar/RegistrarScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/Chrome.jsx
try { (() => {
const {
  Icon,
  IconButton,
  SearchInput,
  Kbd,
  Identifier
} = window.SmclinicDesignSystem_c4cdb2;

/* Общий хром рабочих мест: верхняя полоса и боковая навигация лежат прямо на фоне рамки,
   без заливок и разделительных линий. Содержимое экрана живёт на отдельной поверхности .sm-surface.
   АРМ оператора использует собственную копию — там в шапке живёт переключатель клиник. */
function WorkstationTop({
  role,
  user,
  initials,
  right,
  searchPlaceholder
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-h)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'calc(var(--sidebar-w) - var(--space-4))',
      flex: 'none',
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: '-0.022em',
      color: 'var(--brand-green-700)',
      whiteSpace: 'nowrap'
    }
  }, "\u0421\u041C-\u041A\u043B\u0438\u043D\u0438\u043A\u0430"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-meta)',
      whiteSpace: 'nowrap'
    }
  }, role)), /*#__PURE__*/React.createElement("span", {
    className: "sm-chip",
    style: {
      gap: 6,
      paddingLeft: 10,
      cursor: 'default'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "building-2",
    size: 14
  }), " \u0414\u0438\u043D\u0430\u043C\u043E \xB7 14 \u0430\u0432\u0433\u0443\u0441\u0442\u0430"), searchPlaceholder ? /*#__PURE__*/React.createElement("div", {
    className: "sm-search--pill",
    style: {
      flex: 1,
      maxWidth: 420,
      marginInline: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    compact: true,
    placeholder: searchPlaceholder,
    shortcut: "/"
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), right, /*#__PURE__*/React.createElement(IconButton, {
    icon: "printer",
    label: "\u041F\u0435\u0447\u0430\u0442\u044C"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sm-chip",
    style: {
      gap: 8,
      paddingLeft: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: 'var(--brand-green-tint)',
      color: 'var(--brand-green-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 500
    }
  }, initials), user));
}
function WorkstationNav({
  items,
  value,
  onChange,
  footer
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "data-chrome": true,
    style: {
      width: 'var(--sidebar-w)',
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      padding: '0 var(--space-2) var(--space-3) var(--space-4)',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, items.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    type: "button",
    className: "sm-navitem",
    "aria-current": value === n.id ? 'page' : undefined,
    onClick: () => onChange(n.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 16
  }), n.label, n.count !== undefined ? /*#__PURE__*/React.createElement("span", {
    className: "sm-navitem__count"
  }, n.count) : null))), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xs)'
    }
  }, footer) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '0 var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--text-meta)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "keyboard",
    size: 14
  }), " \u0413\u043E\u0440\u044F\u0447\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438 ", /*#__PURE__*/React.createElement(Kbd, null, "?")));
}
Object.assign(window, {
  WorkstationTop,
  WorkstationNav
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/Chrome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.ICON_PATHS = __ds_scope.ICON_PATHS;

__ds_ns.Kbd = __ds_scope.Kbd;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.Identifier = __ds_scope.Identifier;

__ds_ns.ScheduleGrid = __ds_scope.ScheduleGrid;

__ds_ns.SlotCell = __ds_scope.SlotCell;

__ds_ns.InlineNotice = __ds_scope.InlineNotice;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.SkeletonRows = __ds_scope.SkeletonRows;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.FieldGroup = __ds_scope.FieldGroup;

__ds_ns.FieldRow = __ds_scope.FieldRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.SPECIALTIES = __ds_scope.SPECIALTIES;

__ds_ns.SpecialtyTag = __ds_scope.SpecialtyTag;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.Toolbar = __ds_scope.Toolbar;

__ds_ns.ToolbarSeparator = __ds_scope.ToolbarSeparator;

__ds_ns.ToolbarSpacer = __ds_scope.ToolbarSpacer;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.CommandPalette = __ds_scope.CommandPalette;

__ds_ns.Menu = __ds_scope.Menu;

__ds_ns.Popover = __ds_scope.Popover;

__ds_ns.Modal = __ds_scope.Modal;

})();
