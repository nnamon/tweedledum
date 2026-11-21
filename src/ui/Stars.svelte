<script lang="ts">
  import Icon from './Icon.svelte';
  let { n, of = 5, label = 'Stars', size = 16 }: { n: number; of?: number; label?: string; size?: number } = $props();
</script>

<span class="stars" role="img" aria-label={`${label}: ${n} of ${of} stars`}>
  {#each Array.from({ length: of }, (_, i) => i) as i (i)}
    <span class:on={i < n}><Icon name="star" {size} filled={i < n} /></span>
  {/each}
</span>

<style>
  .stars {
    display: inline-flex;
    gap: var(--tw-space-half);
    color: var(--tw-fill);
  }

  .on {
    color: var(--tw-star);
  }
</style>
