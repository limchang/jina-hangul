import React, { useState } from 'react';
import { Agentation } from 'agentation';
import FreeComposeMode from './components/FreeComposeMode.jsx';
import FirefighterMode from './components/FirefighterMode.jsx';
import '../css/global.css';

export default function App() {
  const [gameMode, setGameMode] = useState(null); // null | 'fire'

  return (
    <>
      {import.meta.env.DEV && <Agentation />}
      <div id="bg-layer"></div>
      <FreeComposeMode onGameMode={() => setGameMode('fire')} />
      {gameMode === 'fire' && <FirefighterMode onExit={() => setGameMode(null)} />}
    </>
  );
}
