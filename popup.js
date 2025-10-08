// popup.js - 확장 프로그램 팝업 설정 관리

// 기본 설정값
const defaultConfig = {
  onoffstatus: true,
  autoScroll: true,
  contiStatus: false,
  floorsorting: true,
  dangaAsc: true,
  percentMargin: 6.5
};

// DOM 요소들
const elements = {
  onoffstatus: document.getElementById('onoffstatus'),
  autoScroll: document.getElementById('autoScroll'),
  contiStatus: document.getElementById('contiStatus'),
  floorsorting: document.getElementById('floorsorting'),
  dangaAsc: document.getElementById('dangaAsc'),
  percentMargin: document.getElementById('percentMargin'),
  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  statusMessage: document.getElementById('statusMessage')
};

// 설정 불러오기
function loadConfig() {
  chrome.storage.local.get(['config'], (result) => {
    const config = result.config || defaultConfig;
    
    // 각 설정값을 UI에 반영
    elements.onoffstatus.checked = config.onoffstatus;
    elements.autoScroll.checked = config.autoScroll;
    elements.contiStatus.checked = config.contiStatus;
    elements.floorsorting.checked = config.floorsorting;
    elements.dangaAsc.checked = config.dangaAsc;
    elements.percentMargin.value = config.percentMargin;
    
    console.log('Config loaded:', config);
  });
}

// 설정 저장하기
function saveConfig() {
  const config = {
    onoffstatus: elements.onoffstatus.checked,
    autoScroll: elements.autoScroll.checked,
    contiStatus: elements.contiStatus.checked,
    floorsorting: elements.floorsorting.checked,
    dangaAsc: elements.dangaAsc.checked,
    percentMargin: parseFloat(elements.percentMargin.value) || 6.5
  };
  
  chrome.storage.local.set({ config }, () => {
    console.log('Config saved:', config);
    showStatus('설정이 저장되었습니다! ✓', 'success');
    
    // 활성 탭에 메시지 전송하여 설정 새로고침
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CONFIG_UPDATED',
          config: config
        }).catch(err => {
          console.log('Tab message error (tab may not have content script):', err);
        });
      }
    });
  });
}

// 설정 초기화
function resetConfig() {
  if (confirm('모든 설정을 초기화하시겠습니까?')) {
    chrome.storage.local.set({ config: defaultConfig }, () => {
      loadConfig();
      showStatus('설정이 초기화되었습니다! 🔄', 'success');
    });
  }
}

// 상태 메시지 표시
function showStatus(message, type = 'success') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  
  setTimeout(() => {
    elements.statusMessage.className = 'status-message';
  }, 3000);
}

// 입력 검증
function validateInputs() {
  const margin = parseFloat(elements.percentMargin.value);
  
  if (isNaN(margin) || margin <= 0) {
    showStatus('수익률은 0보다 큰 숫자여야 합니다 ⚠️', 'error');
    return false;
  }
  
  if (margin > 100) {
    showStatus('수익률이 너무 높습니다 (100% 이하로 입력) ⚠️', 'error');
    return false;
  }
  
  return true;
}

// 이벤트 리스너 등록
elements.saveBtn.addEventListener('click', () => {
  if (validateInputs()) {
    saveConfig();
  }
});

elements.resetBtn.addEventListener('click', resetConfig);

// Enter 키로 저장
elements.percentMargin.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (validateInputs()) {
      saveConfig();
    }
  }
});

// 실시간 변경사항 표시 (선택사항)
[elements.onoffstatus, elements.autoScroll, elements.contiStatus, 
 elements.floorsorting, elements.dangaAsc].forEach(element => {
  element.addEventListener('change', () => {
    // 변경사항이 있음을 표시
    elements.saveBtn.style.animation = 'pulse 0.5s';
    setTimeout(() => {
      elements.saveBtn.style.animation = '';
    }, 500);
  });
});

elements.percentMargin.addEventListener('input', () => {
  elements.saveBtn.style.animation = 'pulse 0.5s';
  setTimeout(() => {
    elements.saveBtn.style.animation = '';
  }, 500);
});

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;
document.head.appendChild(style);

// 페이지 로드 시 설정 불러오기
document.addEventListener('DOMContentLoaded', loadConfig);

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S로 저장
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (validateInputs()) {
      saveConfig();
    }
  }
  
  // Ctrl/Cmd + R로 초기화
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    resetConfig();
  }
});