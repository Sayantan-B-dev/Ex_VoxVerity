const mockModels = [
  { id: "AASIST-L", name: "Audio Anti-Spoofing", version: "v1.0", license: "MIT", status: "Active", params: "85K" },
  { id: "ECAPA-TDNN", name: "Speaker Embeddings", version: "v1.0", license: "Apache-2.0", status: "Active", params: "6.2M" },
];

export default function AdminModelsPage() {
  return (
    <div>
      <div className="page-header"><h1>Model Management</h1></div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Model</th><th>Name</th><th>Version</th><th>Parameters</th><th>License</th><th>Status</th></tr></thead>
          <tbody>
            {mockModels.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: "var(--weight-medium)", fontFamily: "var(--font-mono)" }}>{m.id}</td>
                <td>{m.name}</td>
                <td>{m.version}</td>
                <td>{m.params}</td>
                <td style={{ fontSize: "var(--text-sm)" }}>{m.license}</td>
                <td><span className="badge badge-success">{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
