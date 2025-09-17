<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Laravel Reverb + React Chat</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background: #f9f9f9;
      color: #333;
    }
    header {
      background: #2c3e50;
      color: white;
      text-align: center;
      padding: 30px 20px;
    }
    header h1 {
      margin: 0;
      font-size: 2em;
    }
    header p {
      margin-top: 10px;
      font-size: 1.2em;
    }
    main {
      max-width: 900px;
      margin: 30px auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    h2 {
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
      margin-top: 40px;
    }
    pre {
      background: #272822;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-family: monospace;
    }
    ul {
      margin: 15px 0;
      padding-left: 20px;
    }
    .badge {
      display: inline-block;
      margin: 5px 3px;
    }
    .note {
      background: #f1f8ff;
      border-left: 4px solid #0366d6;
      padding: 10px 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>

<header>
  <h1>🚀 Real-time Chat with Laravel Reverb + React</h1>
  <p>Private Channels • Real-time Events • React Frontend • Sanctum Auth</p>
</header>

<main>
  <section>
    <h2>📌 Features</h2>
    <ul>
      <li>🔒 Private channels per user (<code>chat.{receiverId}</code>)</li>
      <li>📡 Real-time broadcasting with <b>Laravel Reverb</b></li>
      <li>🔑 Authentication with <b>Laravel Sanctum</b></li>
      <li>⚛️ React frontend with <b>Laravel Echo</b></li>
    </ul>
  </section>

  <section>
    <h2>🔹 1. Install & Configure Reverb</h2>
    <pre><code>composer require laravel/reverb
php artisan vendor:publish --tag=reverb-config
php artisan reverb:start</code></pre>
  </section>

  <section>
    <h2>🔹 2. Laravel Backend Setup</h2>

    <h3>Channel Authorization (<code>routes/channels.php</code>)</h3>
    <pre><code>&lt;?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{receiverId}', function ($user, $receiverId) {
    return (int) $user-&gt;id === (int) $receiverId;
});</code></pre>

    <h3>API Routes (<code>routes/api.php</code>)</h3>
    <pre><code>&lt;?php

use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\MessageController;

Route::get('/user', function (Request $request) {
    return $request-&gt;user();
})-&gt;middleware('auth:sanctum');

Broadcast::routes(['middleware' =&gt; ['auth:sanctum']]);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')-&gt;group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

Route::middleware('auth:sanctum')-&gt;group(function () {
    Route::post('/message/send', [MessageController::class, 'sendmsg']);
    Route::get('/messages/{user}', [MessageController::class, 'getMessages']);
});</code></pre>

    <h3>Event: MessageSent (<code>app/Events/MessageSent.php</code>)</h3>
    <pre><code>&lt;?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\InteractsWithSockets;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message)
    {
        $this-&gt;message = $message;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('chat.' . $this-&gt;message-&gt;receiver_id);
    }

    public function broadcastWith()
    {
        return [
            'id' =&gt; $this-&gt;message-&gt;id,
            'sender_id' =&gt; $this-&gt;message-&gt;sender_id,
            'receiver_id' =&gt; $this-&gt;message-&gt;receiver_id,
            'message' =&gt; $this-&gt;message-&gt;message,
            'created_at' =&gt; $this-&gt;message-&gt;created_at,
        ];
    }
}</code></pre>

    <h3>Message Controller</h3>
    <pre><code>public function sendmsg(Request $request)
{
    $request-&gt;validate([
        'receiver_id' =&gt; 'required|exists:users,id',
        'message' =&gt; 'required|string',
    ]);

    $message = Message::create([
        'sender_id' =&gt; Auth::id(),
        'receiver_id' =&gt; $request-&gt;receiver_id,
        'message' =&gt; $request-&gt;message,
    ]);

    broadcast(new MessageSent($message))-&gt;toOthers();

    return response()-&gt;json($message);
}</code></pre>

    <h3>CORS Config (<code>config/cors.php</code>)</h3>
    <pre><code>return [
    'paths' =&gt; ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],
    'allowed_methods' =&gt; ['*'],
    'allowed_origins' =&gt; [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    'allowed_headers' =&gt; ['*'],
    'supports_credentials' =&gt; true,
];</code></pre>

    <h3>Sanctum Config (<code>config/sanctum.php</code>)</h3>
    <pre><code>'stateful' =&gt; explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,localhost:5173',
    Sanctum::currentApplicationUrlWithPort(),
))),</code></pre>
  </section>

  <section>
    <h2>🔹 3. React Frontend Setup</h2>

    <h3>Install Dependencies</h3>
    <pre><code>npm install laravel-echo pusher-js axios</code></pre>

    <h3>Echo Setup (<code>echo.js</code>)</h3>
    <pre><code>import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axios from "axios";

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: "pusher",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: false,
    enabledTransports: ["ws", "wss"],
    authorizer: (channel, options) =&gt; {
        return {
            authorize: (socketId, callback) =&gt; {
                axios.post(
                    "http://127.0.0.1:8000/api/broadcasting/auth",
                    {
                        socket_id: socketId,
                        channel_name: channel.name,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                )
                .then(response =&gt; {
                    callback(false, response.data);
                })
                .catch(error =&gt; {
                    callback(true, error);
                });
            },
        };
    },
});

export default echo;</code></pre>

    <h3>Listening for Messages (<code>useEffect</code>)</h3>
    <pre><code>useEffect(() =&gt; {
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
    echoInstance.private(channelName).listen("MessageSent", (e) =&gt; {
        console.log("New message received:", e);
        setMessages((prev) =&gt; [...prev, e]);
    });

    echoInstance.connector.pusher.connection.bind("connected", () =&gt;
        console.log("✅ Connected to Reverb")
    );
    echoInstance.connector.pusher.connection.bind("error", (err) =&gt;
        console.error("❌ Reverb error:", err)
    );

    setEcho(echoInstance);

    return () =&gt; {
        echoInstance.leave(channelName);
        echoInstance.disconnect();
    };
}, []);</code></pre>
  </section>

  <section class="note">
    <h2>✅ Final Notes</h2>
    <p>Start Reverb server:</p>
    <pre><code>php artisan reverb:start</code></pre>

    <p>Ensure React <code>.env</code> has:</p>
    <pre><code>VITE_REVERB_APP_KEY=your-key
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080</code></pre>

    <p>APIs are protected with <code>auth:sanctum</code>.</p>
  </section>
</main>

</body>
</html>
