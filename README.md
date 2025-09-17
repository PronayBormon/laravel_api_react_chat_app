
Real-time Chat Setup with Laravel Reverb + React
This guide documents the full setup for integrating Laravel Reverb with React to build a real-time private chat system.
1. Install & Configure Reverb
Install Reverb in Laravel:
 composer require laravel/reverb
Publish & configure Reverb:
 php artisan vendor:publish --tag=reverb-config
Run the Reverb server:
 php artisan reverb:start




2. Laravel Backend Setup
Channel Authorization (routes/channels.php):
<?php

 use Illuminate\Support\Facades\Broadcast;

 Broadcast::channel('chat.{receiverId}', function ($user, $receiverId) {
 	return (int) $user->id === (int) $receiverId;
 });
API Routes (routes/api.php):
<?php

 use App\Events\MessageSent;
 use Illuminate\Http\Request;
 use Illuminate\Support\Facades\Route;
 use App\Http\Controllers\AuthController;
 use Illuminate\Support\Facades\Broadcast;
 use App\Http\Controllers\MessageController;

 Route::get('/user', function (Request $request) {
 	return $request->user();
 })->middleware('auth:sanctum');

 Broadcast::routes(['middleware' => ['auth:sanctum']]);

 Route::post('/auth/login', [AuthController::class, 'login']);

 Route::middleware('auth:sanctum')->group(function () {
 	Route::get('/auth/me', [AuthController::class, 'me']);
 	Route::post('/auth/logout', [AuthController::class, 'logout']);
 });

 Route::middleware('auth:sanctum')->group(function () {
 	Route::post('/message/send', [MessageController::class, 'sendmsg']);
 	Route::get('/messages/{user}', [MessageController::class, 'getMessages']);
 });
Event: MessageSent
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
Message Controller
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


CORS Config (config/cors.php)
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
Sanctum Config (config/sanctum.php)
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
 	'%s%s',
     'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1,localhost:5173',
     Sanctum::currentApplicationUrlWithPort(),
 ))),


================= React ================
----------------------------------------


3. React Frontend Setup
Install Dependencies:
  npm install laravel-echo pusher-js axios

Listening for Messages (React useEffect) with Echo
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
