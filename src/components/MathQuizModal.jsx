// MathQuizModal.jsx — 수학 퀴즈 모달 (편집 잠금 해제용)
import React from 'react';
import '../../css/quiz.css';

export default function MathQuizModal({ quiz, onAnswer, onClose }) {
  if (!quiz) return null;
  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-card" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-question">{quiz.a} × {quiz.b} = ?</div>
        <div className="quiz-options">
          {quiz.options.map((opt, i) => (
            <div key={i} className="quiz-option" onClick={() => onAnswer(opt)}>{opt}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
