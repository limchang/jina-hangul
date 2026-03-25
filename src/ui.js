// ui.js — 자음/모음 패널 + 듀얼 카드 네비게이션

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
      stopArrowAnim();
      setActiveCard('cons');
      resize();
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
      // 모음은 별도 모드 — 단일 카드로 처리 (추후 확장)
    };
    vowList.appendChild(div);
  });
}

function updatePanelActive() {
  const consThumbs = document.querySelectorAll('#cons-list .thumb');
  consThumbs.forEach((el, i) => {
    if (i === currentCharIdx) {
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
  stopArrowAnim();
  if (currentMode === 'consonants') {
    // 자음 완성 전에 화살표로 다음 → 그냥 다음 글자 자음부터
    const nextIdx = (currentCharIdx + 1) % CONSONANTS.length;
    setActiveCard('cons');
    resize();
    loadCharacter(nextIdx);
  } else {
    // 음절 모드에서 다음 → 다음 글자 자음부터
    const nextIdx = (currentCharIdx + 1) % CONSONANTS.length;
    setActiveCard('cons');
    resize();
    loadCharacter(nextIdx);
  }
  updatePanelActive();
}

function prevChar() {
  stopArrowAnim();
  const prevIdx = (currentCharIdx - 1 + CONSONANTS.length) % CONSONANTS.length;
  setActiveCard('cons');
  resize();
  loadCharacter(prevIdx);
  updatePanelActive();
}
