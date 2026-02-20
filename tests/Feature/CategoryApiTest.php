<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Category;
use App\Models\Subscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_list_categories_as_tree(): void
    {
        $parentCategory = Category::factory()->create([
            'user_id' => $this->user->id,
            'label' => 'Parent Category',
            'parent_id' => null,
        ]);

        Category::factory()->create([
            'user_id' => $this->user->id,
            'label' => 'Child Category',
            'parent_id' => $parentCategory->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'label',
                    'parent_id',
                    'children',
                ],
            ]);
    }

    public function test_can_create_category(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/categories', [
                'label' => 'New Category',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'label' => 'New Category',
            ]);

        $this->assertDatabaseHas('categories', [
            'label' => 'New Category',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_can_create_nested_category(): void
    {
        $parentCategory = Category::factory()->create([
            'user_id' => $this->user->id,
            'label' => 'Parent',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/categories', [
                'label' => 'Child',
                'parent_id' => $parentCategory->id,
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('categories', [
            'label' => 'Child',
            'parent_id' => $parentCategory->id,
        ]);
    }

    public function test_can_update_category(): void
    {
        $category = Category::factory()->create([
            'user_id' => $this->user->id,
            'label' => 'Old Name',
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/categories/{$category->id}", [
                'label' => 'New Name',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'label' => 'New Name',
            ]);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'label' => 'New Name',
        ]);
    }

    public function test_can_delete_category(): void
    {
        $category = Category::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/categories/{$category->id}");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('categories', [
            'id' => $category->id,
        ]);
    }

    public function test_can_move_subscription_to_category(): void
    {
        $subscription = Subscription::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $category = Category::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/subscriptions/{$subscription->id}/move", [
                'category_id' => $category->id,
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'category_id' => $category->id,
        ]);
    }

    public function test_can_move_subscription_to_root(): void
    {
        $category = Category::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $subscription = Subscription::factory()->create([
            'user_id' => $this->user->id,
            'category_id' => $category->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/subscriptions/{$subscription->id}/move", [
                'category_id' => null,
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'category_id' => null,
        ]);
    }

    public function test_cannot_access_other_users_categories(): void
    {
        $otherUser = User::factory()->create();
        $category = Category::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/categories/{$category->id}", [
                'label' => 'Hacked',
            ]);

        $response->assertStatus(403);
    }
}
