import { useGame } from '../game/GameContext.jsx';
import GalleryApp from './apps/GalleryApp.jsx';
import WeChatApp from './apps/WeChatApp.jsx';
import ContactsApp from './apps/ContactsApp.jsx';
import DistractorApp from './DistractorApp.jsx';

const PLACEHOLDER_NOTE = '该应用的具体内容将在后续步骤实现，当前仅为占位页面。';

// 各应用的内容组件，未实现的应用回退到占位页
const APP_SCREENS = {
  gallery: GalleryApp,
  wechat: WeChatApp,
  contacts: ContactsApp,
};

export default function AppView({ app, onClose }) {
  const { gameData } = useGame();
  const { uiText } = gameData;
  const Content = APP_SCREENS[app.id];

  return (
    <div className="app-window">
      <div className="app-header">
        <span className="app-header-icon">{app.icon}</span>
        <span className="app-header-name">{app.name}</span>
        <button className="app-close" onClick={onClose}>
          {uiText.backToHome}
        </button>
      </div>
      <div className="app-body">
        {app.kind === 'distractor' ? (
          <DistractorApp app={app} />
        ) : Content ? (
          <Content />
        ) : (
          <div className="app-placeholder">
            <div className="app-placeholder-title">{app.name}</div>
            <p>{PLACEHOLDER_NOTE}</p>
          </div>
        )}
      </div>
    </div>
  );
}
