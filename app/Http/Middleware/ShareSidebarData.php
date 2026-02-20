<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use App\Models\Tag;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ShareSidebarData
{
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $subscriptions = Subscription::where('user_id', Auth::id())
                ->orderBy('title')
                ->get();

            $tags = Tag::where('user_id', Auth::id())
                ->withCount('articles')
                ->orderBy('name')
                ->get();

            Inertia::share([
                'subscriptions' => $subscriptions,
                'tags' => $tags,
            ]);
        }

        return $next($request);
    }
}