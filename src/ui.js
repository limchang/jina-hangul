// ui.js — 패널 + 네비게이션

function setupPanels() {
  const consList = document.getElementById('cons-list');
  const vowList = document.getElementById('vow-list');
  const consLabel = document.querySelector('#panel-cons .panel-label');
  const vowLabel = document.querySelector('#panel-vow .panel-label');

  consList.innerHTML = '';
  vowList.innerHTML = '';

  if (appMode === 'combine') {
    // 붙이기 모드: 왼쪽 자음, 오른쪽 모음 선택
    consLabel.textContent = '자 음';
    vowLabel.textContent = '모 음';

    CONSONANTS.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerText = item.char;
      div.onclick = () => {
        currentMode = 'syllables';
        currentDataList = SYLLABLES;
        loadCharacter(i);
        updatePanelActive();
      };
      consList.appendChild(div);
    });

    // 모음 선택 (ㅏ ㅑ ㅓ ㅕ)
    Object.keys(VOWEL_OFFSETS).forEach(v => {
      const div = document.createElement('div');
      div.className = 'thumb';
      if (v === selectedVowel) div.classList.add('active');
      div.innerText = v;
      div.onclick = () => {
        selectedVowel = v;
        SYLLABLES = buildSyllables(v);
        currentDataList = SYLLABLES;
        loadCharacter(currentCharIdx);
        updatePanelActive();
      };
      vowList.appendChild(div);
    });
  } else {
    // 기본 모드
    consLabel.textContent = '자 음';
    vowLabel.textContent = '모 음';

    CONSONANTS.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerText = item.char;
      div.onclick = () => {
        currentMode = 'consonants';
        currentDataList = CONSONANTS;
        loadCharacter(i);
        updatePanelActive();
      };
      consList.appendChild(div);
    });

    VOWELS.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerText = item.char;
      div.onclick = () => {
        currentMode = 'vowels';
        currentDataList = VOWELS;
        loadCharacter(i);
        updatePanelActive();
      };
      vowList.appendChild(div);
    });
  }
}

function updatePanelActive() {
  // 자음 패널
  const consThumbs = document.querySelectorAll('#cons-list .thumb');
  consThumbs.forEach((el, i) => {
    if (appMode === 'combine') {
      if (i === currentCharIdx) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    } else {
      if (currentMode === 'consonants' && i === currentCharIdx) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    }
  });

  // 모음 패널
  const vowThumbs = document.querySelectorAll('#vow-list .thumb');
  vowThumbs.forEach((el, i) => {
    if (appMode === 'combine') {
      const vowKeys = Object.keys(VOWEL_OFFSETS);
      if (vowKeys[i] === selectedVowel) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    } else {
      if (currentMode === 'vowels' && i === currentCharIdx) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    }
  });
}

function updateFooterActive() { updatePanelActive(); }

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

function nextChar() {
  loadCharacter((currentCharIdx + 1) % currentDataList.length);
  updatePanelActive();
}

function prevChar() {
  loadCharacter((currentCharIdx - 1 + currentDataList.length) % currentDataList.length);
  updatePanelActive();
}
