// ui.js — 자음/모음 패널 + 네비게이션

function setupPanels() {
  const consList = document.getElementById('cons-list');
  const vowList = document.getElementById('vow-list');

  consList.innerHTML = '';
  vowList.innerHTML = '';

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

function updatePanelActive() {
  const consThumbs = document.querySelectorAll('#cons-list .thumb');
  consThumbs.forEach((el, i) => {
    if ((currentMode === 'consonants' || currentMode === 'syllables') && i === currentCharIdx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('active');
    }
  });

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

function updateFooterActive() { updatePanelActive(); }

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

function nextChar() {
  if (currentMode === 'syllables') {
    // 음절 모드에서 다음 → 다음 글자 자음
    currentMode = 'consonants';
    currentDataList = CONSONANTS;
    loadCharacter((currentCharIdx + 1) % CONSONANTS.length);
  } else {
    loadCharacter((currentCharIdx + 1) % currentDataList.length);
  }
  updatePanelActive();
}

function prevChar() {
  if (currentMode === 'syllables') {
    currentMode = 'consonants';
    currentDataList = CONSONANTS;
  }
  loadCharacter((currentCharIdx - 1 + currentDataList.length) % currentDataList.length);
  updatePanelActive();
}
