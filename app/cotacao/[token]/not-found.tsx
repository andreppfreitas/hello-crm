import "./quotation.css";

export default function NaoEncontrada() {
  return (
    <div className="q-root">
      <div className="q-wrap">
        <div className="q-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h1 className="q-title" style={{ fontSize: "28px" }}>Cotação não encontrada</h1>
          <p style={{ color: "var(--q-ink-2)", marginTop: 8 }}>
            O link pode ter expirado ou sido digitado incompleto.
            Peça ao seu consultor da Hello Australia um link novo.
          </p>
        </div>
      </div>
    </div>
  );
}
