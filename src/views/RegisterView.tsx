import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function RegisterView() {
  const signUp = useAuth(s => s.signUp);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = signUp({ name, email, password });
    if (msg) setErr(msg);
    else nav("/");
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <form className="card pad" onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <h2 style={{ margin: 0 }}>Create account</h2>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nguyen Van A" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@university.edu" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="at least 6 chars" />
        </div>
        {err && <div className="pill red" role="alert">{err}</div>}
        <button className="btn btn-primary" type="submit">Sign up</button>
        <div style={{ fontSize:13, opacity:.8 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}