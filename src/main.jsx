import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { GameProvider } from './game/GameContext.jsx';
import gameData from '../gameData.json';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary storageKey={gameData.game.saveKey}>
      <GameProvider>
        <App />
      </GameProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
