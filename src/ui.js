// ui.js — 자음/가나다/모음 패널 UI + 네비게이션

function setupPanels() {
  const consList = document.getElementById('cons-list');
  const sylList = document.getElementById('syl-list');
  const vowList = document.getElementById('vow-list');

  consList.innerHTML = '';
  sylList.innerHTML = '';
  vowList.innerHTML = '';

  CONSONANTS.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.onclick = () => {
      currentDataList = CONSONANTS;
      currentMode = 'consonants';
      loadCharacter(i);
      updatePanelActive();
    };
    consList.appendChild(div);
  });

  SYLLABLES_A.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.onclick = () => {
      currentDataList = SYLLABLES_A;
      currentMode = 'syllables';
      loadCharacter(i);
      updatePanelActive();
    };
    sylList.appendChild(div);
  });

  VOWELS.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.onclick = () => {
      currentDataList = VOWELS;
      currentMode = 'vowels';
      loadCharacter(i);
      updatePanelActive();
    };
    vowList.appendChild(div);
  });
}

function updatePanelActive() {
  const panels = [
    { id: 'cons-list', mode: 'consonants' },
    { id: 'syl-list', mode: 'syllables' },
    { id: 'vow-list', mode: 'vowels' }
  ];

  panels.forEach(({ id, mode }) => {
    const thumbs = document.querySelectorAll(`#${id} .thumb`);
    thumbs.forEach((el, i) => {
      if (currentMode === mode && i === currentCharIdx) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    });
  });
}

function updateFooterActive() {
  updatePanelActive();
}

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

const MODE_ORDER = ['consonants', 'syllables', 'vowels'];
const MODE_DATA = { consonants: () => CONSONANTS, syllables: () => SYLLABLES_A, vowels: () => VOWELS };

function nextChar() {
  const nextIdx = currentCharIdx + 1;
  if (nextIdx >= currentDataList.length) {
    const mi = MODE_ORDER.indexOf(currentMode);
    const nextMode = MODE_ORDER[(mi + 1) % MODE_ORDER.length];
    currentMode = nextMode;
    currentDataList = MODE_DATA[nextMode]();
    loadCharacter(0);
  } else {
    loadCharacter(nextIdx);
  }
  updatePanelActive();
}

function prevChar() {
  const prevIdx = currentCharIdx - 1;
  if (prevIdx < 0) {
    const mi = MODE_ORDER.indexOf(currentMode);
    const prevMode = MODE_ORDER[(mi - 1 + MODE_ORDER.length) % MODE_ORDER.length];
    currentMode = prevMode;
    currentDataList = MODE_DATA[prevMode]();
    loadCharacter(currentDataList.length - 1);
  } else {
    loadCharacter(prevIdx);
  }
  updatePanelActive();
}
