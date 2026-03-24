import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";

export default function Communication({ user }) {

  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);

  const [newMsg, setNewMsg] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [linkType, setLinkType] = useState("PRODUCT");
  const [linkId, setLinkId] = useState("");
  const [location, setLocation] = useState("Jaipur");

  const [users, setUsers] = useState([]);
  const [mentionList, setMentionList] = useState([]);

  const [reminders, setReminders] = useState([]);

  const chatEndRef = useRef(null);

  // ---------------- LOAD DATA ----------------
  const loadTopics = async () => {
    const res = await api.get("/topics");
    setTopics(res.data || []);
  };

  const loadMessages = async (topic) => {
    setSelected(topic);
    const res = await api.get(`/messages/${topic.topic_id}`);
    setMessages(res.data || []);
  };

  const loadReminders = async () => {
    const res = await api.get("/reminders");
    setReminders(res.data || []);
  };

  const loadUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data || []);
  };

  useEffect(() => {
    loadTopics();
    loadReminders();
    loadUsers();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const sendMessage = async (imageUrl = null) => {
    if (!newMsg.trim() && !imageUrl) return;

    await api.post("/messages", {
      topic_id: selected.topic_id,
      message: newMsg,
      image_url: imageUrl,
      username: user.username,
      mentions: extractMentions(newMsg)
    });

    setNewMsg("");
    loadMessages(selected);
    loadTopics();
    loadReminders();
  };

  // ---------------- IMAGE UPLOAD ----------------
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("KF DEIGNS")
      .upload(fileName, file, { upsert: true });

    if (error) {
      alert("Upload failed");
      return;
    }

    const { data } = supabase.storage
      .from("KF DEIGNS")
      .getPublicUrl(fileName);

    sendMessage(data.publicUrl);
  };

  // ---------------- MENTIONS ----------------
  const extractMentions = (text) => {
    const matches = text.match(/@(\w+)/g) || [];
    return matches.map(m => m.replace("@", ""));
  };

  const handleMention = (val) => {
    setNewMsg(val);

    const last = val.split(" ").pop();

    if (last.startsWith("@")) {
      const search = last.replace("@", "");
      const filtered = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase())
      );
      setMentionList(filtered);
    } else {
      setMentionList([]);
    }
  };

  const selectMention = (u) => {
    const words = newMsg.split(" ");
    words.pop();
    setNewMsg([...words, "@" + u.username].join(" ") + " ");
    setMentionList([]);
  };

  // ---------------- DATE HIGHLIGHT ----------------
  const highlightDates = (text) => {
    return text.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, d => `📅 ${d}`);
  };

  // ---------------- GROUP REMINDERS ----------------
  const today = [];
  const tomorrow = [];

  const todayDate = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  reminders.forEach(r => {
    if (r.reminder_date === todayDate) today.push(r);
    if (r.reminder_date === tomorrowDate) tomorrow.push(r);
  });

  return (
    <div style={{ display: "flex", height: "100%" }}>

      {/* LEFT PANEL */}
      <div style={{ width: 280, borderRight: "1px solid #ccc" }}>
        <div style={{ padding: 10 }}>
          <button onClick={() => setShowPopup(true)}>+ New Topic</button>
        </div>

        {/* 🔔 REMINDERS */}
        <div style={{ padding: 10, background: "#fff7ed" }}>
          <b>🔔 Today</b>
          {today.map(r => (
            <div key={r.id}>{r.text}</div>
          ))}

          <b>Tomorrow</b>
          {tomorrow.map(r => (
            <div key={r.id}>{r.text}</div>
          ))}
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

        <div style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
          <b>{selected?.title || "Select Topic"}</b>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {messages.length === 0 && <div>No messages</div>}

          {messages.map(m => (
            <div key={m.message_id} style={{
              textAlign: m.created_by === user.username ? "right" : "left",
              marginBottom: 10
            }}>
              <div style={{
                display: "inline-block",
                padding: 10,
                background: "#f1f1f1",
                borderRadius: 8,
                maxWidth: "60%"
              }}>
                <div style={{ fontSize: 11 }}>{m.created_by}</div>
                <div>{highlightDates(m.message || "")}</div>

                {m.image_url && <img src={m.image_url} width="150" alt="" />}
              </div>
            </div>
          ))}

          <div ref={chatEndRef}></div>
        </div>

        {/* INPUT */}
        {selected && (
          <div style={{ padding: 10, borderTop: "1px solid #ccc", position: "relative" }}>
            <input
              value={newMsg}
              onChange={e => handleMention(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              style={{ width: "60%" }}
            />

            <input type="file" onChange={handleUpload} />

            <button onClick={() => sendMessage()}>Send</button>

            {/* 👥 MENTIONS */}
            {mentionList.length > 0 && (
              <div style={{
                position: "absolute",
                bottom: 50,
                left: 10,
                background: "#fff",
                border: "1px solid #ccc",
                width: 200
              }}>
                {mentionList.map(u => (
                  <div key={u.username} onClick={() => selectMention(u)}>
                    {u.username} ({u.fullname})
                  </div>
                ))}
              </div>
            )}
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
          padding: 20
        }}>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <input placeholder="Link Type" value={linkType} onChange={e => setLinkType(e.target.value)} />
          <input placeholder="Link ID" value={linkId} onChange={e => setLinkId(e.target.value)} />

          <select value={location} onChange={e => setLocation(e.target.value)}>
            <option>Jaipur</option>
            <option>Kolkata</option>
            <option>Ahmedabad</option>
          </select>

          <button onClick={createTopic}>Create</button>
          <button onClick={() => setShowPopup(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}