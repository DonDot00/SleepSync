import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";
import { INITIAL_MESSAGES } from "../constants";

export default function AIChat({ energy, bedtime, waketime, onEventCreated }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const endRef = useRef();

  // auto-scroll to latest message
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setMessages(p => [...p, { from:"user", text:txt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await sendChatMessage(txt, waketime, bedtime, energy);
      setMessages(p => [...p, { from:"ai", text:res.message }]);
      if (res.warning) {
        setMessages(p => [...p, { from:"ai", text:`⚠️ ${res.warning}` }]);
      }
      // created_task_ids is an array — refresh if any tasks were created
      if (res.action === "add_task" && res.created_task_ids?.length > 0) {
        onEventCreated?.();
      }
    } catch {
      setMessages(p => [...p, { from:"ai", text:"I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.from}`}>{m.text}</div>
        ))}
        {loading && <div className="msg msg-ai" style={{ opacity:0.5 }}>Thinking...</div>}
        <div ref={endRef}/>
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Ask SleepSync..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button className="send-btn" onClick={send}>↑</button>
      </div>
    </div>
  );
}