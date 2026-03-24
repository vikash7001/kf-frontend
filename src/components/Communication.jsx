import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Communication() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);

  const [newMsg, setNewMsg] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  // new topic fields
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [linkType, setLinkType] = useState("PRODUCT");
  const [linkId, setLinkId] = useState("");
  const [location, setLocation] = useState("Jaipur");

  // ---------------- LOAD TOPICS ----------------
  const loadTopics = async () => {
    const res = await api.get("/topics");
    setTopics(res.data || []);
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // ---------------- LOAD MESSAGES ----------------
  const loadMessages = async (topic) => {
    setSelected(topic);
    const res = await api.get(`/messages/${topic.topic_id}`);
    setMessages(res.data || []);
  };

  // ---------------- CREATE TOPIC ----------------
  const createTopic = async () => {
    await api.post("/topics", {
      title,
      description: desc,
      link_type: linkType,
      link_id: linkId,
      location,
      username: user.username
    });

    setShowPopup(false);
    setTitle(""); setDesc(""); setLinkId("");

    loadTopics();
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    if (!newMsg.trim()) return;

    await api.post("/messages", {
      topic_id: selected.topic_id,
      message: newMsg,
      username: user.username,
      mentions: extractMentions(newMsg)
    });

    setNewMsg("");
    loadMessages(selected);
    loadTopics();
  };

  // ---------------- MENTION PARSER ----------------
  const extractMentions = (text) => {
    const matches = text.match(/@(\w+)/g) || [];
    return matches.map(m => m.replace("@", ""));
  };

  // ---------------- DATE HIGHLIGHT ----------------
  const highlightDates = (text) => {
    const regex = /\b\d{2}\/\d{2}\/\d{4}\b/g;
    return text.replace(regex, (d) => `📅 ${d}`);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT PANEL */}
      <div style={{ width: 300, borderRight: "1px solid #ccc" }}>
        <div style={{ padding: 10 }}>
          <button onClick={() => setShowPopup(true)}>+ New Topic</button>
        </div>

        {topics.map(t => (
          <div
            key={t.topic_id}
            onClick={() => loadMessages(t)}
            style={{
              padding: 10,
              cursor: "pointer",
              background: selected?.topic_id === t.topic_id ? "#eee" : "#fff"
            }}
          >
            <b>{t.title}</b>
            <div style={{ fontSize: 12 }}>{t.last_message}</div>
          </div>
        ))}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* CHAT */}
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {messages.map(m => (
            <div
              key={m.message_id}
              style={{
                marginBottom: 10,
                textAlign: m.created_by === user.username ? "right" : "left"
              }}
            >
              <div style={{
                display: "inline-block",
                padding: 8,
                background: "#f0f0f0",
                borderRadius: 8
              }}>
                <div style={{ fontSize: 11, color: "#555" }}>
                  {m.created_by}
                </div>

                <div dangerouslySetInnerHTML={{
                  __html: highlightDates(m.message || "")
                }} />

                {m.image_url && (
                  <img src={m.image_url} width="150" alt="" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* INPUT */}
        {selected && (
          <div style={{ padding: 10, borderTop: "1px solid #ccc" }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Type message..."
              style={{ width: "80%" }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>

      {/* POPUP */}
      {showPopup && (
        <div style={{
          position: "fixed",
          top: "30%",
          left: "40%",
          background: "#fff",
          padding: 20,
          border: "1px solid #ccc"
        }}>
          <h3>Create Topic</h3>

          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} /><br/>
          <input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} /><br/>

          <input placeholder="Link Type" value={linkType} onChange={e => setLinkType(e.target.value)} /><br/>
          <input placeholder="Link ID" value={linkId} onChange={e => setLinkId(e.target.value)} /><br/>

          <select value={location} onChange={e => setLocation(e.target.value)}>
            <option>Jaipur</option>
            <option>Kolkata</option>
            <option>Ahmedabad</option>
          </select>

          <br/><br/>

          <button onClick={createTopic}>Create</button>
          <button onClick={() => setShowPopup(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}