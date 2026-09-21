import { useHealth } from './hooks/useHealth';

export default function App() {
  const { data, isLoading, isError } = useHealth();

  return (
    <main className="page">
      <div className="card">
        <h1>MuktPay</h1>
        <p className="muted">Web foundation ready.</p>

        <div className="status">
          <span className="label">Backend</span>
          {isLoading && <span>Checking…</span>}
          {isError && <span className="bad">Unreachable</span>}
          {data && (
            <span className={data.status === 'ok' ? 'good' : 'bad'}>
              {data.status === 'ok' ? 'Connected' : 'Degraded'} · DB {data.database}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
