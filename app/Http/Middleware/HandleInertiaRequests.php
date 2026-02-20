<?php

namespace App\Http\Middleware;

use App\Models\Category;
use App\Models\Subscription;
use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'subscriptions' => fn () => $request->user()
                ? Subscription::where('user_id', $request->user()->id)
                    ->orderBy('order')
                    ->get()
                : [],
            'categories' => fn () => $request->user()
                ? Category::where('user_id', $request->user()->id)
                    ->with('children')
                    ->whereNull('parent_id')
                    ->orderBy('order')
                    ->get()
                : [],
            'tags' => fn () => $request->user()
                ? Tag::where('user_id', $request->user()->id)
                    ->withCount('articles')
                    ->get()
                : [],
        ];
    }
}
