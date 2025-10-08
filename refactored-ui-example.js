// ===== 개선된 UI를 적용한 주요 함수들 =====

// 초기화 함수
function initializeSangaUI() {
  // 스타일 주입
  SangaUI.injectStyles();
  
  // 설정 불러오기
  getConfig(config => {
    onoffstatus = config.onoffstatus;
    autoScroll = config.autoScroll;
    contiStatus = config.contiStatus;
    floorsorting = config.floorsorting;
    dangaAsc = config.dangaAsc;
    percentMargin = config.percentMargin;
    
    // UI 생성
    createMainControlPanel();
  });
}

// 메인 컨트롤 패널 생성 (개선된 버전)
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
  `;
  title.textContent = '🏠 산가 설정';
  panel.appendChild(title);
  
  // 1. 프로그램 ON/OFF 토글
  const { container: programToggle, input: programInput } = SangaUI.createToggleSwitch(
    'sanga-program-toggle',
    '프로그램',
    onoffstatus,
    function(e) {
      onoffstatus = e.target.checked;
      
      if (!onoffstatus) {
        // 테이블 제거
        const tables = document.querySelectorAll('.sanga-table-container, #summaryTableId, #listTableId');
        tables.forEach(table => table.remove());
        
        SangaUI.showNotification('프로그램이 비활성화되었습니다', 'success');
      } else {
        SangaUI.showNotification('프로그램이 활성화되었습니다', 'success');
      }
      
      // 설정 저장
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
        autoScroll ? '오토스크롤이 활성화되었습니다' : '오토스크롤이 비활성화되었습니다',
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
        summaryBtn.querySelector('span:last-child').textContent = '📊 요약표';
      } else {
        showSummaryTable();
        summaryBtn.className = 'sanga-btn sanga-btn-danger';
        summaryBtn.querySelector('span:last-child').textContent = '✕ 표닫기';
      }
    }
  });
  buttonGroup.appendChild(summaryBtn);
  
  // 평형분석 버튼
  const analysisBtn = SangaUI.createButton('📈 평형분석', {
    className: 'sanga-btn-secondary',
    onClick: () => {
      openPyeongAnalysisModal();
    }
  });
  buttonGroup.appendChild(analysisBtn);
  
  // 초기화 버튼
  const resetBtn = SangaUI.createButton('🔄 초기화', {
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

// 요약 테이블 표시 (개선된 버전)
function showSummaryTable() {
  // 기존 테이블 제거
  closeTable();
  
  if (!tableData1_copy.length && !tableData2_copy.length) {
    SangaUI.showNotification('표시할 데이터가 없습니다', 'warning');
    return;
  }
  
  // 테이블 컨테이너 생성
  const container = SangaUI.createTableContainer({ top: '50px', left: '410px' });
  container.id = 'sanga-summary-container';
  
  // 헤더 생성
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
  
  // 필터 선택 UI
  const filterSection = createFilterSection();
  container.appendChild(filterSection);
  
  // 요약 테이블 생성
  const summaryTable = createEnhancedSummaryTable();
  container.appendChild(summaryTable);
  
  // 구분선
  const divider = document.createElement('hr');
  divider.style.cssText = 'border: none; border-top: 1px solid #dee2e6; margin: 15px 0;';
  container.appendChild(divider);
  
  // 상세 리스트 테이블
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

// 필터 섹션 생성
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
    { value: '매매', label: '매매' }
  ];
  
  const dealSelect = SangaUI.createSelect(
    'sanga-deal-type-select',
    dealTypes,
    '전체',
    (e) => {
      const floorValue = document.getElementById('sanga-floor-select').value;
      filterAndDisplayTable(e.target.value, floorValue);
    }
  );
  
  // 층 선택
  const floorOptions = [
    { value: '전체', label: '전체' },
    { value: '저층', label: '저층 (1-2층)' },
    { value: '상층', label: '상층 (3층+)' }
  ];
  
  // 실제 층 데이터에서 옵션 추가
  const floors = [...new Set([...tableData1_copy, ...tableData2_copy]
    .map(item => item.해당층)
    .filter(floor => floor))];
  
  floors.sort((a, b) => a - b).forEach(floor => {
    floorOptions.push({ value: floor, label: `${floor}층` });
  });
  
  const floorSelect = SangaUI.createSelect(
    'sanga-floor-select',
    floorOptions,
    '전체',
    (e) => {
      const dealValue = document.getElementById('sanga-deal-type-select').value;
      filterAndDisplayTable(dealValue, e.target.value);
    }
  );
  
  section.appendChild(dealSelect);
  section.appendChild(floorSelect);
  
  return section;
}

// 개선된 요약 테이블
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

// 개선된 상세 테이블
function createEnhancedDetailTable() {
  const allData = [...tableData1, ...tableData2];
  
  // 정렬
  if (floorsorting) {
    allData.sort((a, b) => {
      if (a.해당층 !== b.해당층) {
        return a.해당층 - b.해당층;
      }
      return dangaAsc ? a.평단가 - b.평단가 : b.평단가 - a.평단가;
    });
  } else {
    allData.sort((a, b) => dangaAsc ? a.평단가 - b.평단가 : b.평단가 - a.평단가);
  }
  
  const table = SangaUI.createTable(
    ['구분', '층', '향', '평단가', '면적', '가격'],
    allData.map(item => ({
      ...item,
      층: `${item.해당층}/${item.전체층}`,
      면적: item.전용면적 + '㎡'
    })),
    {
      rowClassifier: (row) => {
        return row.구분 === '매매' ? 'sale-row' : 'rent-row';
      }
    }
  );
  
  return table;
}

// 평형분석 모달 열기
function openPyeongAnalysisModal() {
  if (!tableData1.length && !tableData2.length) {
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
          text: '닫기',
          className: 'sanga-btn-secondary'
        }
      ]
    }
  );
  
  document.body.appendChild(modal);
}

// 평형분석 컨텐츠 생성
function createPyeongAnalysisContent() {
  const container = document.createElement('div');
  
  const allData = [...tableData1, ...tableData2];
  const grouped = {};
  
  allData.forEach(item => {
    const pyeong = item.전용면적;
    const floor = item.해당층;
    
    let floorGroup;
    if (floor === '1') floorGroup = '1층';
    else if (floor === '2') floorGroup = '2층';
    else if (floor >= 3) floorGroup = '상층';
    else floorGroup = floor;
    
    const pyeongGroup = Math.floor(pyeong / 10) * 10 + '평';
    
    if (!grouped[floorGroup]) grouped[floorGroup] = {};
    if (!grouped[floorGroup][pyeongGroup]) {
      grouped[floorGroup][pyeongGroup] = { count: 0, sum: 0 };
    }
    
    grouped[floorGroup][pyeongGroup].count++;
    grouped[floorGroup][pyeongGroup].sum += item.평단가;
  });
  
  Object.keys(grouped).forEach(floorGroup => {
    const card = SangaUI.createCard(
      `${floorGroup} 평형별 분석`,
      createPyeongTable(grouped[floorGroup])
    );
    container.appendChild(card);
  });
  
  return container;
}

// 평형 테이블 생성
function createPyeongTable(data) {
  const tableData = [];
  
  Object.keys(data).sort().forEach(pyeong => {
    const { count, sum } = data[pyeong];
    const avg = (sum / count).toFixed(1);
    
    tableData.push({
      평형: pyeong,
      건수: count,
      평균단가: avg + '만원'
    });
  });
  
  return SangaUI.createTable(
    ['평형', '건수', '평균단가'],
    tableData
  );
}

// 테이블 닫기
function closeTable() {
  const container = document.getElementById('sanga-summary-container');
  if (container) {
    container.remove();
  }
  tableshowstatus = false;
}

// 데이터 초기화
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
}

// 설정 업데이트 헬퍼
function updateConfig(updates) {
  getConfig(config => {
    const newConfig = { ...config, ...updates };
    saveConfig(newConfig, () => {
      console.log('Config updated:', newConfig);
    });
  });
}

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSangaUI);
} else {
  initializeSangaUI();
}