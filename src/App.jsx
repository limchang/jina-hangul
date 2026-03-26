import React from 'react';
import { Agentation } from 'agentation';
import FreeComposeMode from './components/FreeComposeMode.jsx';
import '../css/styles.css';

export default function App() {
  return (
    <>
      {import.meta.env.DEV && <Agentation />}
      <div id="bg-layer"></div>
      <FreeComposeMode />
    </>
  );
}
