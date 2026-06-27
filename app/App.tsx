export function App() {
  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">tezukai</h1>
        <p className="app__subtitle">手取り税金シミュレータ</p>
      </header>

      <section className="card">
        <p>
          年収と各種控除から、所得税・住民税・社会保険料を計算し、
          <strong>年収 → 手取り</strong>までを可視化する概算ツールです。
        </p>
        <p className="card__status">
          🚧 現在セットアップ中（Phase 0）。計算機能はこれから実装します。
        </p>
      </section>

      <footer className="app__footer">
        <p>
          ※ 本ツールはあくまで<strong>概算</strong>であり、確定申告書類の作成や
          個別の税務助言ではありません。入力内容はすべてブラウザ内で計算され、
          保存・送信されません。
        </p>
      </footer>
    </main>
  )
}
