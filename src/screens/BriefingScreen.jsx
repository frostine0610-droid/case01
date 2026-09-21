import { useGame } from '../game/GameContext.jsx';
import VideoBriefing from '../components/VideoBriefing.jsx';

// 案件简报页：电影式开场视频自动播放，播放完点击“开始检查手机”进入手机界面
export default function BriefingScreen() {
  const { startInvestigation } = useGame();

  return (
    <div className="briefing-page">
      <VideoBriefing onStart={startInvestigation} />
    </div>
  );
}
