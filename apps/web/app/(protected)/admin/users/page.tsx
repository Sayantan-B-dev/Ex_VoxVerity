const mockUsers = [
  { name: "Alice Admin", email: "alice@acme.com", role: "ADMIN", status: "Active", joined: "Jan 2026" },
  { name: "Bob Analyst", email: "bob@acme.com", role: "ANALYST", status: "Active", joined: "Feb 2026" },
  { name: "Carol Operator", email: "carol@acme.com", role: "OPERATOR", status: "Active", joined: "Mar 2026" },
  { name: "Dave Viewer", email: "dave@acme.com", role: "VIEWER", status: "Invited", joined: "Sep 2026" },
];

const roleBadge: Record<string, string> = { ADMIN: "badge-high", ANALYST: "badge-medium", OPERATOR: "badge-low", VIEWER: "badge-low" };

export default function AdminUsersPage() {
  return (
    <div>
      <div className="page-header"><h1>User Management</h1><button className="btn btn-primary">+ Invite User</button></div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {mockUsers.map((u) => (
              <tr key={u.email}>
                <td style={{ fontWeight: "var(--weight-medium)" }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                <td>{u.status}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{u.joined}</td>
                <td><button className="btn btn-ghost btn-sm">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
