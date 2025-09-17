# Laravel + Reverb + React Chat App

This project demonstrates a **real-time chat application** using **Laravel Reverb** for the backend and **React** for the frontend.

---

## ⚡ Backend Setup (Laravel)

### 1. Install Laravel Reverb
```bash
composer require laravel/reverb
php artisan vendor:publish --tag=reverb-config
php artisan reverb:start
```
2. Channels Configuration
routes/channels.php

php
```bash
<?php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{receiverId}', function ($user, $receiverId) {
    return (int) $user->id === (int) $receiverId;
});
````
3. API Routes
routes/api.php

php
```bash
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
});
```
4. Event for Broadcasting
app/Events/MessageSent.php

php
```bash
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
}
```
5. Send Message Controller
php
```bash
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
}
```
6. CORS Configuration
config/cors.php

php
```bash
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
```
7. Sanctum Configuration
config/sanctum.php

php
```bash
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,localhost:5173',
    Sanctum::currentApplicationUrlWithPort(),
))),
```
⚛️ Frontend Setup (React)
1. Install Dependencies
bash
```bash
npm install axios laravel-echo pusher-js
```
2. Echo Configuration

. Listen for Messages in React
javascript
```bash
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
```
🏃 Running the App
Laravel Backend
```bash
php artisan serve
php artisan reverb:start
```
React Frontend
bash
```bash
npm run dev
```
✅ Summary
Laravel Reverb provides real-time broadcasting.

Messages are stored in the database and broadcast to the receiver.

React connects via Laravel Echo + Pusher client.

Users receive instant updates when a message is sent.


