import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('游戏页面发生未捕获错误', error, info);
  }

  resetGame = () => {
    try {
      localStorage.removeItem(this.props.storageKey);
    } catch {
      // 即使存储不可用，也继续刷新页面。
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error-page" role="alert">
        <section className="fatal-error-card">
          <span className="fatal-error-icon" aria-hidden="true">!</span>
          <p className="fatal-error-kicker">CASE 01 · 页面恢复</p>
          <h1>游戏页面加载失败</h1>
          <p>可能是旧存档或页面数据异常。你可以清除本案的本地进度并重新进入。</p>
          <button onClick={this.resetGame}>清除存档并重新开始</button>
          {import.meta.env.DEV && (
            <details>
              <summary>查看错误信息</summary>
              <pre>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}
