// components/MessagePage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const MessagePage = ({ setIsAuthenticated }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const [echo, setEcho] = useState(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    // Initialize Echo and subscribe to private channel
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        setUser(userData);
        const token = localStorage.getItem("authToken");

        const echoInstance = new Echo({
            broadcaster: "reverb",
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
            wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT || 443,
            forceTLS: false,
            enabledTransports: ["ws", "wss"],
            auth: {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            },
            authEndpoint: "http://127.0.0.1:8000/api/broadcasting/auth",
        });

        const channelName = `chat.${userData.id}`;
        echoInstance.private(channelName).listen("MessageSent", (e) => {
            console.log("New message received:", e);
            setMessages((prev) => [...prev, e]);
        });

        echoInstance.connector.pusher.connection.bind("connected", () =>
            console.log("✅ Connected to Reverb")
        );
        echoInstance.connector.pusher.connection.bind("error", (err) =>
            console.error("❌ Reverb error:", err)
        );

        setEcho(echoInstance);

        return () => {
            echoInstance.leave(channelName);
            echoInstance.disconnect();
        };
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;

        setSending(true);
        try {
            const token = localStorage.getItem("authToken");
            const user = localStorage.getItem("user");
            const storedUser = localStorage.getItem("user");
            if (!storedUser) return;

            const userData = JSON.parse(storedUser);

            console.log(userData.id);

            const receiverId = userData.id == 1 ? '2' : '1';

            await fetch(`http://127.0.0.1:8000/api/message/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    receiver_id: receiverId,
                    message: newMessage,
                }),
            });
            setNewMessage("");
        } catch (err) {
            console.error("Send message failed", err);
        } finally {
            setSending(false);
        }
    };

    const handleLogout = () => {
        if (echo) echo.disconnect();
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        navigate("/login");
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="whatsapp-container">
            {/* Sidebar */}
            <div className="chat-list-sidebar">
                <div className="sidebar-header">
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
                        <h6 style={{ color: "#fff", marginLeft: "10px", fontSize: "18px" }}>
                            {user?.name || ""}
                        </h6>
                    </div>
                    <button className="icon-button" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="chat-main-area">
                <div className="messages-container">
                    {messages.length === 0 ? (
                        <p>No messages yet. Start chatting!</p>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`message-bubble ${msg.sender_id === user.id ? "sent" : "received"}`}
                            >
                                <div className="message-text" style={{color:'white'}}>{msg.message}</div>
                                <div className="message-time">{formatTime(msg.created_at)}</div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="message-input-container">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message"
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        disabled={sending}
                    />
                    <button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                        {sending ? "⏳" : "➤"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessagePage;
