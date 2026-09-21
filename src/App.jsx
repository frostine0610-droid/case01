import { useEffect } from 'react';
import { useGame } from './game/GameContext.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import BriefingScreen from './screens/BriefingScreen.jsx';
import PhoneScreen from './screens/PhoneScreen.jsx';
import SettlementScreen from './screens/SettlementScreen.jsx';

export default function App() {
  const { gameData, screen } = useGame();

  useEffect(() => {
    document.title = gameData.game.title;
  }, [gameData.game.title]);

  // 屏幕流转：登录 → 简报（开场视频）→ 手机调查 → 结算
  if (screen === 'login') {
    return <LoginScreen />;
  }
  if (screen === 'briefing') {
    return <BriefingScreen />;
  }
  if (screen === 'settlement') {
    return <SettlementScreen />;
  }
  return <PhoneScreen />;
}
