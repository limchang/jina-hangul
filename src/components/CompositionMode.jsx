// CompositionMode.jsx — 드래그 앤 드롭 글자 조합 모드

import React, { useReducer, useCallback } from 'react';
import { CONSONANTS, VOWELS } from '../data.js';
import { isConsonant, isVowel } from '../utils/jamo.js';
import { useTouchDrag } from '../hooks/useTouchDrag.js';
import { usePinchZoom } from '../hooks/usePinchZoom.js';
import DragPanel from './DragPanel.jsx';
import DragGhost from './DragGhost.jsx';
import CompositionCard from './CompositionCard.jsx';

const initialState = {
  chosung: null,
  jungsung: null,
  jongsung: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CHOSUNG':
      return { ...state, chosung: action.char };
    case 'SET_JUNGSUNG':
      return { ...state, jungsung: action.char };
    case 'SET_JONGSUNG':
      return { ...state, jongsung: action.char };
    case 'CLEAR':
      if (action.slot === 'chosung') return { chosung: null, jungsung: null, jongsung: null };
      if (action.slot === 'jungsung') return { ...state, jungsung: null, jongsung: null };
      if (action.slot === 'jongsung') return { ...state, jongsung: null };
      return state;
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export default function CompositionMode() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { scale, onTouchStart: pinchStart, onTouchMove: pinchMove, onTouchEnd: pinchEnd } = usePinchZoom();

  const handleDrop = useCallback((char, type) => {
    if (type === 'consonant') {
      if (!state.chosung) {
        dispatch({ type: 'SET_CHOSUNG', char });
      } else if (state.jungsung && !state.jongsung) {
        dispatch({ type: 'SET_JONGSUNG', char });
      }
    } else if (type === 'vowel') {
      if (state.chosung && !state.jungsung) {
        dispatch({ type: 'SET_JUNGSUNG', char });
      }
    }
  }, [state.chosung, state.jungsung, state.jongsung]);

  const { drag, startDrag } = useTouchDrag(handleDrop);

  const handleClear = useCallback((slot) => {
    dispatch({ type: 'CLEAR', slot });
  }, []);

  return (
    <div
      className="main-layout composition-layout"
      onTouchStart={pinchStart}
      onTouchMove={pinchMove}
      onTouchEnd={pinchEnd}
    >
      <DragPanel
        items={CONSONANTS}
        label="자 음"
        type="consonant"
        onDragStart={startDrag}
        side="left"
      />

      <main>
        <div className="reset-btn" onClick={() => dispatch({ type: 'RESET' })}>
          ↺ 다시
        </div>

        <CompositionCard
          chosung={state.chosung}
          jungsung={state.jungsung}
          jongsung={state.jongsung}
          onClear={handleClear}
          scale={scale}
          isDragging={!!drag}
        />

        <div className="compose-hint">
          {!state.chosung && '← 자음을 끌어오세요'}
          {state.chosung && !state.jungsung && '모음을 끌어오세요 →'}
          {state.chosung && state.jungsung && !state.jongsung && '받침을 끌어오거나 따라쓰세요'}
          {state.chosung && state.jungsung && state.jongsung && '따라쓰기를 시작하세요!'}
        </div>
      </main>

      <DragPanel
        items={VOWELS}
        label="모 음"
        type="vowel"
        onDragStart={startDrag}
        side="right"
      />

      <DragGhost drag={drag} />
    </div>
  );
}
