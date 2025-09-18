import { useEffect, useMemo, useState } from "react";
import "./app.css"; // <-- important

const API = import.meta.env.VITE_API_BASE;     // set in .env (local) and Amplify env var
const MAX_CHARS = 3000;

export default function App(){
  // tabs
  const [tab,setTab] = useState("synth"); // synth | history | about

  // data
  const [voices,setVoices] = useState([]);     // [{id,languageCode,languageName,gender,supportedEngines}]
  const [languages,setLanguages] = useState([]); // [{code,name}]
  const [lang,setLang] = useState("");
  const [voice,setVoice] = useState("");
  const [engine,setEngine] = useState("");     // "" | "neural"

  // ui
  const [text,setText] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [audioUrl,setAudioUrl] = useState("");
  const [history,setHistory] = useState([]);

  const chars = text.length;
  const over  = chars > MAX_CHARS;
  const canGo = !busy && !over && text.trim();

  // fetch full voice list (with languages)
  useEffect(()=>{
    async function load(){
      try{
        const r = await fetch(`${API}/voices`);
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const arr = d.voices || [];
        setVoices(arr);

        const map = new Map();
        for(const v of arr){
          if(!v.languageCode) continue;
          map.set(v.languageCode, v.languageName || v.languageCode);
        }
        const langs = [...map].map(([code,name])=>({code,name}))
                              .sort((a,b)=>a.name.localeCompare(b.name));
        setLanguages(langs);
        const def = langs.find(l=>l.code.startsWith("en-")) || langs[0];
        setLang(def?.code || "");
      }catch(e){
        console.error(e);
        setError("API not configured in this demo page."); // same message as your screenshot
        // graceful fallback
        setVoices([{id:"Joanna",languageCode:"en-US",languageName:"US English",supportedEngines:["standard","neural"]}]);
        setLanguages([{code:"en-US",name:"US English"}]);
        setLang("en-US"); setVoice("Joanna");
      }
    }
    load();
  },[]);

  // filter voices by language
  const filteredVoices = useMemo(()=>{
    if(!lang) return voices;
    return voices.filter(v=>v.languageCode===lang);
  },[voices,lang]);

  // default voice/engine on language change
  useEffect(()=>{
    if(filteredVoices.length && (!voice || !filteredVoices.find(v=>v.id===voice))){
      setVoice(filteredVoices[0].id);
      setEngine(filteredVoices[0].supportedEngines?.includes("neural") ? "neural" : "");
    }
  },[lang,filteredVoices,voice]);

  // helpers
  const sample = useMemo(()=>{
    const by = {
      en: "Good morning and welcome to today’s session.",
      fr: "Bonjour et bienvenue à la session d’aujourd’hui.",
      es: "Buenos días y bienvenidos a la sesión de hoy.",
      pt: "Bom dia e bem-vindos à sessão de hoje.",
      de: "Guten Morgen und willkommen zur heutigen Sitzung."
    };
    return by[(lang||"").slice(0,2)] || by.en;
  },[lang]);

  async function synth(e){
    e.preventDefault();
    if(!canGo) return;
    setBusy(true); setError(""); setAudioUrl("");
    try{
      const payload = { text, voice };
      if(engine) payload.engine = engine;
      const r = await fetch(`${API}/synthesize`,{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if(!r.ok || !d.url) throw new Error(d.error || "Synthesis failed");
      setAudioUrl(d.url);
      setHistory(h=>[{ url:d.url, voice, ts:Date.now(), lang, engine }, ...h].slice(0,6));
    }catch(err){
      setError(err.message || "Failed to synthesize");
    }finally{
      setBusy(false);
    }
  }

  function insertSample(){ setText(sample); }
  function clearAll(){ setText(""); setAudioUrl(""); setError(""); }

  return (
    <div className="wrap">
      {/* HERO */}
      <div className="hero">
        <div className="badge"><span>🎙️</span><span>Text → Speech Studio</span></div>
        <h1 className="title">Juliet A Adjei</h1>
        <div>DevOps Engineer • AWS SAA Candidate</div>
        <div className="chips">
          {["API Gateway","Lambda","Polly","S3","Amplify","Terraform"].map(x=>(
            <span key={x} className="chip">{x}</span>
          ))}
        </div>
        <div className="tabbar">
          {["synth","history","about"].map(t=>(
            <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
              {t==="synth"?"Synthesize":t==="history"?"History":"About"}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {tab==="synth" && (
        <div className="grid">
          {/* left card */}
          <div className="card">
            <form onSubmit={synth}>
              {/* language/voice/engine */}
              <div className="row">
                <div style={{flex:1}}>
                  <label>Language</label>
                  <select value={lang} onChange={e=>setLang(e.target.value)}>
                    {languages.map(l=><option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label>Voice</label>
                  <select value={voice} onChange={e=>setVoice(e.target.value)}>
                    {filteredVoices.map(v=><option key={v.id} value={v.id}>{v.id}</option>)}
                  </select>
                </div>
                <div style={{width:180}}>
                  <label>Engine</label>
                  <select value={engine} onChange={e=>setEngine(e.target.value)}>
                    <option value="">standard</option>
                    {filteredVoices.find(v=>v.id===voice)?.supportedEngines?.includes("neural") &&
                      <option value="neural">neural</option>}
                  </select>
                </div>
              </div>

              {/* text area */}
              <div style={{marginTop:12}}>
                <label>Your text</label>
                <textarea placeholder="Type or paste text to synthesize…" value={text} onChange={e=>setText(e.target.value)} />
              </div>

              {/* bottom row */}
              <div className="row" style={{marginTop:10}}>
                <div style={{flex:1}} className="subtle">{chars} / {MAX_CHARS} characters</div>
                <div style={{display:"flex", gap:8}}>
                  <button type="button" className="btn ghost" onClick={insertSample}>Insert sample</button>
                  <button type="button" className="btn ghost" onClick={clearAll}>Clear</button>
                  <button className="btn" disabled={!canGo || busy}>{busy?"Synthesizing…":"Generate"}</button>
                </div>
              </div>
            </form>

            {/* error + result */}
            {error && <div className="alert" style={{marginTop:10}}>{error}</div>}
            {audioUrl && (
              <div className="card" style={{marginTop:14}}>
                <h3>Result</h3>
                <audio controls src={audioUrl}></audio>
                <div style={{marginTop:8, display:"flex", gap:8}}>
                  <a className="btn" href={audioUrl} download="tts.mp3">Download MP3</a>
                  <button className="btn ghost" onClick={async()=>{ await navigator.clipboard.writeText(audioUrl); }}>Copy link</button>
                </div>
                <div className="subtle" style={{marginTop:6}}>Pre-signed links expire automatically.</div>
              </div>
            )}
          </div>

          {/* right card */}
          <div className="card">
            <h3>About this demo</h3>
            <p className="subtle">
              Hosted with AWS Amplify. Calls your HTTP API (API Gateway → Lambda → Polly → S3 with pre-signed URLs).
            </p>
            <ul className="subtle" style={{marginTop:6, paddingLeft:18, listStyle:"disc"}}>
              <li>Pick a language to filter voices (French/Spanish/etc.).</li>
              <li>“Neural” engine shows when the selected voice supports it.</li>
              <li>Use shorter text for faster synth and lower cost.</li>
            </ul>
          </div>
        </div>
      )}

      {tab==="history" && (
        <div className="card">
          <h3>Recent clips</h3>
          {history.length===0
            ? <p className="subtle">No clips yet — generate one!</p>
            : <ul style={{marginTop:8}}>
                {history.map((h,i)=>(
                  <li key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"}}>
                    <div className="subtle">
                      <strong>{h.voice}</strong> · {h.lang} {h.engine?`· ${h.engine}`:""} · {new Date(h.ts).toLocaleTimeString()}
                    </div>
                    <a className="btn ghost" href={h.url} target="_blank" rel="noreferrer">Open</a>
                  </li>
                ))}
              </ul>}
        </div>
      )}

      {tab==="about" && (
        <div className="card">
          <h3>About</h3>
          <p className="subtle">
            Juliet A Adjei — DevOps Engineer. Capstone: Serverless Text-to-Speech with Polly, S3, Lambda, API Gateway.
            Hosted on Amplify, Infrastructure via Terraform.
          </p>
        </div>
      )}

      <footer>© {new Date().getFullYear()} Juliet A Adjei. All rights reserved.</footer>
    </div>
  );
}
