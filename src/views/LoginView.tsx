import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function LoginView() {
  const signIn = useAuth(s => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = signIn({ email, password });
    if (msg) setErr(msg);
    else nav("/");
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <form className="card pad" onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <h2 style={{ margin: 0 }}>Sign in</h2>
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gmail.come" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {err && <div className="pill red" role="alert">{err}</div>}
        <button className="btn btn-primary" type="submit">Sign in</button>
        <div style={{ fontSize:13, opacity:.8 }}>
          No account? <Link to="/register">Create account</Link>
        </div>
      </form>
    </div>
  );
}