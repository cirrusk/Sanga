// config-listener.js - contents.js에 추가할 코드

// 팝업에서 설정 변경 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONFIG_UPDATED') {
    console.log('Config updated from popup:', message.config);
    
    // 전역 변수 업데이트
    onoffstatus = message.config.onoffstatus;
    autoScroll = message.config.autoScroll;
    contiStatus = message.config.contiStatus;
    floorsorting = message.config.floorsorting;
    dangaAsc = message.config.dangaAsc;
    percentMargin = message.config.percentMargin;
    
    // UI 새로고침
    const panel = document.getElementById('sanga-main-panel');
    if (panel) {
      panel.remove();
      createMainControlPanel();
    }
    
    // 테이블이 열려있으면 새로고침
    if (tableshowstatus) {
      closeTable();
      showSummaryTable();
    }
    
    // 알림 표시
    SangaUI.showNotification('설정이 업데이트되었습니다', 'success');
    
    sendResponse({ success: true });
  }
  
  return true; // 비동기 응답을 위해 필요
});

// Storage 변경 감지 (다른 탭에서의 변경도 감지)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.config) {
    const newConfig = changes.config.newValue;
    console.log('Storage config changed:', newConfig);
    
    // 전역 변수 업데이트
    if (newConfig) {
      onoffstatus = newConfig.onoffstatus;
      autoScroll = newConfig.autoScroll;
      contiStatus = newConfig.contiStatus;
      floorsorting = newConfig.floorsorting;
      dangaAsc = newConfig.dangaAsc;
      percentMargin = newConfig.percentMargin;
    }
  }
});

// 페이지 표시 여부 감지 (탭 전환 등)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // 페이지가 다시 보일 때 설정 재로드
    getConfig(config => {
      onoffstatus = config.onoffstatus;
      autoScroll = config.autoScroll;
      contiStatus = config.contiStatus;
      floorsorting = config.floorsorting;
      dangaAsc = config.dangaAsc;
      percentMargin = config.percentMargin;
      
      console.log('Config reloaded on visibility change');
    });
  }
});