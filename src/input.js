// input.js — 터치/마우스 이벤트 처리 (드래그 풀림 방지 강화)

// 현재 활성 터치를 추적하여 터치 중 드래그 풀림 방지
let activeTouchId = null;

function getPointerPos(e) {
  let clientX, clientY;

  if (e.touches && e.touches.length > 0) {
    // 활성 터치 ID가 있으면 해당 터치 사용
    if (activeTouchId !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
          clientX = e.touches[i].clientX;
          clientY = e.touches[i].clientY;
          break;
        }
      }
      // 해당 터치를 못 찾으면 첫 번째 터치 사용
      if (clientX === undefined) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const rect = traceCanvas.getBoundingClientRect();
  const scaleX = 500 / rect.width;
  const scaleY = 500 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function onPointerDown(e) {
  e.preventDefault();

  // 터치 ID 추적 시작
  if (e.touches && e.touches.length > 0) {
    activeTouchId = e.touches[0].identifier;
  }

  const pos = getPointerPos(e);
  if (engine.start(pos.x, pos.y)) {
    stopArrowAnim();
    // 터치 시작 시 반짝 파티클
    particleSystem.burst(pos.x, pos.y, 15);
    startParticleLoop();
    renderTrace();
    updateIcons();
    handlerIcon.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(5deg)';
  }
}

function onPointerMove(e) {
  if (!engine.isTracing) return;
  e.preventDefault();
  const pos = getPointerPos(e);
  engine.move(pos.x, pos.y);
  // 이동 중 파티클 뿌리기
  particleSystem.emit(pos.x, pos.y, 3);
  renderTrace();
  updateIcons();
}

function onPointerUp(e) {
  // 터치 이벤트인 경우: 아직 화면에 터치가 남아있으면 끝내지 않음
  if (e.touches && e.touches.length > 0) return;

  activeTouchId = null;

  if (!engine.isTracing) return;
  handlerIcon.style.transform = 'translate(-50%, -50%)';
  if (engine.end()) {
    // 획 완성 파티클 폭발
    const tp = engine.getTargetPos();
    particleSystem.burst(tp.x, tp.y, 40);
    completeStroke();
  } else {
    stopParticleLoop();
    renderTrace();
    updateIcons();
    startArrowAnim(engine.pts);
  }
}

function onTouchCancel(e) {
  // 터치가 시스템에 의해 취소되어도 드래그를 유지
  // 실제로 손을 뗀 게 아니므로 무시
  e.preventDefault();
}

function setupInput() {
  const card = document.getElementById('study-card');

  // 마우스
  card.addEventListener('mousedown', onPointerDown);
  card.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // 터치 — touchend도 card에 바인딩하여 다른 요소로 빠져나가는 것 방지
  card.addEventListener('touchstart', onPointerDown, { passive: false });
  card.addEventListener('touchmove', onPointerMove, { passive: false });
  card.addEventListener('touchend', onPointerUp, { passive: false });
  card.addEventListener('touchcancel', onTouchCancel, { passive: false });

  // window에도 touchend 등록 (카드 밖에서 손 뗄 경우 대비)
  window.addEventListener('touchend', onPointerUp, { passive: false });
}
