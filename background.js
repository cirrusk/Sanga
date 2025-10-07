// SanGa Pro - Background Service Worker

// 설치 이벤트
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 초기 설정
    const defaultConfig = {
      enabled: true,
      autoScroll: false,
      profitMargin: 6.5,
      theme: 'light'
    };

    const defaultStats = {
      totalAnalyzed: 0,
      lastUpdate: null,
      installDate: new Date().toISOString()
    };

    chrome.storage.local.set({
      config: defaultConfig,
      stats: defaultStats
    });

    // 환영 페이지 열기
    chrome.tabs.create({
      url: 'https://new.land.naver.com'
    });

    console.log('🎉 SanGa Pro installed successfully!');
  } else if (details.reason === 'update') {
    console.log('✨ SanGa Pro updated!');
  }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_STATS') {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || {
        totalAnalyzed: 0,
        lastUpdate: null
      };

      stats.totalAnalyzed += request.count || 0;
      stats.lastUpdate = new Date().toISOString();

      chrome.storage.local.set({ stats });
    });
  }

  if (request.type === 'GET_CONFIG') {
    chrome.storage.local.get(['config'], (result) => {
      sendResponse(result.config);
    });
    return true; // 비동기 응답을 위해 필요
  }
});

// 아이콘 클릭 이벤트
chrome.action.onClicked.addListener((tab) => {
  // 지원하는 사이트인지 확인
  const supportedSites = [
    'new.land.naver.com',
    'm.land.naver.com',
    'auction1.co.kr',
    'tankauction.com',
    'asil.kr',
    'myfranchise.kr'
  ];

  const isSupported = supportedSites.some(site => tab.url.includes(site));

  if (!isSupported) {
    // 지원하지 않는 사이트면 네이버 부동산으로 이동
    chrome.tabs.create({
      url: 'https://new.land.naver.com'
    });
  }
});

// 컨텍스트 메뉴 추가
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sanga-analyze',
    title: '🏠 SanGa Pro로 분석하기',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://new.land.naver.com/*',
      'https://m.land.naver.com/*',
      'https://www.auction1.co.kr/*',
      'https://www.tankauction.com/*',
      'https://asil.kr/*',
      'https://myfranchise.kr/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sanga-analyze') {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TRIGGER_ANALYSIS'
    });
  }
});

console.log('🚀 SanGa Pro background service worker loaded');