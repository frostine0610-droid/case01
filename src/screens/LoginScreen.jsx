import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

// 登录页：保卫处办公系统风格
// 动画流程：系统启动日志逐行出现 → 登录卡滑入 → 点击登录 → 核验动画 → 进入案件简报
export default function LoginScreen() {
  const { gameData, loginToSystem } = useGame();
  const login = gameData.login;

  // 启动日志逐行显示
  const [bootStep, setBootStep] = useState(0);
  // booting = 启动日志阶段；ready = 登录卡；verifying = 核验中；success = 通过
  const [phase, setPhase] = useState('booting');

  useEffect(() => {
    if (bootStep >= login.bootLines.length) {
      const t = setTimeout(() => setPhase('ready'), 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBootStep((s) => s + 1), 520);
    return () => clearTimeout(t);
  }, [bootStep, login.bootLines.length]);

  const handleLogin = () => {
    if (phase !== 'ready') return;
    setPhase('verifying');
    setTimeout(() => setPhase('success'), 1100);
    setTimeout(() => loginToSystem(), 1750);
  };

  // 点击任意处可跳过启动日志
  const skipBoot = () => {
    if (phase === 'booting') {
      setBootStep(login.bootLines.length);
    }
  };

  return (
    <div className="login-page" onClick={skipBoot}>
      <div className="login-bg-grid" aria-hidden="true" />
      <div className="login-bg-scan" aria-hidden="true" />

      {/* 启动日志 */}
      <div className="login-boot" aria-hidden={phase !== 'booting'}>
        <div className="login-boot-head">
          <span className="login-boot-logo">🛡</span>
          <span className="login-boot-name">{login.systemName}</span>
          <span className="login-boot-ver">{login.systemVersion}</span>
        </div>
        {login.bootLines.slice(0, bootStep).map((line) => (
          <p className="login-boot-line" key={line}>
            <span className="login-boot-tick">✓</span>
            {line}
          </p>
        ))}
        {phase === 'booting' && (
          <span className="login-boot-cursor" aria-hidden="true" />
        )}
      </div>

      {/* 登录卡 */}
      {phase !== 'booting' && (
        <div className={`login-card ${phase === 'success' ? 'is-success' : ''}`}>
          <div className="login-card-head">
            <span className="login-card-logo">🛡</span>
            <div>
              <div className="login-card-sys">{login.systemName}</div>
              <div className="login-card-date">{login.dateLabel}</div>
            </div>
          </div>

          {/* 工牌 */}
          <div className="login-badge-card">
            <span className="login-badge-avatar">{login.operatorName.slice(0, 1)}</span>
            <div className="login-badge-info">
              <div className="login-badge-role">
                <small>{login.roleLabel}</small>
                <b>{login.roleName}</b>
              </div>
              <div className="login-badge-rows">
                <span>
                  <small>{login.operatorLabel}</small>
                  <b>{login.operatorName}</b>
                </span>
                <span>
                  <small>{login.badgeLabel}</small>
                  <b>{login.badgeNo}</b>
                </span>
              </div>
            </div>
          </div>

          {/* 口令（已自动填充，仅演示） */}
          <div className="login-field">
            <label>{login.passwordLabel}</label>
            <div className="login-password">
              <span>•</span><span>•</span><span>•</span><span>•</span>
              <span>•</span><span>•</span>
            </div>
          </div>

          {/* 待办提醒 */}
          <div className="login-notice">
            <span className="login-notice-dot" aria-hidden="true" />
            <div>
              <small>{login.noticeLabel}</small>
              <b>{login.noticeText}</b>
            </div>
          </div>

          {/* 登录按钮：三态（登录 → 核验中 → 通过） */}
          <button
            className={`login-submit ${phase === 'verifying' ? 'verifying' : ''} ${
              phase === 'success' ? 'success' : ''
            }`}
            onClick={handleLogin}
            disabled={phase !== 'ready'}
          >
            {phase === 'ready' && (
              <>
                {login.loginButtonLabel}
                <i className="login-btn-arrow" aria-hidden="true">→</i>
              </>
            )}
            {phase === 'verifying' && (
              <>
                <i className="login-spinner" aria-hidden="true" />
                {login.loggingInLabel}
              </>
            )}
            {phase === 'success' && <>✓ {login.successLabel}</>}
          </button>

          <p className="login-duty-hint">{login.dutyHint}</p>
        </div>
      )}
    </div>
  );
}
