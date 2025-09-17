# Laravel + Reverb + React Chat App

This project demonstrates a **real-time chat application** using **Laravel Reverb** for the backend and **React** for the frontend.

---

## ⚡ Backend Setup (Laravel)

### 1. Install Laravel Reverb
```bash
composer require laravel/reverb
php artisan vendor:publish --tag=reverb-config
php artisan reverb:start
2. Channels Configuration
routes/channels.php

php
<code>
<?php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{receiverId}', function ($user, $receiverId) {
    return (int) $user->id === (int) $receiverId;
});</code>
3. API Routes
routes/api.php

php
<code>
<?php
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MessageController;
use Illuminate\Support\Facades\Broadcast;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/message/send', [MessageController::class, 'sendmsg']);
    Route::get('/messages/{user}', [MessageController::class, 'getMessages']);
});</code>
4. Event for Broadcasting
app/Events/MessageSent.php

php
<code>
<?php
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
        $this->message = $message;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('chat.' . $this->message->receiver_id);
    }

    public function broadcastWith()
    {
        return [
            'id' => $this->message->id,
            'sender_id' => $this->message->sender_id,
            'receiver_id' => $this->message->receiver_id,
            'message' => $this->message->message,
            'created_at' => $this->message->created_at,
        ];
    }
}</code>
5. Send Message Controller
php
<code>
public function sendmsg(Request $request)
{
    $request->validate([
        'receiver_id' => 'required|exists:users,id',
        'message' => 'required|string',
    ]);

    $message = Message::create([
        'sender_id' => Auth::id(),
        'receiver_id' => $request->receiver_id,
        'message' => $request->message,
    ]);

    broadcast(new MessageSent($message))->toOthers();

    return response()->json($message);
}</code>
6. CORS Configuration
config/cors.php

php
Copy code
<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
];
7. Sanctum Configuration
config/sanctum.php

php
Copy code
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,localhost:5173',
    Sanctum::currentApplicationUrlWithPort(),
))),
⚛️ Frontend Setup (React)
1. Install Dependencies
bash
Copy code
npm install axios laravel-echo pusher-js
2. Echo Configuration
src/lib/echo.js

javascript
Copy code
import Echo from "laravel-echo";
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
  authorizer: (channel, options) => {
    return {
      authorize: (socketId, callback) => {
        axios
          .post(
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
          .then((response) => callback(false, response.data))
          .catch((error) => callback(true, error));
      },
    };
  },
});

export default echo;
3. Listen for Messages in React
javascript
Copy code
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
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    },
    authEndpoint: "http://127.0.0.1:8000/api/broadcasting/auth",
  });

  const channelName = `chat.${userData.id}`;
  echoInstance.private(channelName).listen("MessageSent", (e) => {
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
🏃 Running the App
Laravel Backend
bash
php artisan serve
php artisan reverb:start
React Frontend
bash
Copy code
npm run dev
✅ Summary
Laravel Reverb provides real-time broadcasting.

Messages are stored in the database and broadcast to the receiver.

React connects via Laravel Echo + Pusher client.

Users receive instant updates when a message is sent.

yaml
Copy code

---

If you want, I can also make a **version with collapsible code sections and screenshots placeholders** so it looks even more polished on GitHub.  

Do you want me to do that?
