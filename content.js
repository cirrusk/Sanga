// ===== SanGa v2.0 - 개선된 Content Script =====

// ===== 전역 변수 =====
let onoffstatus = true;
let autoScroll = true;
let contiStatus = false;
let floorsorting = true;
let dangaAsc = true;
let percentMargin = 6.5;

let propertyData = [];
let propertyData2 = [];
let tableData1 = [];
let tableData2 = [];
let tableData1_copy = [];
let tableData2_copy = [];
let datalength1 = 0;
let datalength2 = 0;
let tableshowstatus = false;

// ===== 설정 관리 함수 =====
function getConfig(callback) {
  chrome.storage.local.get(['config'], (result) => {
    const config = result.config || {
      onoffstatus: true,
      autoScroll: true,
      contiStatus: false,
      floorsorting: true,
      dangaAsc: true,
      percentMargin: 6.5
    };
    callback(config);
  });
}

function saveConfig(config, callback) {
  chrome.storage.local.set({ config }, callback);
}

function updateConfig(updates) {
  getConfig(config => {
    const newConfig = { ...config, ...updates };
    saveConfig(newConfig, () => {
      console.log('Config updated:', newConfig);
    });
  });
}

// ===== 설정 변경 리스너 =====
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
    if (typeof SangaUI !== 'undefined') {
      SangaUI.showNotification('설정이 업데이트되었습니다', 'success');
    }
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Storage 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.config) {
    const newConfig = changes.config.newValue;
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

// ===== 초기화 함수 =====
function initializeSangaUI() {
  console.log('Initializing SanGa UI...');
  
  // 스타일 주입
  if (typeof SangaUI !== 'undefined') {
    SangaUI.injectStyles();
  }
  
  // 설정 불러오기
  getConfig(config => {
    onoffstatus = config.onoffstatus;
    autoScroll = config.autoScroll;
    contiStatus = config.contiStatus;
    floorsorting = config.floorsorting;
    dangaAsc = config.dangaAsc;
    percentMargin = config.percentMargin;
    
    console.log('Config loaded:', config);
    
    // 프로그램이 활성화되어 있으면 UI 생성
    if (onoffstatus) {
      createMainControlPanel();
      startPropertyExtraction();
    }
  });
}

// ===== 메인 컨트롤 패널 생성 =====
function createMainControlPanel() {
  // 기존 패널 제거
  const existingPanel = document.getElementById('sanga-main-panel');
  if (existingPanel) existingPanel.remove();
  
  const panel = SangaUI.createControlPanel();
  
  // 타이틀 추가
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #007bff;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  title.innerHTML = '🏠 <span>산가</span>';
  panel.appendChild(title);
  
  // 1. 프로그램 ON/OFF 토글
  const { container: programToggle } = SangaUI.createToggleSwitch(
    'sanga-program-toggle',
    '프로그램',
    onoffstatus,
    function(e) {
      onoffstatus = e.target.checked;
      
      if (!onoffstatus) {
        // 테이블 제거
        closeTable();
        SangaUI.showNotification('프로그램이 비활성화되었습니다', 'success');
      } else {
        SangaUI.showNotification('프로그램이 활성화되었습니다', 'success');
        startPropertyExtraction();
      }
      
      updateConfig({ onoffstatus });
    }
  );
  panel.appendChild(programToggle);
  
  // 2. 오토스크롤 토글
  const { container: scrollToggle } = SangaUI.createToggleSwitch(
    'sanga-autoscroll-toggle',
    '오토스크롤',
    autoScroll,
    function(e) {
      autoScroll = e.target.checked;
      updateConfig({ autoScroll });
      SangaUI.showNotification(
        autoScroll ? '오토스크롤 활성화' : '오토스크롤 비활성화',
        'success'
      );
    }
  );
  panel.appendChild(scrollToggle);
  
  // 3. 연속 처리 토글
  const { container: contiToggle } = SangaUI.createToggleSwitch(
    'sanga-continuous-toggle',
    '연속처리',
    contiStatus,
    function(e) {
      contiStatus = e.target.checked;
      updateConfig({ contiStatus });
      
      if (!contiStatus) {
        // 데이터 초기화
        resetAllData();
      }
    }
  );
  panel.appendChild(contiToggle);
  
  // 4. 층순/향순 토글
  const { container: sortToggle } = SangaUI.createToggleSwitch(
    'sanga-floor-sort-toggle',
    floorsorting ? '층순' : '향순',
    floorsorting,
    function(e) {
      floorsorting = e.target.checked;
      sortToggle.querySelector('.sanga-toggle-label').textContent = 
        floorsorting ? '층순' : '향순';
      updateConfig({ floorsorting });
      
      // 테이블이 열려있으면 새로고침
      if (tableshowstatus) {
        refreshTable();
      }
    }
  );
  panel.appendChild(sortToggle);
  
  // 5. 단가 정렬 토글
  const { container: dangaToggle } = SangaUI.createToggleSwitch(
    'sanga-danga-toggle',
    '단가순',
    dangaAsc,
    function(e) {
      dangaAsc = e.target.checked;
      updateConfig({ dangaAsc });
      
      // 테이블이 열려있으면 새로고침
      if (tableshowstatus) {
        refreshTable();
      }
    }
  );
  panel.appendChild(dangaToggle);
  
  // 구분선
  const divider = document.createElement('hr');
  divider.style.cssText = 'border: none; border-top: 1px solid #dee2e6; margin: 15px 0;';
  panel.appendChild(divider);
  
  // 6. 수익률 입력
  const { group: marginGroup, input: marginInput } = SangaUI.createInputGroup(
    '수익률 (%)',
    'number',
    {
      id: 'sanga-margin-input',
      value: percentMargin.toFixed(1),
      placeholder: '6.5',
      step: '0.1',
      onChange: (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
          percentMargin = value;
          updateConfig({ percentMargin });
        }
      }
    }
  );
  panel.appendChild(marginGroup);
  
  // 구분선
  const divider2 = document.createElement('hr');
  divider2.style.cssText = 'border: none; border-top: 1px solid #dee2e6; margin: 15px 0;';
  panel.appendChild(divider2);
  
  // 데이터 카운트 표시
  const dataCount = document.createElement('div');
  dataCount.id = 'sanga-data-count';
  dataCount.style.cssText = `
    font-size: 12px;
    color: #666;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 10px;
    text-align: center;
  `;
  updateDataCount(dataCount);
  panel.appendChild(dataCount);
  
  // 버튼 그룹
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'sanga-btn-group';
  buttonGroup.style.flexDirection = 'column';
  buttonGroup.style.gap = '8px';
  
  // 요약표 버튼
  const summaryBtn = SangaUI.createButton('📊 요약표', {
    className: tableshowstatus ? 'sanga-btn-danger' : 'sanga-btn-primary',
    onClick: () => {
      if (tableshowstatus) {
        closeTable();
        summaryBtn.className = 'sanga-btn sanga-btn-primary';
        summaryBtn.innerHTML = '<span>📊</span><span>요약표</span>';
      } else {
        showSummaryTable();
        summaryBtn.className = 'sanga-btn sanga-btn-danger';
        summaryBtn.innerHTML = '<span>✕</span><span>표닫기</span>';
      }
    }
  });
  buttonGroup.appendChild(summaryBtn);
  
  // 평형분석 버튼
  const analysisBtn = SangaUI.createButton('📈 평형분석', {
    className: 'sanga-btn-secondary',
    onClick: openPyeongAnalysisModal
  });
  buttonGroup.appendChild(analysisBtn);
  
  // 새로고침 버튼
  const refreshBtn = SangaUI.createButton('🔄 새로고침', {
    className: 'sanga-btn-outline',
    onClick: () => {
      startPropertyExtraction();
      SangaUI.showNotification('데이터를 다시 불러옵니다', 'success');
    }
  });
  buttonGroup.appendChild(refreshBtn);
  
  // 초기화 버튼
  const resetBtn = SangaUI.createButton('🗑️ 초기화', {
    className: 'sanga-btn-outline',
    onClick: () => {
      if (confirm('모든 데이터를 초기화하시겠습니까?')) {
        resetAllData();
        SangaUI.showNotification('데이터가 초기화되었습니다', 'success');
      }
    }
  });
  buttonGroup.appendChild(resetBtn);
  
  panel.appendChild(buttonGroup);
  
  // 페이지에 추가
  const mapWrap = document.querySelector('.map_wrap');
  if (mapWrap) {
    mapWrap.appendChild(panel);
  } else {
    document.body.appendChild(panel);
  }
}

// ===== 데이터 카운트 업데이트 =====
function updateDataCount(element) {
  if (!element) {
    element = document.getElementById('sanga-data-count');
  }
  if (element) {
    const totalRent = tableData1.length;
    const totalSale = tableData2.length;
    element.innerHTML = `
      <div style="display: flex; justify-content: space-around;">
        <span style="color: #dc3545;">월세: ${totalRent}</span>
        <span style="color: #28a745;">매매: ${totalSale}</span>
      </div>
    `;
  }
}

// ===== 매물 정보 추출 시작 =====
function startPropertyExtraction() {
  if (!onoffstatus) return;
  
  console.log('Starting property extraction...');
  
  // 연속처리가 아니면 데이터 초기화
  if (!contiStatus) {
    resetAllData();
  }
  
  // 사이트별 추출 로직
  const currentUrl = window.location.href;
  
  if (currentUrl.includes('new.land.naver.com') || currentUrl.includes('m.land.naver.com')) {
    extractNaverLandData();
  } else if (currentUrl.includes('auction1.co.kr')) {
    extractAuction1Data();
  } else if (currentUrl.includes('tankauction.com')) {
    extractTankAuctionData();
  } else if (currentUrl.includes('asil.kr')) {
    extractAsilData();
  } else if (currentUrl.includes('myfranchise.kr')) {
    extractMyFranchiseData();
  }
}

// ===== 네이버 부동산 데이터 추출 =====
function extractNaverLandData() {
  console.log('Extracting Naver Land data...');
  
  const observer = new MutationObserver(() => {
    if (!onoffstatus) return;
    
    // 월세/전세 데이터 추출
    const rentItems = document.querySelectorAll('.item_link');
    rentItems.forEach((item, index) => {
      if (index < datalength1) return; // 이미 처리된 항목
      
      extractRentItem(item);
    });
    
    // 매매 데이터 추출
    const saleItems = document.querySelectorAll('.item_link--매매');
    saleItems.forEach((item, index) => {
      if (index < datalength2) return;
      
      extractSaleItem(item);
    });
    
    // 데이터 카운트 업데이트
    updateDataCount();
    
    // 오토스크롤
    if (autoScroll) {
      setTimeout(() => {
        window.scrollBy(0, 100);
      }, 300);
    }
  });
  
  const listContainer = document.querySelector('.list_contents');
  if (listContainer) {
    observer.observe(listContainer, {
      childList: true,
      subtree: true
    });
  }
}

// ===== 월세 항목 추출 =====
function extractRentItem(item) {
  try {
    // 가격 정보
    const priceText = item.querySelector('.price')?.textContent || '';
    const deposit = parsePrice(priceText.split('/')[0] || '0');
    const monthlyRent = parsePrice(priceText.split('/')[1] || '0');
    
    // 면적 정보
    const areaText = item.querySelector('.area')?.textContent || '';
    const area = parseFloat(areaText.replace(/[^0-9.]/g, '')) || 0;
    
    // 층 정보
    const floorText = item.querySelector('.floor')?.textContent || '';
    const [currentFloor, totalFloor] = parseFloor(floorText);
    
    // 향 정보
    const direction = item.querySelector('.direction')?.textContent || '-';
    
    // 전환가 계산 (보증금 + (월세 * 12 / 수익률))
    const convertedPrice = deposit + (monthlyRent * 12 / (percentMargin / 100));
    
    // 평단가 계산
    const pricePerPyeong = (convertedPrice / area).toFixed(1);
    
    const data = {
      구분: monthlyRent > 0 ? '월세' : '전세',
      해당층: currentFloor,
      전체층: totalFloor,
      향: direction,
      평단가: parseFloat(pricePerPyeong),
      전용면적: area,
      보증금: deposit,
      월세: monthlyRent,
      전환가: convertedPrice.toFixed(0)
    };
    
    tableData1.push(data);
    tableData1_copy.push(data);
    datalength1 = tableData1.length;
    
    console.log('Rent item extracted:', data);
  } catch (error) {
    console.error('Error extracting rent item:', error);
  }
}

// ===== 매매 항목 추출 =====
function extractSaleItem(item) {
  try {
    // 가격 정보
    const priceText = item.querySelector('.price')?.textContent || '';
    const price = parsePrice(priceText);
    
    // 면적 정보
    const areaText = item.querySelector('.area')?.textContent || '';
    const area = parseFloat(areaText.replace(/[^0-9.]/g, '')) || 0;
    
    // 층 정보
    const floorText = item.querySelector('.floor')?.textContent || '';
    const [currentFloor, totalFloor] = parseFloor(floorText);
    
    // 향 정보
    const direction = item.querySelector('.direction')?.textContent || '-';
    
    // 평단가 계산
    const pricePerPyeong = (price / area).toFixed(1);
    
    const data = {
      구분: '매매',
      해당층: currentFloor,
      전체층: totalFloor,
      향: direction,
      평단가: parseFloat(pricePerPyeong),
      전용면적: area,
      가격: price
    };
    
    tableData2.push(data);
    tableData2_copy.push(data);
    datalength2 = tableData2.length;
    
    console.log('Sale item extracted:', data);
  } catch (error) {
    console.error('Error extracting sale item:', error);
  }
}

// ===== 가격 파싱 유틸리티 =====
function parsePrice(text) {
  text = text.replace(/[^0-9.억만]/g, '');
  
  let price = 0;
  
  if (text.includes('억')) {
    const parts = text.split('억');
    price += parseFloat(parts[0]) * 10000;
    if (parts[1]) {
      price += parseFloat(parts[1].replace('만', '')) || 0;
    }
  } else if (text.includes('만')) {
    price = parseFloat(text.replace('만', ''));
  } else {
    price = parseFloat(text) || 0;
  }
  
  return price;
}

// ===== 층 정보 파싱 =====
function parseFloor(text) {
  text = text.replace(/[^0-9/층-]/g, '');
  
  if (text.includes('/')) {
    const [current, total] = text.split('/');
    return [
      current.replace('층', '') || '0',
      total.replace('층', '') || '0'
    ];
  }
  
  return ['0', '0'];
}

// ===== 요약 테이블 표시 =====
function showSummaryTable() {
  closeTable();
  
  if (!tableData1_copy.length && !tableData2_copy.length) {
    SangaUI.showNotification('표시할 데이터가 없습니다', 'warning');
    return;
  }
  
  const container = SangaUI.createTableContainer({ top: '50px', left: '410px' });
  container.id = 'sanga-summary-container';
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #007bff;
  `;
  
  const headerTitle = document.createElement('h3');
  headerTitle.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: #333;';
  headerTitle.textContent = '📊 매물 요약';
  
  const headerButtons = document.createElement('div');
  headerButtons.style.cssText = 'display: flex; gap: 8px;';
  
  // 복사 버튼
  const copyBtn = SangaUI.createButton('복사', {
    className: 'sanga-btn-secondary',
    onClick: () => {
      const text = container.innerText;
      navigator.clipboard.writeText(text).then(() => {
        SangaUI.showNotification('내용이 복사되었습니다', 'success');
      });
    }
  });
  copyBtn.style.padding = '4px 12px';
  copyBtn.style.fontSize = '12px';
  
  // 닫기 버튼
  const closeBtn = SangaUI.createButton('✕', {
    className: 'sanga-btn-danger',
    onClick: closeTable
  });
  closeBtn.style.padding = '4px 12px';
  closeBtn.style.fontSize = '12px';
  
  headerButtons.appendChild(copyBtn);
  headerButtons.appendChild(closeBtn);
  
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);
  container.appendChild(header);
  
  // 필터 섹션
  const filterSection = createFilterSection();
  container.appendChild(filterSection);
  
  // 요약 테이블
  const summaryTable = createEnhancedSummaryTable();
  container.appendChild(summaryTable);
  
  // 구분선
  const divider = document.createElement('hr');
  divider.style.cssText = 'border: none; border-top: 1px solid #dee2e6; margin: 15px 0;';
  container.appendChild(divider);
  
  // 상세 테이블
  const detailTable = createEnhancedDetailTable();
  container.appendChild(detailTable);
  
  // 페이지에 추가
  const mapWrap = document.querySelector('.map_wrap');
  if (mapWrap) {
    mapWrap.appendChild(container);
  } else {
    document.body.appendChild(container);
  }
  
  tableshowstatus = true;
}

// ===== 필터 섹션 생성 =====
function createFilterSection() {
  const section = document.createElement('div');
  section.style.cssText = `
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  `;
  
  // 거래 유형 선택
  const dealTypes = [
    { value: '전체', label: '전체' },
    { value: '월세', label: '월세' },
    { value: '전세', label: '전세' },
    { value: '매매', label: '매매' }
  ];
  
  const dealSelect = SangaUI.createSelect(
    'sanga-deal-type-select',
    dealTypes,
    '전체',
    () => filterAndDisplayTable()
  );
  
  // 층 선택
  const floorOptions = [
    { value: '전체', label: '전체' },
    { value: '저층', label: '저층 (1-2층)' },
    { value: '중층', label: '중층 (3-5층)' },
    { value: '고층', label: '고층 (6층+)' }
  ];
  
  const floorSelect = SangaUI.createSelect(
    'sanga-floor-select',
    floorOptions,
    '전체',
    () => filterAndDisplayTable()
  );
  
  section.appendChild(dealSelect);
  section.appendChild(floorSelect);
  
  return section;
}

// ===== 필터링 및 테이블 표시 =====
function filterAndDisplayTable() {
  const dealType = document.getElementById('sanga-deal-type-select')?.value || '전체';
  const floorType = document.getElementById('sanga-floor-select')?.value || '전체';
  
  // 데이터 필터링
  let filteredData1 = [...tableData1_copy];
  let filteredData2 = [...tableData2_copy];
  
  // 거래 유형 필터
  if (dealType !== '전체') {
    filteredData1 = filteredData1.filter(item => item.구분 === dealType);
    if (dealType !== '매매') {
      filteredData2 = [];
    }
  }
  
  // 층 필터
  if (floorType !== '전체') {
    const floorFilter = (item) => {
      const floor = parseInt(item.해당층);
      if (floorType === '저층') return floor >= 1 && floor <= 2;
      if (floorType === '중층') return floor >= 3 && floor <= 5;
      if (floorType === '고층') return floor >= 6;
      return true;
    };
    
    filteredData1 = filteredData1.filter(floorFilter);
    filteredData2 = filteredData2.filter(floorFilter);
  }
  
  // 전역 데이터 업데이트
  tableData1 = filteredData1;
  tableData2 = filteredData2;
  
  // 테이블 새로고침
  refreshTable();
}

// ===== 요약 테이블 생성 =====
function createEnhancedSummaryTable() {
  const data = [];
  
  // 1층 데이터
  const floor1Data = tableData1.filter(item => item.해당층 === '1');
  if (floor1Data.length > 0) {
    const prices = floor1Data.map(item => item.평단가);
    data.push({
      구분: '1층',
      최소: Math.min(...prices).toFixed(1),
      평균: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
      최대: Math.max(...prices).toFixed(1),
      건수: prices.length
    });
  }
  
  // 2층 데이터
  const floor2Data = tableData1.filter(item => item.해당층 === '2');
  if (floor2Data.length > 0) {
    const prices = floor2Data.map(item => item.평단가);
    data.push({
      구분: '2층',
      최소: Math.min(...prices).toFixed(1),
      평균: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
      최대: Math.max(...prices).toFixed(1),
      건수: prices.length
    });
  }
  
  // 상층 데이터
  const upperFloorData = tableData1.filter(item => Number(item.해당층) >= 3);
  if (upperFloorData.length > 0) {
    const prices = upperFloorData.map(item => item.평단가);
    data.push({
      구분: '상층',
      최소: Math.min(...prices).toFixed(1),
      평균: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
      최대: Math.max(...prices).toFixed(1),
      건수: prices.length
    });
  }
  
  // 매매 데이터
  if (tableData2.length > 0) {
    const prices = tableData2.map(item => item.평단가);
    data.push({
      구분: '매매',
      최소: Math.min(...prices).toFixed(1),
      평균: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
      최대: Math.max(...prices).toFixed(1),
      건수: prices.length
    });
  }
  
  const table = SangaUI.createTable(
    ['구분', '최소', '평균', '최대', '건수'],
    data,
    {
      rowClassifier: (row) => {
        if (row.구분 === '매매') return 'sale-row';
        return 'rent-row';
      }
    }
  );
  
  return table;
}

// ===== 상세 테이블 생성 =====
function createEnhancedDetailTable() {
  const allData = [...tableData1, ...tableData2];
  
  // 정렬
  if (floorsorting) {
    allData.sort((a, b) => {
      if (a.해당층 !== b.해당층) {
        return parseInt(a.해당층) - parseInt(b.해당층);
      }
      return dangaAsc ? a.평단가 - b.평단가 : b.평단가 - a.평단가;
    });
  } else {
    allData.sort((a, b) => {
      if (a.향 !== b.향) {
        return a.향.localeCompare(b.향);
      }
      return dangaAsc ? a.평단가 - b.평단가 : b.평단가 - a.평단가;
    });
  }
  
  const tableData = allData.map(item => {
    const row = {
      구분: item.구분,
      층: `${item.해당층}/${item.전체층}`,
      향: item.향,
      평단가: item.평단가 + '만',
      면적: item.전용면적 + '㎡'
    };
    
    if (item.구분 === '매매') {
      row.가격 = item.가격 + '만';
    } else {
      row.보증금 = item.보증금 + '만';
      if (item.월세 > 0) {
        row.월세 = item.월세 + '만';
      }
      row.전환가 = item.전환가 + '만';
    }
    
    return row;
  });
  
  // 헤더 동적 생성
  const headers = ['구분', '층', '향', '평단가', '면적'];
  if (tableData1.length > 0) {
    headers.push('보증금', '월세', '전환가');
  }
  if (tableData2.length > 0 && tableData1.length === 0) {
    headers.push('가격');
  }
  
  const table = SangaUI.createTable(
    headers,
    tableData,
    {
      rowClassifier: (row) => {
        return row.구분 === '매매' ? 'sale-row' : 'rent-row';
      },
      onRowClick: (row) => {
        console.log('Selected row:', row);
      }
    }
  );
  
  return table;
}

// ===== 테이블 새로고침 =====
function refreshTable() {
  if (!tableshowstatus) return;
  
  const container = document.getElementById('sanga-summary-container');
  if (!container) return;
  
  // 기존 테이블들 제거
  const tables = container.querySelectorAll('.sanga-table');
  tables.forEach(table => table.remove());
  
  // 새 테이블 생성
  const summaryTable = createEnhancedSummaryTable();
  const detailTable = createEnhancedDetailTable();
  
  // 필터 섹션 다음에 삽입
  const filterSection = container.querySelector('div');
  if (filterSection) {
    filterSection.parentNode.insertBefore(summaryTable, filterSection.nextSibling);
    
    // 구분선
    const divider = document.createElement('hr');
    divider.style.cssText = 'border: none; border-top: 1px solid #dee2e6; margin: 15px 0;';
    summaryTable.parentNode.insertBefore(divider, summaryTable.nextSibling);
    
    divider.parentNode.insertBefore(detailTable, divider.nextSibling);
  }
}

// ===== 테이블 닫기 =====
function closeTable() {
  const container = document.getElementById('sanga-summary-container');
  if (container) {
    container.remove();
  }
  tableshowstatus = false;
  
  // 요약표 버튼 상태 업데이트
  const summaryBtn = document.querySelector('.sanga-btn-group button');
  if (summaryBtn && summaryBtn.textContent.includes('표닫기')) {
    summaryBtn.className = 'sanga-btn sanga-btn-primary';
    summaryBtn.innerHTML = '<span>📊</span><span>요약표</span>';
  }
}

// ===== 평형 분석 모달 =====
function openPyeongAnalysisModal() {
  if (!tableData1_copy.length && !tableData2_copy.length) {
    SangaUI.showNotification('분석할 데이터가 없습니다', 'warning');
    return;
  }
  
  const content = createPyeongAnalysisContent();
  
  const modal = SangaUI.createModal(
    '📈 평형별 분석',
    content,
    {
      width: '800px',
      buttons: [
        {
          text: 'Excel 내보내기',
          className: 'sanga-btn-success',
          onClick: () => {
            exportToExcel();
          },
          closeOnClick: false
        },
        {
          text: '닫기',
          className: 'sanga-btn-secondary'
        }
      ]
    }
  );
  
  document.body.appendChild(modal);
}

// ===== 평형 분석 컨텐츠 생성 =====
function createPyeongAnalysisContent() {
  const container = document.createElement('div');
  
  const allData = [...tableData1_copy, ...tableData2_copy];
  const grouped = {};
  
  allData.forEach(item => {
    const area = item.전용면적;
    const floor = item.해당층;
    
    let floorGroup;
    if (floor === '1') floorGroup = '1층';
    else if (floor === '2') floorGroup = '2층';
    else if (parseInt(floor) >= 3) floorGroup = '상층';
    else floorGroup = '기타';
    
    // 5평 단위로 그룹화
    const pyeongGroup = Math.floor(area / 5) * 5 + '-' + (Math.floor(area / 5) * 5 + 4) + '평';
    
    if (!grouped[floorGroup]) grouped[floorGroup] = {};
    if (!grouped[floorGroup][pyeongGroup]) {
      grouped[floorGroup][pyeongGroup] = { 
        count: 0, 
        sum: 0, 
        min: Infinity, 
        max: -Infinity,
        items: []
      };
    }
    
    grouped[floorGroup][pyeongGroup].count++;
    grouped[floorGroup][pyeongGroup].sum += item.평단가;
    grouped[floorGroup][pyeongGroup].min = Math.min(grouped[floorGroup][pyeongGroup].min, item.평단가);
    grouped[floorGroup][pyeongGroup].max = Math.max(grouped[floorGroup][pyeongGroup].max, item.평단가);
    grouped[floorGroup][pyeongGroup].items.push(item);
  });
  
  // 층별 카드 생성
  Object.keys(grouped).sort().forEach(floorGroup => {
    const card = SangaUI.createCard(
      `${floorGroup} 평형별 분석 (총 ${Object.values(grouped[floorGroup]).reduce((sum, g) => sum + g.count, 0)}건)`,
      createPyeongTable(grouped[floorGroup])
    );
    container.appendChild(card);
  });
  
  // 전체 통계
  const totalStats = document.createElement('div');
  totalStats.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
  `;
  
  const totalCount = allData.length;
  const avgPrice = (allData.reduce((sum, item) => sum + item.평단가, 0) / totalCount).toFixed(1);
  const minPrice = Math.min(...allData.map(item => item.평단가)).toFixed(1);
  const maxPrice = Math.max(...allData.map(item => item.평단가)).toFixed(1);
  
  totalStats.innerHTML = `
    <h4 style="margin: 0 0 10px 0; font-size: 14px;">전체 통계</h4>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px;">
      <div>총 건수: <strong>${totalCount}</strong></div>
      <div>평균: <strong>${avgPrice}만</strong></div>
      <div>최소: <strong>${minPrice}만</strong></div>
      <div>최대: <strong>${maxPrice}만</strong></div>
    </div>
  `;
  
  container.appendChild(totalStats);
  
  return container;
}

// ===== 평형 테이블 생성 =====
function createPyeongTable(data) {
  const tableData = [];
  
  Object.keys(data).sort().forEach(pyeong => {
    const { count, sum, min, max } = data[pyeong];
    const avg = (sum / count).toFixed(1);
    
    tableData.push({
      평형: pyeong,
      건수: count + '건',
      최소: min.toFixed(1) + '만',
      평균: avg + '만',
      최대: max.toFixed(1) + '만',
      편차: (max - min).toFixed(1) + '만'
    });
  });
  
  return SangaUI.createTable(
    ['평형', '건수', '최소', '평균', '최대', '편차'],
    tableData,
    {
      rowClassifier: (row) => {
        const count = parseInt(row.건수);
        if (count >= 5) return 'sale-row';
        if (count >= 3) return 'rent-row';
        return '';
      }
    }
  );
}

// ===== Excel 내보내기 =====
function exportToExcel() {
  try {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // 헤더
    csvContent += "구분,층,향,평단가,면적,보증금,월세,전환가,가격\n";
    
    // 데이터
    const allData = [...tableData1_copy, ...tableData2_copy];
    allData.forEach(item => {
      const row = [
        item.구분,
        `${item.해당층}/${item.전체층}`,
        item.향,
        item.평단가,
        item.전용면적,
        item.보증금 || '',
        item.월세 || '',
        item.전환가 || '',
        item.가격 || ''
      ];
      csvContent += row.join(',') + "\n";
    });
    
    // 다운로드
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sanga_data_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    SangaUI.showNotification('Excel 파일이 다운로드되었습니다', 'success');
  } catch (error) {
    console.error('Export error:', error);
    SangaUI.showNotification('내보내기 중 오류가 발생했습니다', 'error');
  }
}

// ===== 데이터 초기화 =====
function resetAllData() {
  propertyData = [];
  propertyData2 = [];
  tableData1 = [];
  tableData2 = [];
  tableData1_copy = [];
  tableData2_copy = [];
  datalength1 = 0;
  datalength2 = 0;
  
  closeTable();
  updateDataCount();
  
  console.log('All data reset');
}

// ===== 경매 사이트 데이터 추출 (Auction1) =====
function extractAuction1Data() {
  console.log('Extracting Auction1 data...');
  
  // Auction1 전용 로직
  const observer = new MutationObserver(() => {
    if (!onoffstatus) return;
    
    const items = document.querySelectorAll('.auction-item');
    items.forEach((item, index) => {
      if (index < datalength1) return;
      
      try {
        const priceText = item.querySelector('.price')?.textContent || '';
        const price = parsePrice(priceText);
        
        const areaText = item.querySelector('.area')?.textContent || '';
        const area = parseFloat(areaText.replace(/[^0-9.]/g, '')) || 0;
        
        const pricePerPyeong = area > 0 ? (price / area).toFixed(1) : 0;
        
        const data = {
          구분: '경매',
          해당층: '1',
          전체층: '1',
          향: '-',
          평단가: parseFloat(pricePerPyeong),
          전용면적: area,
          가격: price
        };
        
        tableData2.push(data);
        tableData2_copy.push(data);
        datalength1++;
      } catch (error) {
        console.error('Error extracting auction item:', error);
      }
    });
    
    updateDataCount();
  });
  
  const listContainer = document.querySelector('.auction-list');
  if (listContainer) {
    observer.observe(listContainer, {
      childList: true,
      subtree: true
    });
  }
}

// ===== Tank Auction 데이터 추출 =====
function extractTankAuctionData() {
  console.log('Extracting Tank Auction data...');
  // Tank Auction 전용 로직 구현
  // Auction1과 유사한 구조
}

// ===== 아실콘 데이터 추출 =====
function extractAsilData() {
  console.log('Extracting Asil data...');
  // 아실콘 전용 로직 구현
}

// ===== 마이프랜차이즈 데이터 추출 =====
function extractMyFranchiseData() {
  console.log('Extracting MyFranchise data...');
  // 마이프랜차이즈 전용 로직 구현
}

// ===== 페이지 가시성 변경 감지 =====
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

// ===== 키보드 단축키 =====
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+S: 요약표 토글
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    if (tableshowstatus) {
      closeTable();
    } else {
      showSummaryTable();
    }
  }
  
  // Ctrl+Shift+A: 평형분석
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    openPyeongAnalysisModal();
  }
  
  // Ctrl+Shift+R: 데이터 새로고침
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    startPropertyExtraction();
    SangaUI.showNotification('데이터를 다시 불러옵니다', 'success');
  }
  
  // Ctrl+Shift+D: 데이터 초기화
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
      resetAllData();
      SangaUI.showNotification('데이터가 초기화되었습니다', 'success');
    }
  }
});

// ===== URL 변경 감지 (SPA 대응) =====
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed:', url);
    
    // 연속처리가 아니면 데이터 초기화
    if (!contiStatus) {
      resetAllData();
    }
    
    // 새로운 페이지 데이터 추출
    startPropertyExtraction();
  }
}).observe(document, { subtree: true, childList: true });

// ===== 에러 핸들링 =====
window.addEventListener('error', (e) => {
  console.error('SanGa Error:', e.error);
  
  // 심각한 에러의 경우 사용자에게 알림
  if (e.error && e.error.message) {
    if (e.error.message.includes('SangaUI')) {
      SangaUI.showNotification('UI 로드 중 오류가 발생했습니다', 'error');
    }
  }
});

// ===== 확장 프로그램 설치/업데이트 감지 =====
chrome.runtime.onInstalled?.addListener?.((details) => {
  if (details.reason === 'install') {
    console.log('SanGa installed!');
    // 기본 설정 저장
    saveConfig({
      onoffstatus: true,
      autoScroll: true,
      contiStatus: false,
      floorsorting: true,
      dangaAsc: true,
      percentMargin: 6.5
    }, () => {
      console.log('Default config saved');
    });
  } else if (details.reason === 'update') {
    console.log('SanGa updated to', chrome.runtime.getManifest().version);
  }
});

// ===== 디버그 모드 =====
const DEBUG_MODE = false; // 개발 시 true로 변경

if (DEBUG_MODE) {
  console.log('=== SanGa Debug Mode ===');
  
  // 전역 디버그 함수
  window.sangaDebug = {
    getConfig: () => {
      getConfig(config => console.log('Current config:', config));
    },
    getData: () => {
      console.log('Rent data:', tableData1_copy);
      console.log('Sale data:', tableData2_copy);
    },
    resetData: () => {
      resetAllData();
      console.log('Data reset');
    },
    showTable: () => {
      showSummaryTable();
    },
    closeTable: () => {
      closeTable();
    },
    exportData: () => {
      exportToExcel();
    }
  };
  
  console.log('Debug functions available: window.sangaDebug');
}

// ===== 초기화 실행 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSangaUI);
} else {
  initializeSangaUI();
}

// ===== 로그 =====
console.log('🏠 SanGa v2.0 Content Script Loaded');
console.log('Current URL:', window.location.href);
console.log('SangaUI available:', typeof SangaUI !== 'undefined');