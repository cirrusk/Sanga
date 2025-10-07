// SanGa Pro - Content Script
// Modern ES6+ 부동산 분석 엔진

class SanGaAnalyzer {
  constructor() {
    this.config = {
      enabled: true,
      autoScroll: true,  // 자동 스크롤 기본값
      profitMargin: 6.5,
      theme: 'light'
    };
    this.propertyData = [];
    this.ui = null;
    this.scrolling = false;  // 스크롤 상태 추가
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.detectSite();
    this.injectUI();
    this.startObserving();
    
    // 🆕 초기 자동 스크롤 실행
    if (this.config.autoScroll && this.config.enabled) {
      setTimeout(() => this.autoScroll(), 2000);
    }
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['config'], (result) => {
        if (result.config) {
          this.config = { ...this.config, ...result.config };
        }
        resolve();
      });
    });
  }

  async saveConfig() {
    return chrome.storage.local.set({ config: this.config });
  }

  // 🆕 자동 스크롤 함수
  async autoScroll() {
    if (!this.config.autoScroll || this.scrolling) {
      console.log('⏸️ 자동 스크롤 비활성화 또는 이미 실행 중');
      return;
    }

    const container = this.getScrollContainer();
    if (!container) {
      console.log('❌ 스크롤 컨테이너를 찾을 수 없습니다');
      return;
    }

    this.scrolling = true;
    console.log('🚀 자동 스크롤 시작...');

    let scrollCount = 0;
    const maxScrolls = 100;
    const scrollDelay = 400;
    const scrollAmount = 800;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const currentScroll = container.scrollTop;
        const maxScroll = container.scrollHeight - container.clientHeight;
        
        // 로딩 중인 항목 확인
        const loadingItems = document.querySelectorAll('.item_inner.is-loading');
        const hasLoading = loadingItems.length > 0;
        
        // 종료 조건
        if ((currentScroll >= maxScroll - 10 && !hasLoading) || scrollCount >= maxScrolls) {
          clearInterval(interval);
          this.scrolling = false;
          console.log(`✅ 자동 스크롤 완료: ${scrollCount}회, 매물 ${this.propertyData.length}개`);
          resolve();
          return;
        }
        
        // 스크롤 실행
        container.scrollTop = currentScroll + scrollAmount;
        scrollCount++;
        
        if (scrollCount % 10 === 0) {
          console.log(`📜 스크롤 진행중... ${scrollCount}/${maxScrolls}`);
        }
      }, scrollDelay);
    });
  }

  // 🆕 스크롤 컨테이너 찾기
  getScrollContainer() {
    return document.querySelector('#list_body') || 
           document.querySelector('.item_list--article') ||
           document.querySelector('.map_fixed_area_inner');
  }

  detectSite() {
    const url = window.location.href;
    
    if (url.includes('new.land.naver.com') || url.includes('m.land.naver.com')) {
      this.site = 'naver';
      this.analyzer = new NaverAnalyzer(this);
    } else if (url.includes('auction1.co.kr')) {
      this.site = 'auction1';
      this.analyzer = new Auction1Analyzer(this);
    } else if (url.includes('tankauction.com')) {
      this.site = 'tank';
      this.analyzer = new TankAnalyzer(this);
    } else if (url.includes('asil.kr')) {
      this.site = 'asil';
      this.analyzer = new AsilAnalyzer(this);
    } else if (url.includes('myfranchise.kr')) {
      this.site = 'myfranchise';
      this.analyzer = new MyFranchiseAnalyzer(this);
    }
  }

  injectUI() {
    if (!this.config.enabled) return;

    // 메인 UI 컨테이너 생성
    this.ui = new SanGaUI(this);
    this.ui.render();
  }

  startObserving() {
    if (!this.analyzer) return;

    const observer = new MutationObserver((mutations) => {
      this.analyzer.analyze();
    });

    const target = this.analyzer.getObserverTarget();
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true
      });
    }
  }

  calculatePyeongPrice(price, area) {
    // 평당가 = 가격 / (면적 * 10,000)
    return Math.round(price / (area * 10000));
  }

  calculateROI(monthlyRent, salesPrice) {
    // 수익률 = (월세 * 12) / 매매가 * 100
    return ((monthlyRent * 12) / salesPrice * 100).toFixed(2);
  }

  calculateConversionPrice(monthlyRent) {
    // 전세 전환가 = 월세 * 12 * 100 / 이율(6.5%)
    return Math.round(monthlyRent * 12 * 100 / this.config.profitMargin / 10000);
  }
}

// 네이버 부동산 분석기
class NaverAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }

  getObserverTarget() {
    return document.querySelector('.item_list--article') || 
           document.querySelector('.map_wrap');
  }

  analyze() {
    const items = document.querySelectorAll('.item_inner:not(.is-loading)');
    const data = [];

    items.forEach(item => {
      const property = this.extractPropertyData(item);
      if (property) {
        data.push(property);
        this.injectPriceTag(item, property);
      }
    });

    this.parent.propertyData = data;
    this.parent.ui?.update(data);
  }

  extractPropertyData(item) {
    try {
      const typeEl = item.querySelector('.type');
      const priceEl = item.querySelector('.price');
      const specEl = item.querySelector('.spec');

      if (!typeEl || !priceEl || !specEl) return null;

      const type = typeEl.textContent.trim();
      const priceText = priceEl.textContent.trim().replace(/,/g, '');
      const specText = specEl.textContent.trim();

      // 가격 파싱
      const prices = this.parsePrice(priceText);
      
      // 면적 파싱
      const areaMatch = specText.match(/(\d+)m²/);
      const area = areaMatch ? parseFloat(areaMatch[1]) * 0.3025 : 0;

      // 층수 파싱
      const floorMatch = specText.match(/(\d+)\/(\d+)층/);
      const floor = floorMatch ? parseInt(floorMatch[1]) : 0;
      const totalFloor = floorMatch ? parseInt(floorMatch[2]) : 0;

      // 방향 파싱
      const specs = specText.split(',').map(s => s.trim());
      const direction = specs[2] || '';

      return {
        type,
        price: prices.main,
        deposit: prices.deposit,
        monthlyRent: prices.monthly,
        area: parseFloat(area.toFixed(2)),
        floor,
        totalFloor,
        direction,
        pyeongPrice: 0,
        roi: 0
      };
    } catch (error) {
      console.error('Error extracting property data:', error);
      return null;
    }
  }

  parsePrice(priceText) {
    const result = { main: 0, deposit: 0, monthly: 0 };

    // 억 단위 파싱
    const billion = /(\d+)억\s*(\d+)?/;
    const parts = priceText.split('/');

    parts.forEach((part, index) => {
      const match = part.match(billion);
      if (match) {
        const value = parseInt(match[1]) * 10000 + (match[2] ? parseInt(match[2]) : 0);
        if (index === 0) {
          result.deposit = value;
        } else {
          result.monthly = value;
        }
      } else {
        const num = parseInt(part.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) {
          if (index === 0) result.main = num;
          if (index === 1) result.monthly = num;
        }
      }
    });

    result.main = result.main || result.deposit;
    return result;
  }

  injectPriceTag(item, property) {
    const priceEl = item.querySelector('.price');
    if (!priceEl || priceEl.dataset.injected) return;

    const pyeongPrice = this.parent.calculatePyeongPrice(
      property.monthlyRent || property.price,
      property.area
    );

    const tag = document.createElement('span');
    tag.className = 'sanga-price-tag';
    tag.style.cssText = `
      margin-left: 8px;
      padding: 2px 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      opacity: 0.9;
      display: inline-block;
    `;
    tag.textContent = `${property.area.toFixed(1)}평 @ ${pyeongPrice.toLocaleString()}만`;

    priceEl.appendChild(tag);
    priceEl.dataset.injected = 'true';
  }
}

// 경매1번가 분석기
class Auction1Analyzer {
  constructor(parent) {
    this.parent = parent;
  }

  getObserverTarget() {
    return document.querySelector('#list_body');
  }

  analyze() {
    // 경매1번가 전용 분석 로직
    console.log('Auction1 analyzing...');
  }
}

// 탱크경매 분석기
class TankAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }

  getObserverTarget() {
    return document.body;
  }

  analyze() {
    console.log('Tank analyzing...');
  }
}

// 아실콘 분석기
class AsilAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }

  getObserverTarget() {
    return document.body;
  }

  analyze() {
    console.log('Asil analyzing...');
  }
}

// 마이프랜차이즈 분석기
class MyFranchiseAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }

  getObserverTarget() {
    return document.body;
  }

  analyze() {
    console.log('MyFranchise analyzing...');
  }
}

// UI 관리 클래스
class SanGaUI {
  constructor(analyzer) {
    this.analyzer = analyzer;
    this.container = null;
  }

  render() {
    this.container = document.createElement('div');
    this.container.id = 'sanga-pro-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 380px;
      max-height: 80vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      z-index: 999999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all 0.3s ease;
    `;

    this.container.innerHTML = `
      <div class="sanga-header" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        color: white;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">
            🏠 SanGa Pro
          </h2>
          <button id="sanga-close" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
          ">×</button>
        </div>
        <div style="margin-top: 10px; font-size: 13px; opacity: 0.9;">
          부동산 투자 분석 대시보드
        </div>
      </div>

      <div class="sanga-controls" style="padding: 16px; background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
          <button class="sanga-btn" data-action="analyze" style="
            flex: 1;
            padding: 10px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
          ">
            📊 분석 실행
          </button>
          <button class="sanga-btn" data-action="export" style="
            flex: 1;
            padding: 10px 16px;
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
          ">
            💾 데이터 복사
          </button>
        </div>
        
        <!-- 🆕 자동 스크롤 토글 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px;">
          <span style="font-size: 13px; color: #666; font-weight: 600;">🔄 자동 스크롤</span>
          <label class="toggle-switch" style="
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;
          ">
            <input type="checkbox" id="auto-scroll-toggle" ${this.analyzer.config.autoScroll ? 'checked' : ''} style="
              opacity: 0;
              width: 0;
              height: 0;
            ">
            <span class="slider" style="
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: ${this.analyzer.config.autoScroll ? '#667eea' : '#ccc'};
              transition: 0.3s;
              border-radius: 24px;
            ">
              <span style="
                position: absolute;
                content: '';
                height: 18px;
                width: 18px;
                left: ${this.analyzer.config.autoScroll ? '26px' : '3px'};
                bottom: 3px;
                background-color: white;
                transition: 0.3s;
                border-radius: 50%;
              "></span>
            </span>
          </label>
        </div>
      </div>

      <div class="sanga-content" style="
        padding: 20px;
        max-height: 500px;
        overflow-y: auto;
      ">
        <div id="sanga-summary" style="margin-bottom: 20px;">
          <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #333;">
            📈 요약 통계
          </h3>
          <div class="stats-grid" style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          ">
            <div class="stat-card" style="
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              padding: 16px;
              border-radius: 12px;
              color: white;
            ">
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">총 매물</div>
              <div style="font-size: 24px; font-weight: 700;" id="total-count">0</div>
            </div>
            <div class="stat-card" style="
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              padding: 16px;
              border-radius: 12px;
              color: white;
            ">
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">평균 평단가</div>
              <div style="font-size: 24px; font-weight: 700;" id="avg-price">-</div>
            </div>
            <div class="stat-card" style="
              background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
              padding: 16px;
              border-radius: 12px;
              color: white;
            ">
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">최저가</div>
              <div style="font-size: 20px; font-weight: 700;" id="min-price">-</div>
            </div>
            <div class="stat-card" style="
              background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
              padding: 16px;
              border-radius: 12px;
              color: white;
            ">
              <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">최고가</div>
              <div style="font-size: 20px; font-weight: 700;" id="max-price">-</div>
            </div>
          </div>
        </div>

        <div id="sanga-table-container">
          <!-- 테이블이 여기에 렌더링됩니다 -->
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.attachEventListeners();
  }

  attachEventListeners() {
    const closeBtn = this.container.querySelector('#sanga-close');
    closeBtn.addEventListener('click', () => {
      this.container.style.transform = 'translateY(-50%) translateX(500px)';
      setTimeout(() => this.container.remove(), 300);
    });

    const analyzeBtn = this.container.querySelector('[data-action="analyze"]');
    analyzeBtn.addEventListener('click', () => {
      this.analyzer.analyzer?.analyze();
    });

    const exportBtn = this.container.querySelector('[data-action="export"]');
    exportBtn.addEventListener('click', () => {
      this.exportData();
    });

    // 🆕 자동 스크롤 토글 이벤트
    const autoScrollToggle = this.container.querySelector('#auto-scroll-toggle');
    const slider = this.container.querySelector('.slider');
    const knob = slider.querySelector('span');
    
    autoScrollToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      this.analyzer.config.autoScroll = enabled;
      
      // UI 업데이트
      slider.style.backgroundColor = enabled ? '#667eea' : '#ccc';
      knob.style.left = enabled ? '26px' : '3px';
      
      // 설정 저장
      await this.analyzer.saveConfig();
      console.log(`🔄 자동 스크롤: ${enabled ? 'ON' : 'OFF'}`);
      
      // 켜면 즉시 실행
      if (enabled) {
        setTimeout(() => this.analyzer.autoScroll(), 500);
      }
    });
  }

  update(data) {
    if (!data || data.length === 0) return;

    // 통계 업데이트
    const pyeongPrices = data
      .filter(d => d.area > 0)
      .map(d => this.analyzer.calculatePyeongPrice(d.monthlyRent || d.price, d.area));

    const totalCount = data.length;
    const avgPrice = Math.round(pyeongPrices.reduce((a, b) => a + b, 0) / pyeongPrices.length);
    const minPrice = Math.min(...pyeongPrices);
    const maxPrice = Math.max(...pyeongPrices);

    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('avg-price').textContent = avgPrice.toLocaleString() + '만';
    document.getElementById('min-price').textContent = minPrice.toLocaleString() + '만';
    document.getElementById('max-price').textContent = maxPrice.toLocaleString() + '만';

    // 테이블 렌더링
    this.renderTable(data);
  }

  renderTable(data) {
    const container = document.getElementById('sanga-table-container');
    
    const html = `
      <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #333;">
        📋 매물 목록
      </h3>
      <div style="
        background: white;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e9ecef;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #666;">구분</th>
              <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #666;">층</th>
              <th style="padding: 12px 8px; text-align: right; font-size: 12px; font-weight: 600; color: #666;">평단가</th>
            </tr>
          </thead>
          <tbody>
            ${data.slice(0, 20).map((item, index) => {
              const pyeongPrice = this.analyzer.calculatePyeongPrice(
                item.monthlyRent || item.price,
                item.area
              );
              return `
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="padding: 12px 8px;">
                    <div style="font-size: 13px; font-weight: 600; color: #333;">${item.type}</div>
                    <div style="font-size: 11px; color: #999; margin-top: 2px;">${item.area.toFixed(1)}평</div>
                  </td>
                  <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #666;">
                    ${item.floor}/${item.totalFloor}
                  </td>
                  <td style="padding: 12px 8px; text-align: right;">
                    <span style="
                      font-size: 14px;
                      font-weight: 700;
                      color: #667eea;
                    ">${pyeongPrice.toLocaleString()}만</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  exportData() {
    const data = this.analyzer.propertyData;
    const text = data.map(item => {
      const pyeongPrice = this.analyzer.calculatePyeongPrice(
        item.monthlyRent || item.price,
        item.area
      );
      return `${item.type}\t${item.floor}층\t${item.area.toFixed(1)}평\t${pyeongPrice.toLocaleString()}만원`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('✅ 데이터가 클립보드에 복사되었습니다!');
    });
  }
}

// 초기화
const sanga = new SanGaAnalyzer();
console.log('🏠 SanGa Pro initialized');