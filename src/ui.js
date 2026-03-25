// ui.js — 자음/모음 양쪽 패널 UI + 네비게이션

function setupTabs() {
  // 탭 대신 양쪽 패널 클릭으로 전환
  // 자음 패널 항목 클릭 시 자음 모드로 전환
  // 모음 패널 항목 클릭 시 모음 모드로 전환
}

function setupPanels() {
  const consList = document.getElementById('cons-list');
  const vowList = document.getElementById('vow-list');

  consList.innerHTML = '';
  vowList.innerHTML = '';

  CONSONANTS.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.dataset.type = 'cons';
    div.dataset.index = i;
    div.onclick = () => {
      currentDataList = CONSONANTS;
      currentMode = 'consonants';
      loadCharacter(i);
      updatePanelActive();
    };
    consList.appendChild(div);
  });

  VOWELS.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.dataset.type = 'vow';
    div.dataset.index = i;
    div.onclick = () => {
      currentDataList = VOWELS;
      currentMode = 'vowels';
      loadCharacter(i);
      updatePanelActive();
    };
    vowList.appendChild(div);
  });
}

function setupFooter() {
  // 이제 footer 대신 panels 사용
  setupPanels();
}

function updatePanelActive() {
  // 자음 패널
  const consThumbs = document.querySelectorAll('#cons-list .thumb');
  consThumbs.forEach((el, i) => {
    if (currentMode === 'consonants' && i === currentCharIdx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('active');
    }
  });

  // 모음 패널
  const vowThumbs = document.querySelectorAll('#vow-list .thumb');
  vowThumbs.forEach((el, i) => {
    if (currentMode === 'vowels' && i === currentCharIdx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('active');
    }
  });
}

function updateFooterActive() {
  updatePanelActive();
}

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

function nextChar() {
  const nextIdx = currentCharIdx + 1;
  if (nextIdx >= currentDataList.length) {
    // 자음 끝이면 모음으로, 모음 끝이면 자음으로
    if (currentMode === 'consonants') {
      currentDataList = VOWELS;
      currentMode = 'vowels';
      loadCharacter(0);
    } else {
      currentDataList = CONSONANTS;
      currentMode = 'consonants';
      loadCharacter(0);
    }
  } else {
    loadCharacter(nextIdx);
  }
  updatePanelActive();
}

function prevChar() {
  const prevIdx = currentCharIdx - 1;
  if (prevIdx < 0) {
    if (currentMode === 'consonants') {
      currentDataList = VOWELS;
      currentMode = 'vowels';
      loadCharacter(VOWELS.length - 1);
    } else {
      currentDataList = CONSONANTS;
      currentMode = 'consonants';
      loadCharacter(CONSONANTS.length - 1);
    }
  } else {
    loadCharacter(prevIdx);
  }
  updatePanelActive();
}
