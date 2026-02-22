<?php

namespace App\Services;

use App\Models\Subscription;

class RefreshResult
{
    private bool $success = false;
    private int $newArticlesCount = 0;
    private int $updatedArticlesCount = 0;
    private array $errors = [];
    private Subscription $subscription;

    public function __construct(Subscription $subscription)
    {
        $this->subscription = $subscription;
    }

    public function setSuccess(int $newCount, int $updatedCount): void
    {
        $this->success = true;
        $this->newArticlesCount = $newCount;
        $this->updatedArticlesCount = $updatedCount;
    }

    public function addError(string $error): void
    {
        $this->success = false;
        $this->errors[] = $error;
    }

    public function isSuccess(): bool
    {
        return $this->success;
    }

    public function getNewArticlesCount(): int
    {
        return $this->newArticlesCount;
    }

    public function getUpdatedArticlesCount(): int
    {
        return $this->updatedArticlesCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function getFirstError(): ?string
    {
        return $this->errors[0] ?? null;
    }

    public function getSubscription(): Subscription
    {
        return $this->subscription;
    }

    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'new_articles' => $this->newArticlesCount,
            'updated_articles' => $this->updatedArticlesCount,
            'errors' => $this->errors,
            'subscription_id' => $this->subscription->id,
            'subscription_title' => $this->subscription->title,
        ];
    }
}