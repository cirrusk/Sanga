// ===== SanGa v2.0 - Background Script =====

console.log('🟢 SanGa Background Script Loaded');

// ===== 확장 프로그램 설치/업데이트 시 =====
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SanGa Extension Installed/Updated:', details.reason);
  
  if (details.reason === 'install') {
    // 최초 설치 시 기본 설정 저장
    const defaultConfig = {
      onoffstatus: true,
      autoScroll: true,
      contiStatus: false,
      floorsorting: true,
      dangaAsc: true,
      percentMargin: 6.5
    };
    
    chrome.storage.local.set({ config: defaultConfig }, () => {
      console.log('✅ Default config saved:', defaultConfig);
    });
  } else if (details.reason === 'update') {
    console.log('✅ Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// ===== 확장 프로그램 시작 시 =====
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 SanGa Extension Started');
});

// ===== 메시지 리스너 (popup과 content script 간 통신) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message);
  
  if (message.type === 'GET_CONFIG') {
    // 설정 요청
    chrome.storage.local.get(['config'], (result) => {
      sendResponse({ config: result.config });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (message.type === 'SAVE_CONFIG') {
    // 설정 저장
    chrome.storage.local.set({ config: message.config }, () => {
      console.log('✅ Config saved:', message.config);
      
      // 모든 탭의 content script에 설정 변경 알림
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url && (
            tab.url.includes('land.naver.com') ||
            tab.url.includes('auction1.co.kr') ||
            tab.url.includes('tankauction.com') ||
            tab.url.includes('asil.kr') ||
            tab.url.includes('myfranchise.kr')
          )) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'CONFIG_UPDATED',
              config: message.config
            }).catch(() => {
              // 탭이 아직 로드되지 않았거나 content script가 없는 경우 무시
              console.log('Tab not ready:', tab.id);
            });
          }
        });
      });
      
      sendResponse({ success: true });
    });
    return true; // 비동기 응답
  }
  
  return false;
});

// ===== 탭 업데이트 감지 (네이버 부동산 페이지 로드 시) =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 페이지 로드 완료 시
  if (changeInfo.status === 'complete' && tab.url) {
    // 지원하는 사이트인지 확인
    const supportedSites = [
      'land.naver.com',
      'auction1.co.kr',
      'tankauction.com',
      'asil.kr',
      'myfranchise.kr'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    
    if (isSupported) {
      console.log('✅ Supported site loaded:', tab.url);
      
      // Content script에 초기화 신호 보내기 (옵션)
      chrome.tabs.sendMessage(tabId, {
        type: 'PAGE_LOADED',
        url: tab.url
      }).catch(() => {
        console.log('Content script not ready yet');
      });
    }
  }
});

// ===== 에러 핸들링 =====
chrome.runtime.onSuspend.addListener(() => {
  console.log('⚠️ Background script is being suspended');
});

// ===== 디버그 정보 =====
console.log('📋 Extension Info:');
console.log('  - Name:', chrome.runtime.getManifest().name);
console.log('  - Version:', chrome.runtime.getManifest().version);
console.log('  - Manifest Version:', chrome.runtime.getManifest().manifest_version);