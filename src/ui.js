// ui.js — 탭, 푸터, 네비게이션 UI

function setupTabs() {
  const tc = document.getElementById('tab-cons');
  const tv = document.getElementById('tab-vow');
  tc.onclick = () => { tc.classList.add('active'); tv.classList.remove('active'); currentDataList = CONSONANTS; setupFooter(); loadCharacter(0); };
  tv.onclick = () => { tv.classList.add('active'); tc.classList.remove('active'); currentDataList = VOWELS; setupFooter(); loadCharacter(0); };
}

function setupFooter() {
  const footer = document.getElementById('footer-menu');
  footer.innerHTML = '';
  currentDataList.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.onclick = () => loadCharacter(i);
    footer.appendChild(div);
  });
}

function updateFooterActive() {
  const footer = document.getElementById('footer-menu');
  Array.from(footer.children).forEach((el, i) => {
    if (i === currentCharIdx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    } else {
      el.classList.remove('active');
    }
  });
}

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

function nextChar() { loadCharacter((currentCharIdx + 1) % currentDataList.length); }
function prevChar() { loadCharacter((currentCharIdx - 1 + currentDataList.length) % currentDataList.length); }
