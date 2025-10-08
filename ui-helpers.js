// ===== UI 헬퍼 함수들 =====

// CSS 주입
function injectStyles() {
  if (document.getElementById('sanga-styles')) return;
  
  const styleLink = document.createElement('link');
  styleLink.id = 'sanga-styles';
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  document.head.appendChild(styleLink);
}

// 토글 스위치 생성
function createToggleSwitch(id, label, checked = false, onChange) {
  const container = document.createElement('div');
  container.className = 'sanga-toggle-container';
  
  const labelEl = document.createElement('span');
  labelEl.className = 'sanga-toggle-label';
  labelEl.textContent = label;
  
  const switchWrapper = document.createElement('label');
  switchWrapper.className = 'sanga-toggle-switch';
  
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  if (onChange) input.addEventListener('change', onChange);
  
  const slider = document.createElement('span');
  slider.className = 'sanga-toggle-slider';
  
  switchWrapper.appendChild(input);
  switchWrapper.appendChild(slider);
  
  container.appendChild(labelEl);
  container.appendChild(switchWrapper);
  
  return { container, input };
}

// 버튼 생성
function createButton(text, options = {}) {
  const {
    className = 'sanga-btn-primary',
    icon = null,
    onClick = null,
    disabled = false
  } = options;
  
  const button = document.createElement('button');
  button.className = `sanga-btn ${className}`;
  button.disabled = disabled;
  
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    button.appendChild(iconEl);
  }
  
  const textEl = document.createElement('span');
  textEl.textContent = text;
  button.appendChild(textEl);
  
  if (onClick) button.addEventListener('click', onClick);
  
  return button;
}

// 카드 생성
function createCard(title, content) {
  const card = document.createElement('div');
  card.className = 'sanga-card';
  
  const header = document.createElement('div');
  header.className = 'sanga-card-header';
  header.textContent = title;
  
  const body = document.createElement('div');
  body.className = 'sanga-card-body';
  if (typeof content === 'string') {
    body.textContent = content;
  } else {
    body.appendChild(content);
  }
  
  card.appendChild(header);
  card.appendChild(body);
  
  return card;
}

// 테이블 생성
function createTable(headers, data, options = {}) {
  const {
    className = '',
    onRowClick = null,
    rowClassifier = null
  } = options;
  
  const table = document.createElement('table');
  table.className = `sanga-table ${className}`;
  
  // 헤더 생성
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // 바디 생성
  const tbody = document.createElement('tbody');
  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    
    // 행 분류자 적용
    if (rowClassifier) {
      const rowClass = rowClassifier(row);
      if (rowClass) tr.className = rowClass;
    }
    
    Object.values(row).forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    
    if (onRowClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onRowClick(row, index));
    }
    
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  
  return table;
}

// 셀렉트 박스 생성
function createSelect(id, options, defaultValue = '', onChange = null) {
  const select = document.createElement('select');
  select.id = id;
  select.className = 'sanga-select';
  
  options.forEach(option => {
    const optEl = document.createElement('option');
    optEl.value = option.value;
    optEl.textContent = option.label;
    if (option.value === defaultValue) optEl.selected = true;
    select.appendChild(optEl);
  });
  
  if (onChange) select.addEventListener('change', onChange);
  
  return select;
}

// 입력 그룹 생성
function createInputGroup(label, inputType, options = {}) {
  const {
    id = '',
    value = '',
    placeholder = '',
    onChange = null,
    step = null
  } = options;
  
  const group = document.createElement('div');
  group.className = 'sanga-input-group';
  
  const labelEl = document.createElement('label');
  labelEl.className = 'sanga-input-label';
  labelEl.textContent = label;
  if (id) labelEl.htmlFor = id;
  
  const input = document.createElement('input');
  input.type = inputType;
  input.className = 'sanga-input';
  if (id) input.id = id;
  if (value) input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (step) input.step = step;
  if (onChange) input.addEventListener('input', onChange);
  
  group.appendChild(labelEl);
  group.appendChild(input);
  
  return { group, input };
}

// 모달 생성
function createModal(title, content, options = {}) {
  const {
    width = '600px',
    onClose = null,
    buttons = []
  } = options;
  
  // 오버레이
  const overlay = document.createElement('div');
  overlay.className = 'sanga-modal-overlay';
  
  // 모달
  const modal = document.createElement('div');
  modal.className = 'sanga-modal';
  modal.style.width = width;
  
  // 헤더
  const header = document.createElement('div');
  header.className = 'sanga-modal-header';
  
  const titleEl = document.createElement('h3');
  titleEl.className = 'sanga-modal-title';
  titleEl.textContent = title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sanga-modal-close';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  });
  
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  
  // 바디
  const body = document.createElement('div');
  body.className = 'sanga-modal-body';
  if (typeof content === 'string') {
    body.textContent = content;
  } else {
    body.appendChild(content);
  }
  
  modal.appendChild(header);
  modal.appendChild(body);
  
  // 버튼들
  if (buttons.length > 0) {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'sanga-btn-group';
    buttonGroup.style.justifyContent = 'flex-end';
    buttonGroup.style.padding = '15px';
    buttonGroup.style.borderTop = '1px solid #dee2e6';
    
    buttons.forEach(btn => {
      const button = createButton(btn.text, {
        className: btn.className || 'sanga-btn-primary',
        onClick: () => {
          if (btn.onClick) btn.onClick();
          if (btn.closeOnClick !== false) {
            document.body.removeChild(overlay);
          }
        }
      });
      buttonGroup.appendChild(button);
    });
    
    modal.appendChild(buttonGroup);
  }
  
  overlay.appendChild(modal);
  
  // 오버레이 클릭 시 닫기
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      if (onClose) onClose();
    }
  });
  
  return overlay;
}

// 배지 생성
function createBadge(text, type = 'primary') {
  const badge = document.createElement('span');
  badge.className = `sanga-badge sanga-badge-${type}`;
  badge.textContent = text;
  return badge;
}

// 가격 태그 생성
function createPriceTag(price, type = 'sale') {
  const tag = document.createElement('span');
  tag.className = `sanga-price-tag ${type}`;
  tag.textContent = `@${price}만원`;
  return tag;
}

// 툴팁 추가
function addTooltip(element, text) {
  const tooltip = document.createElement('span');
  tooltip.className = 'sanga-tooltip-text';
  tooltip.textContent = text;
  
  element.classList.add('sanga-tooltip');
  element.appendChild(tooltip);
}

// 로딩 스피너 생성
function createLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'sanga-loading';
  return spinner;
}

// 알림 표시
function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10002;
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
}

// 컨트롤 패널 생성
function createControlPanel() {
  const panel = document.createElement('div');
  panel.className = 'sanga-control-panel';
  panel.id = 'sanga-main-panel';
  
  // 드래그 가능하게 만들기
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  
  panel.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
      return;
    }
    
    isDragging = true;
    initialX = e.clientX - panel.offsetLeft;
    initialY = e.clientY - panel.offsetTop;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  return panel;
}

// 테이블 컨테이너 생성
function createTableContainer(position = { top: '50px', left: '410px' }) {
  const container = document.createElement('div');
  container.className = 'sanga-table-container';
  container.style.top = position.top;
  container.style.left = position.left;
  return container;
}

// Export functions
window.SangaUI = {
  injectStyles,
  createToggleSwitch,
  createButton,
  createCard,
  createTable,
  createSelect,
  createInputGroup,
  createModal,
  createBadge,
  createPriceTag,
  addTooltip,
  createLoadingSpinner,
  showNotification,
  createControlPanel,
  createTableContainer
};