/* ============================================
   MeishiScan - アプリケーションロジック
   Version: 2.0.0 - 2026-05-25
   ============================================ */

(function () {
  'use strict';

  // ========================================
  // 定数・設定
  // ========================================
  const STORAGE_KEY = 'meishi_contacts';
  const KANA_GROUPS = {
    'ア': ['ア', 'イ', 'ウ', 'エ', 'オ'],
    'カ': ['カ', 'キ', 'ク', 'ケ', 'コ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
    'サ': ['サ', 'シ', 'ス', 'セ', 'ソ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
    'タ': ['タ', 'チ', 'ツ', 'テ', 'ト', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
    'ナ': ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
    'ハ': ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ'],
    'マ': ['マ', 'ミ', 'ム', 'メ', 'モ'],
    'ヤ': ['ヤ', 'ユ', 'ヨ'],
    'ラ': ['ラ', 'リ', 'ル', 'レ', 'ロ'],
    'ワ': ['ワ', 'ヲ', 'ン']
  };

  // ========================================
  // 状態管理
  // ========================================
  const state = {
    contacts: [],
    currentFilter: 'all',
    searchQuery: '',
    navigationHistory: [],
    currentScreen: 'screen-home',
    captureStep: 1, // 1=表面, 2=裏面
    capturedImages: { front: null, back: null },
    currentStream: null,
    editingContactId: null,
    viewingContactId: null,
    facingMode: 'environment'
  };

  // ========================================
  // DOM要素参照
  // ========================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // ヘッダー
    btnBack: $('#btn-back'),
    headerTitle: $('#header-title'),
    // 画面
    screens: {
      home: $('#screen-home'),
      capture: $('#screen-capture'),
      processing: $('#screen-processing'),
      edit: $('#screen-edit'),
      detail: $('#screen-detail'),
      settings: $('#screen-settings')
    },
    // ホーム
    searchInput: $('#search-input'),
    btnClearSearch: $('#btn-clear-search'),
    kanaTabs: $('#kana-tabs'),
    contactList: $('#contact-list'),
    emptyState: $('#empty-state'),
    btnScan: $('#btn-scan'),
    // 撮影
    captureStepLabel: $('#capture-step-label'),
    cameraVideo: $('#camera-video'),
    previewImage: $('#preview-image'),
    btnShutter: $('#btn-shutter'),
    btnFileUpload: $('#btn-file-upload'),
    btnSwitchCamera: $('#btn-switch-camera'),
    fileInput: $('#file-input'),
    postCaptureActions: $('#post-capture-actions'),
    btnRetake: $('#btn-retake'),
    btnUsePhoto: $('#btn-use-photo'),
    btnSkipBack: $('#btn-skip-back'),
    captureCanvas: $('#capture-canvas'),
    // OCR処理中
    ocrProgress: $('#ocr-progress'),
    ocrStatus: $('#ocr-status'),
    // 編集
    thumbFront: $('#thumb-front'),
    thumbBack: $('#thumb-back'),
    thumbBackWrap: $('#thumb-back-wrap'),
    contactForm: $('#contact-form'),
    btnCancelEdit: $('#btn-cancel-edit'),
    btnSaveContact: $('#btn-save-contact'),
    // 詳細
    detailAvatar: $('#detail-avatar'),
    detailName: $('#detail-name'),
    detailKana: $('#detail-kana'),
    detailCompany: $('#detail-company'),
    detailInfoList: $('#detail-info-list'),
    detailActionCall: $('#detail-action-call'),
    detailActionEmail: $('#detail-action-email'),
    detailActionMap: $('#detail-action-map'),
    btnEditContact: $('#btn-edit-contact'),
    btnDeleteContact: $('#btn-delete-contact'),
    // モーダル
    modalCalendar: $('#modal-calendar'),
    modalExchangeDate: $('#modal-exchange-date'),
    btnCalendarYes: $('#btn-calendar-yes'),
    btnCalendarNo: $('#btn-calendar-no'),
    modalDelete: $('#modal-delete'),
    btnDeleteCancel: $('#btn-delete-cancel'),
    btnDeleteConfirm: $('#btn-delete-confirm'),
    // トースト
    toast: $('#toast'),
    toastMessage: $('#toast-message'),
    // 設定
    btnSettings: $('#btn-settings'),
    fieldApiKey: $('#field-api-key'),
    btnSaveSettings: $('#btn-save-settings')
  };

  // ========================================
  // 初期化
  // ========================================
  function init() {
    loadContacts();
    renderContactList();
    bindEvents();
    setTodayAsDefault();
  }

  function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    $('#field-exchange-date').value = today;
  }

  // ========================================
  // データ管理（localStorage）
  // ========================================
  function loadContacts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      state.contacts = data ? JSON.parse(data) : [];
    } catch {
      state.contacts = [];
    }
  }

  function saveContacts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.contacts));
  }

  function addContact(contact) {
    contact.id = generateId();
    contact.createdAt = new Date().toISOString();
    state.contacts.push(contact);
    saveContacts();
    return contact;
  }

  function updateContact(id, data) {
    const idx = state.contacts.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.contacts[idx] = { ...state.contacts[idx], ...data };
      saveContacts();
    }
  }

  function deleteContact(id) {
    state.contacts = state.contacts.filter(c => c.id !== id);
    saveContacts();
  }

  function getContact(id) {
    return state.contacts.find(c => c.id === id);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  // ========================================
  // 画面遷移管理
  // ========================================
  function navigateTo(screenId, pushHistory = true) {
    if (pushHistory && state.currentScreen !== screenId) {
      state.navigationHistory.push(state.currentScreen);
    }

    // 全画面を非表示
    Object.values(dom.screens).forEach(s => s.classList.remove('active'));

    // 対象画面を表示
    const screen = dom.screens[screenId.replace('screen-', '')];
    if (screen) {
      screen.classList.add('active');
      // アニメーション再トリガー
      screen.style.animation = 'none';
      screen.offsetHeight;
      screen.style.animation = '';
    }

    state.currentScreen = screenId;

    // 戻るボタンの表示制御
    if (screenId === 'screen-home') {
      dom.btnBack.classList.add('hidden');
      state.navigationHistory = [];
    } else {
      dom.btnBack.classList.remove('hidden');
    }

    // FABの表示制御
    dom.btnScan.style.display = screenId === 'screen-home' ? '' : 'none';

    window.scrollTo(0, 0);
  }

  function navigateBack() {
    if (state.navigationHistory.length > 0) {
      const prevScreen = state.navigationHistory.pop();
      navigateTo(prevScreen, false);

      // カメラの停止
      if (state.currentScreen !== 'screen-capture') {
        stopCamera();
      }
    } else {
      navigateTo('screen-home', false);
    }
  }

  // ========================================
  // イベントバインド
  // ========================================
  function bindEvents() {
    // 戻るボタン
    dom.btnBack.addEventListener('click', navigateBack);

    // 設定ボタン
    dom.btnSettings.addEventListener('click', () => {
      dom.fieldApiKey.value = localStorage.getItem('gemini_api_key') || '';
      navigateTo('screen-settings');
    });

    dom.btnSaveSettings.addEventListener('click', () => {
      const key = dom.fieldApiKey.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        showToast('APIキーを保存しました');
        navigateBack();
      } else {
        showToast('APIキーを入力してください');
      }
    });

    // ブラウザの戻るボタン対応
    window.addEventListener('popstate', (e) => {
      if (state.currentScreen !== 'screen-home') {
        navigateBack();
      }
    });

    // スキャンボタン
    dom.btnScan.addEventListener('click', () => {
      state.captureStep = 1;
      state.capturedImages = { front: null, back: null };
      updateCaptureStepUI();
      navigateTo('screen-capture');
      history.pushState(null, '', '');
      startCamera();
    });

    // 検索
    dom.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      dom.btnClearSearch.classList.toggle('hidden', !e.target.value);
      renderContactList();
    });

    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      dom.btnClearSearch.classList.add('hidden');
      renderContactList();
    });

    // ア行タブ
    dom.kanaTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.kana-tab');
      if (!tab) return;
      $$('.kana-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentFilter = tab.dataset.kana;
      renderContactList();
    });

    // 撮影関連
    dom.btnShutter.addEventListener('click', capturePhoto);
    dom.btnFileUpload.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', handleFileSelect);
    dom.btnSwitchCamera.addEventListener('click', switchCamera);
    dom.btnRetake.addEventListener('click', retakePhoto);
    dom.btnUsePhoto.addEventListener('click', usePhoto);
    dom.btnSkipBack.addEventListener('click', () => {
      state.capturedImages.back = null;
      stopCamera();
      navigateTo('screen-processing');
      startOCR();
    });

    // 編集画面
    dom.btnCancelEdit.addEventListener('click', () => navigateBack());
    dom.contactForm.addEventListener('submit', handleSaveContact);

    // 詳細画面
    dom.btnEditContact.addEventListener('click', () => {
      if (state.viewingContactId) {
        state.editingContactId = state.viewingContactId;
        populateEditForm(getContact(state.viewingContactId));
        navigateTo('screen-edit');
      }
    });

    dom.btnDeleteContact.addEventListener('click', () => {
      dom.modalDelete.classList.remove('hidden');
    });

    // 削除モーダル
    dom.btnDeleteCancel.addEventListener('click', () => {
      dom.modalDelete.classList.add('hidden');
    });

    dom.btnDeleteConfirm.addEventListener('click', () => {
      if (state.viewingContactId) {
        deleteContact(state.viewingContactId);
        dom.modalDelete.classList.add('hidden');
        showToast('連絡先を削除しました');
        navigateTo('screen-home', false);
        state.navigationHistory = [];
        renderContactList();
      }
    });

    // カレンダーモーダル
    dom.btnCalendarYes.addEventListener('click', () => {
      const contact = getContact(state.viewingContactId || state.editingContactId);
      if (contact) {
        openGoogleCalendar(contact);
      }
      dom.modalCalendar.classList.add('hidden');
      navigateTo('screen-home', false);
      state.navigationHistory = [];
      renderContactList();
    });

    dom.btnCalendarNo.addEventListener('click', () => {
      dom.modalCalendar.classList.add('hidden');
      navigateTo('screen-home', false);
      state.navigationHistory = [];
      renderContactList();
    });

    // キーボードショートカット（Y/N）
    document.addEventListener('keydown', (e) => {
      if (!dom.modalCalendar.classList.contains('hidden')) {
        if (e.key === 'y' || e.key === 'Y') {
          dom.btnCalendarYes.click();
        } else if (e.key === 'n' || e.key === 'N') {
          dom.btnCalendarNo.click();
        }
      }
    });
  }

  // ========================================
  // 連絡先一覧表示
  // ========================================
  function renderContactList() {
    let contacts = [...state.contacts];

    // フリガナフィルタ
    if (state.currentFilter !== 'all') {
      const kanaChars = KANA_GROUPS[state.currentFilter] || [];
      contacts = contacts.filter(c => {
        const kana = (c.seiKana || '').charAt(0);
        return kanaChars.includes(kana);
      });
    }

    // キーワード検索
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.trim().toLowerCase();
      contacts = contacts.filter(c => {
        const fields = [
          c.sei, c.mei, c.seiKana, c.meiKana,
          c.company, c.department, c.position,
          c.phone, c.mobile, c.email, c.address, c.memo
        ];
        // phones配列内の番号も検索対象に追加
        if (c.phones && Array.isArray(c.phones)) {
          c.phones.forEach(p => {
            if (p.number) fields.push(p.number);
            if (p.label) fields.push(p.label);
          });
        }
        return fields.some(f => f && f.toLowerCase().includes(query));
      });
    }

    // フリガナ順ソート
    contacts.sort((a, b) => {
      const kanaA = (a.seiKana || '') + (a.meiKana || '');
      const kanaB = (b.seiKana || '') + (b.meiKana || '');
      return kanaA.localeCompare(kanaB, 'ja');
    });

    // 表示
    if (contacts.length === 0) {
      dom.contactList.innerHTML = '';
      dom.emptyState.classList.remove('hidden');
    } else {
      dom.emptyState.classList.add('hidden');
      dom.contactList.innerHTML = contacts.map((c, i) => {
        const name = `${c.sei || ''} ${c.mei || ''}`.trim() || '名前なし';
        const kana = `${c.seiKana || ''} ${c.meiKana || ''}`.trim();
        const company = [c.company, c.department, c.position].filter(Boolean).join(' / ');
        const initial = (c.sei || c.mei || '?').charAt(0);

        return `
          <div class="contact-card" data-id="${c.id}" style="--i: ${i}">
            <div class="contact-avatar">${initial}</div>
            <div class="contact-info">
              <div class="contact-name">${escapeHtml(name)}</div>
              ${kana ? `<div class="contact-kana">${escapeHtml(kana)}</div>` : ''}
              ${company ? `<div class="contact-company">${escapeHtml(company)}</div>` : ''}
            </div>
            <div class="contact-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        `;
      }).join('');

      // カードクリックイベント
      dom.contactList.querySelectorAll('.contact-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          showContactDetail(id);
          history.pushState(null, '', '');
        });
      });
    }
  }

  // ========================================
  // 連絡先詳細表示
  // ========================================
  function showContactDetail(id) {
    const contact = getContact(id);
    if (!contact) return;

    state.viewingContactId = id;

    const name = `${contact.sei || ''} ${contact.mei || ''}`.trim() || '名前なし';
    const kana = `${contact.seiKana || ''} ${contact.meiKana || ''}`.trim();
    const company = [contact.company, contact.department, contact.position].filter(Boolean).join(' / ');
    const initial = (contact.sei || contact.mei || '?').charAt(0);

    dom.detailAvatar.textContent = initial;
    dom.detailName.textContent = name;
    dom.detailKana.textContent = kana;
    dom.detailCompany.textContent = company;

    // アクションバー
    const phones = contact.phones || [];
    const firstPhone = phones.length > 0 ? phones[0].number : '';
    const phone = firstPhone || contact.phone || contact.mobile || '';
    dom.detailActionCall.href = phone ? `tel:${phone}` : '#';
    dom.detailActionCall.style.opacity = phone ? '1' : '0.3';

    dom.detailActionEmail.href = contact.email ? `mailto:${contact.email}` : '#';
    dom.detailActionEmail.style.opacity = contact.email ? '1' : '0.3';

    const mapUrl = contact.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`
      : '#';
    dom.detailActionMap.href = mapUrl;
    dom.detailActionMap.style.opacity = contact.address ? '1' : '0.3';

    // 情報リスト
    let infoHtml = '';

    // 以前のデータとの互換性対応
    let phones = contact.phones || [];
    if (phones.length === 0) {
      if (contact.phone) phones.push({ label: '電話番号', number: contact.phone });
      if (contact.mobile) phones.push({ label: '携帯番号', number: contact.mobile });
      if (contact.fax) phones.push({ label: 'FAX番号', number: contact.fax });
    }

    const infoItems = [];
    phones.forEach(p => {
      if (p.number) {
        infoItems.push({ label: p.label || '電話番号', value: p.number, icon: 'phone', link: `tel:${p.number}` });
      }
    });

    infoItems.push(
      { label: 'メール', value: contact.email, icon: 'mail', link: contact.email ? `mailto:${contact.email}` : null },
      { label: 'Webサイト', value: contact.url, icon: 'globe', link: contact.url },
      { label: '郵便番号', value: contact.postal, icon: 'map-pin' },
      {
        label: '住所',
        value: contact.address,
        icon: 'map',
        link: contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}` : null,
        linkLabel: 'Google Mapで開く'
      },
      { label: '名刺交換日', value: contact.exchangeDate ? formatDate(contact.exchangeDate) : null, icon: 'calendar' },
      { label: 'メモ', value: contact.memo, icon: 'file-text' }
    );

    infoItems.forEach(item => {
      if (!item.value) return;
      infoHtml += `
        <div class="detail-info-item">
          <div class="detail-info-icon">${getIcon(item.icon)}</div>
          <div class="detail-info-content">
            <div class="detail-info-label">${item.label}</div>
            <div class="detail-info-value">
              ${item.link
                ? `<a href="${item.link}" target="_blank" rel="noopener">${escapeHtml(item.linkLabel || item.value)}</a>`
                : escapeHtml(item.value)
              }
            </div>
          </div>
        </div>
      `;
    });

    dom.detailInfoList.innerHTML = infoHtml;

    navigateTo('screen-detail');
  }

  // ========================================
  // カメラ操作
  // ========================================
  async function startCamera() {
    try {
      stopCamera();
      const constraints = {
        video: {
          facingMode: state.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.currentStream = stream;
      dom.cameraVideo.srcObject = stream;
      dom.cameraVideo.classList.remove('hidden');
      dom.previewImage.classList.add('hidden');
      dom.postCaptureActions.classList.add('hidden');
      dom.btnShutter.style.display = '';
      dom.btnFileUpload.style.display = '';
      dom.btnSwitchCamera.style.display = '';
    } catch (err) {
      console.warn('カメラアクセスエラー:', err);
      // カメラが使えない場合はファイル選択にフォールバック
      dom.cameraVideo.classList.add('hidden');
      dom.btnShutter.style.display = 'none';
      dom.btnSwitchCamera.style.display = 'none';
      showToast('カメラを使用できません。画像を選択してください。');
    }
  }

  function stopCamera() {
    if (state.currentStream) {
      state.currentStream.getTracks().forEach(t => t.stop());
      state.currentStream = null;
    }
    dom.cameraVideo.srcObject = null;
  }

  async function switchCamera() {
    state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
  }

  function capturePhoto() {
    const video = dom.cameraVideo;
    const canvas = dom.captureCanvas;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    showPreview(dataUrl);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      showPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function showPreview(dataUrl) {
    dom.previewImage.src = dataUrl;
    dom.previewImage.classList.remove('hidden');
    dom.cameraVideo.classList.add('hidden');
    dom.postCaptureActions.classList.remove('hidden');
    dom.btnShutter.style.display = 'none';
    dom.btnFileUpload.style.display = 'none';
    dom.btnSwitchCamera.style.display = 'none';
    dom.btnSkipBack.classList.add('hidden');
    stopCamera();
  }

  function retakePhoto() {
    dom.previewImage.classList.add('hidden');
    dom.postCaptureActions.classList.add('hidden');
    dom.btnShutter.style.display = '';
    dom.btnFileUpload.style.display = '';
    dom.btnSwitchCamera.style.display = '';
    if (state.captureStep === 2) {
      dom.btnSkipBack.classList.remove('hidden');
    }
    startCamera();
  }

  function usePhoto() {
    const dataUrl = dom.previewImage.src;

    if (state.captureStep === 1) {
      state.capturedImages.front = dataUrl;
      state.captureStep = 2;
      updateCaptureStepUI();
      retakePhoto();
    } else {
      state.capturedImages.back = dataUrl;
      stopCamera();
      navigateTo('screen-processing');
      startOCR();
    }
  }

  function updateCaptureStepUI() {
    const label = dom.captureStepLabel;
    if (state.captureStep === 1) {
      label.innerHTML = `<span class="step-badge">STEP 1</span><span class="step-text">名刺の表面を撮影してください</span>`;
      dom.btnSkipBack.classList.add('hidden');
    } else {
      label.innerHTML = `<span class="step-badge">STEP 2</span><span class="step-text">名刺の裏面を撮影してください</span>`;
      dom.btnSkipBack.classList.remove('hidden');
    }
  }

  // ========================================
  // OCR処理 (Gemini API)
  // ========================================
  async function startOCR() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert('【エラー】設定画面からGemini APIキーを入力してください。');
      navigateTo('screen-home');
      return;
    }

    dom.ocrProgress.style.width = '0%';
    dom.ocrStatus.textContent = 'AIに画像を送信しています...';

    try {
      const parts = [];
      const getBase64Data = (dataUrl) => dataUrl.split(',')[1];
      const getMimeType = (dataUrl) => dataUrl.split(';')[0].split(':')[1];

      if (state.capturedImages.front) {
        parts.push({
          inlineData: {
            mimeType: getMimeType(state.capturedImages.front),
            data: getBase64Data(state.capturedImages.front)
          }
        });
      }

      if (state.capturedImages.back) {
        parts.push({
          inlineData: {
            mimeType: getMimeType(state.capturedImages.back),
            data: getBase64Data(state.capturedImages.back)
          }
        });
      }

      parts.push({
        text: `この名刺画像から以下の情報を正確に読み取って、指定のJSONフォーマットのみを出力してください。
Markdownのバッククォート（\`\`\`json など）は不要です。必ず純粋なJSONテキストのみを返してください。

{
  "sei": "姓 (漢字等)",
  "mei": "名 (漢字等)",
  "seiKana": "姓 (カタカナ)",
  "meiKana": "名 (カタカナ)",
  "company": "会社名 (株式会社なども含める)",
  "department": "部署名",
  "position": "役職",
  "phones": [
    {"label": "電話/携帯/FAX/直通などの種類", "number": "電話番号"}
  ],
  "email": "メールアドレス",
  "url": "WebサイトURL",
  "postal": "郵便番号",
  "address": "住所 (都道府県から)",
  "memo": "その他読み取れた重要な情報"
}

読み取れない項目は空文字列 "" にしてください。フリガナがない場合は名前から推測してカタカナで入れてください。`
      });

      dom.ocrProgress.style.width = '30%';
      dom.ocrStatus.textContent = 'AIが名刺を解析中...';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      dom.ocrProgress.style.width = '80%';

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        throw new Error(`API Error: ${response.status} - ${errorMsg}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch(e) {
        console.error("JSON parse error:", text);
      }

      dom.ocrProgress.style.width = '100%';
      dom.ocrStatus.textContent = '読み取り完了！';

      setTimeout(() => {
        state.editingContactId = null;
        populateEditForm(parsed);

        // サムネイル設定
        if (state.capturedImages.front) {
          dom.thumbFront.src = state.capturedImages.front;
          dom.thumbFront.parentElement.style.display = 'flex';
        } else {
          dom.thumbFront.parentElement.style.display = 'none';
        }
        if (state.capturedImages.back) {
          dom.thumbBack.src = state.capturedImages.back;
          if (dom.thumbBackWrap) dom.thumbBackWrap.classList.remove('hidden');
        } else {
          if (dom.thumbBackWrap) dom.thumbBackWrap.classList.add('hidden');
        }

        navigateTo('screen-edit');
      }, 600);

    } catch (err) {
      console.error('AI読み取りエラー:', err);
      alert('【APIエラーが発生しました】\n' + err.message + '\n\nAPIキーが間違っていないか、または設定されているか確認してください。');
      navigateTo('screen-home');
    }
  }

  // ========================================
  // 編集フォーム
  // ========================================
  function populateEditForm(data) {
    $('#field-sei').value = data.sei || '';
    $('#field-mei').value = data.mei || '';
    $('#field-sei-kana').value = data.seiKana || '';
    $('#field-mei-kana').value = data.meiKana || '';
    $('#field-company').value = data.company || '';
    $('#field-department').value = data.department || '';
    $('#field-position').value = data.position || '';
    
    // 電話番号の設定（最大4つ）
    let phones = data.phones || [];
    if (phones.length === 0) {
      if (data.phone) phones.push({ label: '電話', number: data.phone });
      if (data.mobile) phones.push({ label: '携帯', number: data.mobile });
      if (data.fax) phones.push({ label: 'FAX', number: data.fax });
    }
    for (let i = 1; i <= 4; i++) {
      const p = phones[i - 1];
      $('#field-phone' + i + '-label').value = p ? (p.label || '') : '';
      $('#field-phone' + i).value = p ? (p.number || '') : '';
    }

    $('#field-email').value = data.email || '';
    $('#field-url').value = data.url || '';
    $('#field-postal').value = data.postal || '';
    $('#field-address').value = data.address || '';
    $('#field-exchange-date').value = data.exchangeDate || new Date().toISOString().split('T')[0];
    $('#field-memo').value = data.memo || '';
  }

  function getFormData() {
    return {
      sei: $('#field-sei').value.trim(),
      mei: $('#field-mei').value.trim(),
      seiKana: $('#field-sei-kana').value.trim(),
      meiKana: $('#field-mei-kana').value.trim(),
      company: $('#field-company').value.trim(),
      department: $('#field-department').value.trim(),
      position: $('#field-position').value.trim(),
      phones: [
        { label: $('#field-phone1-label').value.trim(), number: $('#field-phone1').value.trim() },
        { label: $('#field-phone2-label').value.trim(), number: $('#field-phone2').value.trim() },
        { label: $('#field-phone3-label').value.trim(), number: $('#field-phone3').value.trim() },
        { label: $('#field-phone4-label').value.trim(), number: $('#field-phone4').value.trim() }
      ].filter(p => p.number),
      email: $('#field-email').value.trim(),
      url: $('#field-url').value.trim(),
      postal: $('#field-postal').value.trim(),
      address: $('#field-address').value.trim(),
      exchangeDate: $('#field-exchange-date').value,
      memo: $('#field-memo').value.trim(),
      frontImage: state.capturedImages.front,
      backImage: state.capturedImages.back
    };
  }

  function handleSaveContact(e) {
    e.preventDefault();
    const data = getFormData();

    if (!data.sei && !data.mei && !data.company) {
      showToast('氏名または会社名を入力してください');
      return;
    }

    let savedContact;
    if (state.editingContactId) {
      updateContact(state.editingContactId, data);
      savedContact = getContact(state.editingContactId);
      showToast('連絡先を更新しました');
    } else {
      savedContact = addContact(data);
      showToast('連絡先を保存しました');
    }

    state.viewingContactId = savedContact.id;

    // カレンダー登録確認
    if (data.exchangeDate) {
      dom.modalExchangeDate.textContent = formatDate(data.exchangeDate);
      dom.modalCalendar.classList.remove('hidden');
    } else {
      navigateTo('screen-home', false);
      state.navigationHistory = [];
      renderContactList();
    }
  }

  // ========================================
  // Google Calendar連携
  // ========================================
  function openGoogleCalendar(contact) {
    const name = `${contact.sei || ''} ${contact.mei || ''}`.trim();
    const title = `名刺交換：${name}${contact.company ? `（${contact.company}）` : ''}`;
    const date = contact.exchangeDate || new Date().toISOString().split('T')[0];

    // 全日イベント
    const startDate = date.replace(/-/g, '');
    const endDateObj = new Date(date);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDate = endDateObj.toISOString().split('T')[0].replace(/-/g, '');

    const details = [
      contact.company ? `会社: ${contact.company}` : '',
      contact.department ? `部署: ${contact.department}` : '',
      contact.position ? `役職: ${contact.position}` : '',
      contact.phone ? `電話: ${contact.phone}` : '',
      contact.mobile ? `携帯: ${contact.mobile}` : '',
      contact.email ? `Email: ${contact.email}` : '',
      contact.address ? `住所: ${contact.address}` : ''
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${startDate}/${endDate}`,
      details: details,
      ctz: 'Asia/Tokyo'
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  }

  // ========================================
  // ユーティリティ
  // ========================================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function showToast(message) {
    dom.toastMessage.textContent = message;
    dom.toast.classList.remove('hidden');
    dom.toast.classList.add('show');
    setTimeout(() => {
      dom.toast.classList.remove('show');
      setTimeout(() => dom.toast.classList.add('hidden'), 300);
    }, 2500);
  }

  function getIcon(name) {
    const icons = {
      'phone': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      'mail': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      'globe': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      'map-pin': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      'map': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
      'calendar': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    };
    return icons[name] || '';
  }

  // ========================================
  // 起動
  // ========================================
  document.addEventListener('DOMContentLoaded', init);
})();
