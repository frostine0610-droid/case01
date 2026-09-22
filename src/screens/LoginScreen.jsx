import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

// 登录页：机主（林夏）解锁自己的手机
// 动画流程：开机日志逐行出现 → 解锁卡滑入 → 点击解锁 → 核验动画 → 进入案件简报
export default function LoginScreen() {
  const { gameData, loginToSystem } = useGame();
  const login = gameData.login;

  // 启动日志逐行显示
  const [bootStep, setBootStep] = useState(0);
  // booting = 启动日志阶段；ready = 登录卡；verifying = 核验中；success = 通过
  const [phase, setPhase] = useState('booting');
  const loginTimers = useRef([]);

  useEffect(() => () => {
    loginTimers.current.forEach((timer) => clearTimeout(timer));
    loginTimers.current = [];
  }, []);

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
    loginTimers.current.push(
      setTimeout(() => setPhase('success'), 1100),
      setTimeout(() => loginToSystem(), 1750)
    );
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
      {phase === 'booting' && (
        <div className="login-boot">
          <div className="login-boot-head">
            <span className="login-boot-logo">{login.logoIcon}</span>
            <span className="login-boot-name">{login.systemName}</span>
            <span className="login-boot-ver">{login.systemVersion}</span>
          </div>
          {login.bootLines.slice(0, bootStep).map((line) => (
            <p className="login-boot-line" key={line}>
              <span className="login-boot-tick">✓</span>
              {line}
            </p>
          ))}
          <span className="login-boot-cursor" aria-hidden="true" />
        </div>
      )}

      {/* 登录卡 */}
      {phase !== 'booting' && (
        <div className={`login-scene ${phase === 'success' ? 'is-success' : ''}`}>
          <section className="login-story-panel">
            <span className="login-story-kicker">CAMERA RECOVERY · 01</span>
            <h1>回到昨夜，<br />找回消失的相机</h1>
            <p>{login.dutyHint}</p>
            <div className="login-story-notice">
              <span className="login-notice-dot" aria-hidden="true" />
              <div>
                <small>{login.noticeLabel}</small>
                <b>{login.noticeText}</b>
              </div>
            </div>
            <span className="login-story-foot">所有调查从这部手机中的真实记录开始</span>
          </section>

          <section className="login-card">
            <div className="login-card-head">
              <span className="login-card-logo">{login.logoIcon}</span>
              <div>
                <div className="login-card-sys">{login.systemName}</div>
                <div className="login-card-date">{login.dateLabel}</div>
              </div>
              <span className="login-device-status">82%</span>
            </div>

            {/* 机主身份 */}
            <div className="login-owner-card">
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

            {/* 密码（已自动填充，仅演示） */}
            <div className="login-field">
              <label>{login.passwordLabel}</label>
              <div className="login-password" aria-label="锁屏密码已填充">
                <span>•</span><span>•</span><span>•</span><span>•</span>
                <span>•</span><span>•</span>
              </div>
            </div>

            {/* 解锁按钮：三态（解锁 → 核验中 → 通过） */}
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

            <p className="login-security-hint">🔒 本地剧情体验 · 不会上传个人信息</p>
          </section>
        </div>
      )}
    </div>
  );
}
