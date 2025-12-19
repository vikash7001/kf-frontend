import React, {useState} from 'react';
import { api } from '../services/api';

export default function Login({onLogin}){
  const [u,setU] = useState('');
  const [p,setP] = useState('');
  const [err,setErr] = useState(null);

  async function submit(e){
    e.preventDefault();
    setErr(null);
    try{
      const res = await api.post('/login', { username: u, password: p });
      const json = res.data;
      if(json.token){
        onLogin(json.token, json.user);
      } else {
        setErr('Login failed');
      }
    }catch(err){
      setErr(err.response?.data?.error || err.message);
    }
  }

  return (
    <div style={{maxWidth:420,margin:'60px auto'}} className="panel">
      <h3>Karni Fashions Login</h3>
      {err && <div style={{color:'red'}}>{err}</div>}
      <form onSubmit={submit}>
        <div className="row"><input placeholder="Username" value={u} onChange={e=>setU(e.target.value)} /></div>
        <div className="row"><input type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)} /></div>
        <div className="row"><button type="submit">Login</button></div>
      </form>
    </div>
  );
}
